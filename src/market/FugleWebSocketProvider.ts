import {
  normalizeSymbol,
  taipeiDate,
  type MarketProviderCapability,
  type MarketQuote,
  type MarketQuoteProvider,
  type ProviderHealth,
  type ProviderCircuitState,
  type ProviderAvailability,
} from './MarketCore';

type FugleEvent=
  |Readonly<{type:'quote';quote:MarketQuote}>
  |Readonly<{type:'health';health:ProviderHealth}>;

const STREAMING_URL='wss://api.fugle.tw/marketdata/v1.0/stock/streaming';
const TRADE_CHANNEL='trades';
const WATCHDOG_PERIOD_MILLIS=15000;
const PING_AFTER_SILENCE_MILLIS=40000;
const HEARTBEAT_TIMEOUT_MILLIS=75000;
const RECONNECT_BASE_MILLIS=1000;
const RECONNECT_MAX_MILLIS=30000;
const RECONNECT_JITTER_MILLIS=500;
const CAP_STREAM:ReadonlySet<MarketProviderCapability>=new Set(['STREAM']);

function asRecord(value:unknown):Record<string,unknown>|null{
  return value!=null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
function finitePositive(value:unknown):number|undefined{
  const n=Number(value);return Number.isFinite(n)&&n>0?n:undefined;
}
function finiteNonNegative(value:unknown):number|undefined{
  const n=Number(value);return Number.isFinite(n)&&n>=0?n:undefined;
}
function normalizeEpochMillis(raw:unknown,receivedAt:number):number{
  const value=Number(raw);
  if(!Number.isFinite(value)||value<=0)return receivedAt;
  if(value>=100_000_000_000_000)return Math.floor(value/1000);
  if(value>=100_000_000_000)return Math.floor(value);
  if(value>=100_000_000)return Math.floor(value*1000);
  return receivedAt;
}
function dataObjects(value:unknown):Record<string,unknown>[]{
  if(Array.isArray(value))return value.map(asRecord).filter((x):x is Record<string,unknown>=>x!=null);
  const one=asRecord(value);return one?[one]:[];
}

export class FugleWebSocketProvider implements MarketQuoteProvider{
  readonly source='FUGLE' as const;
  readonly capabilities=CAP_STREAM;
  private socket:WebSocket|null=null;
  private authenticated=false;
  private connecting=false;
  private manualDisconnect=true;
  private credentialRejected=false;
  private reconnectAttempt=0;
  private consecutiveFailures=0;
  private hasAuthenticatedBefore=false;
  private recovering=false;
  private lastAttemptEpochMillis:number|null=null;
  private lastSuccessEpochMillis:number|null=null;
  private lastMessageEpochMillis:number|null=null;
  private lastHeartbeatEpochMillis:number|null=null;
  private nextReconnectEpochMillis=0;
  private reconnectTimer:ReturnType<typeof setTimeout>|null=null;
  private watchdogTimer:ReturnType<typeof setInterval>|null=null;
  private readonly desiredSymbols=new Set<string>();
  private readonly activeChannelIds=new Map<string,string>();
  private readonly pendingSubscribeSymbols=new Set<string>();
  private readonly pendingUnsubscribeIds=new Set<string>();
  private readonly latestQuotes=new Map<string,MarketQuote>();
  private readonly listeners=new Set<(event:FugleEvent)=>void>();

  constructor(
    private readonly apiKeyProvider:()=>string|null,
    private readonly clockMillis:()=>number=()=>Date.now(),
  ){
    this.watchdogTimer=setInterval(()=>this.watchdogTick(),WATCHDOG_PERIOD_MILLIS);
  }

  onEvent(listener:(event:FugleEvent)=>void):()=>void{
    this.listeners.add(listener);return()=>this.listeners.delete(listener);
  }
  private emit(event:FugleEvent):void{for(const listener of this.listeners)listener(event);}
  private emitHealth():void{this.emit({type:'health',health:this.health(this.clockMillis())});}

  async fetch(symbols:ReadonlySet<string>):Promise<ReadonlyMap<string,MarketQuote>>{
    const requested=new Set([...symbols].map(normalizeSymbol));
    return new Map([...this.latestQuotes].filter(([symbol])=>requested.has(symbol)));
  }

  async connect():Promise<void>{this.connectNow();}
  async disconnect():Promise<void>{
    this.manualDisconnect=true;this.authenticated=false;this.connecting=false;
    if(this.reconnectTimer){clearTimeout(this.reconnectTimer);this.reconnectTimer=null;}
    this.nextReconnectEpochMillis=0;this.activeChannelIds.clear();this.pendingSubscribeSymbols.clear();this.pendingUnsubscribeIds.clear();
    const socket=this.socket;this.socket=null;
    if(socket&&socket.readyState===WebSocket.OPEN)socket.close(1000,'TF Asset background/disconnect');
    this.emitHealth();
  }
  async replaceSubscriptions(symbols:ReadonlySet<string>):Promise<void>{
    this.desiredSymbols.clear();
    for(const raw of symbols){const symbol=normalizeSymbol(raw);if(symbol)this.desiredSymbols.add(symbol);}
    if(this.desiredSymbols.size)this.connectNow();else await this.disconnect();
    this.syncSubscriptions();
  }
  onCredentialChanged():void{
    this.credentialRejected=false;this.reconnectAttempt=0;this.consecutiveFailures=0;this.authenticated=false;this.connecting=false;
    if(this.reconnectTimer){clearTimeout(this.reconnectTimer);this.reconnectTimer=null;}
    this.nextReconnectEpochMillis=0;this.activeChannelIds.clear();this.pendingSubscribeSymbols.clear();this.pendingUnsubscribeIds.clear();
    const old=this.socket;this.socket=null;this.manualDisconnect=true;
    if(old&&old.readyState===WebSocket.OPEN)old.close(1000,'TF Asset credential changed');
    if(this.apiKeyProvider()?.trim()&&this.desiredSymbols.size)this.connectNow();else this.emitHealth();
  }
  dispose():void{
    if(this.watchdogTimer){clearInterval(this.watchdogTimer);this.watchdogTimer=null;}
    if(this.reconnectTimer){clearTimeout(this.reconnectTimer);this.reconnectTimer=null;}
    const socket=this.socket;this.socket=null;
    if(socket&&socket.readyState===WebSocket.OPEN)socket.close(1000,'TF Asset provider disposed');
  }

  health(now:number):ProviderHealth{
    const hasCredential=!!this.apiKeyProvider()?.trim();
    let circuitState:ProviderCircuitState;
    if(!hasCredential||this.credentialRejected)circuitState='COOLDOWN';
    else if(this.authenticated&&!this.heartbeatIsHealthy(now))circuitState='COOLDOWN';
    else if(this.authenticated&&this.recovering)circuitState='RECOVERING';
    else if(this.authenticated)circuitState='HEALTHY';
    else if(this.consecutiveFailures>=2)circuitState='COOLDOWN';
    else circuitState='DEGRADED';
    const availability:ProviderAvailability=circuitState==='HEALTHY'?'READY':circuitState==='COOLDOWN'?'COOLDOWN':'THROTTLED';
    return {
      source:'FUGLE',availability,consecutiveFailures:this.consecutiveFailures,
      lastAttemptEpochMillis:this.lastAttemptEpochMillis,lastSuccessEpochMillis:this.lastSuccessEpochMillis,
      nextAllowedEpochMillis:this.nextReconnectEpochMillis,circuitState,
    };
  }

  private connectNow():void{
    const apiKey=this.apiKeyProvider()?.trim()??'';
    if(!apiKey){this.emitHealth();return;}
    if(this.credentialRejected||this.socket||this.connecting)return;
    this.manualDisconnect=false;this.connecting=true;this.lastAttemptEpochMillis=this.clockMillis();
    let socket:WebSocket;
    try{socket=new WebSocket(STREAMING_URL);}catch{this.connecting=false;this.consecutiveFailures+=1;this.scheduleReconnect();this.emitHealth();return;}
    this.socket=socket;
    socket.onopen=()=>{
      if(this.socket!==socket)return;
      this.connecting=false;this.lastMessageEpochMillis=this.clockMillis();
      socket.send(JSON.stringify({event:'auth',data:{apikey:apiKey}}));this.emitHealth();
    };
    socket.onmessage=(event:{data?:unknown})=>{
      if(this.socket!==socket||typeof event.data!=='string')return;
      this.handleMessage(event.data);
    };
    socket.onerror=()=>{if(this.socket===socket)this.handleDisconnect(socket,true);};
    socket.onclose=()=>{if(this.socket===socket)this.handleDisconnect(socket,false);};
  }

  private handleMessage(text:string):void{
    let root:Record<string,unknown>;
    try{const parsed=asRecord(JSON.parse(text));if(!parsed)return;root=parsed;}catch{return;}
    const event=String(root.event??'');if(!event)return;
    const now=this.clockMillis();this.lastMessageEpochMillis=now;
    if(event==='authenticated'){
      this.authenticated=true;this.connecting=false;this.credentialRejected=false;
      this.recovering=this.hasAuthenticatedBefore&&(this.consecutiveFailures>0||this.reconnectAttempt>0);
      this.hasAuthenticatedBefore=true;this.reconnectAttempt=0;this.consecutiveFailures=0;
      this.lastSuccessEpochMillis=now;this.lastHeartbeatEpochMillis=now;
      this.syncSubscriptions();this.emitHealth();return;
    }
    if(event==='heartbeat'||event==='pong'){
      this.lastHeartbeatEpochMillis=now;this.lastSuccessEpochMillis=now;this.recovering=false;this.emitHealth();return;
    }
    if(event==='subscribed'){this.handleSubscribed(root.data);return;}
    if(event==='unsubscribed'){this.handleUnsubscribed(root.data);return;}
    if(event==='data'){this.handleMarketData(root);return;}
    if(event==='error')this.handleServerError(root);
  }

  private handleSubscribed(data:unknown):void{
    for(const row of dataObjects(data)){
      const id=String(row.id??'').trim(),symbol=normalizeSymbol(String(row.symbol??'')),channel=String(row.channel??'');
      if(!id||!symbol||channel!==TRADE_CHANNEL)continue;
      this.pendingSubscribeSymbols.delete(symbol);this.activeChannelIds.set(symbol,id);
      if(!this.desiredSymbols.has(symbol))this.sendUnsubscribe([id]);
    }
    this.syncSubscriptions();
  }
  private handleUnsubscribed(data:unknown):void{
    const ids=new Set(dataObjects(data).map(row=>String(row.id??'').trim()).filter(Boolean));
    if(!ids.size)return;
    for(const id of ids)this.pendingUnsubscribeIds.delete(id);
    for(const [symbol,id] of [...this.activeChannelIds])if(ids.has(id))this.activeChannelIds.delete(symbol);
    this.syncSubscriptions();
  }
  private handleMarketData(root:Record<string,unknown>):void{
    if(String(root.channel??'')!==TRADE_CHANNEL)return;
    const data=asRecord(root.data);if(!data||data.isTrial===true)return;
    const symbol=normalizeSymbol(String(data.symbol??'')),price=finitePositive(data.price);if(!symbol||!price)return;
    const now=this.clockMillis(),sourceTime=normalizeEpochMillis(data.time,now);
    const quote:MarketQuote={
      symbol,name:symbol,
      exchange:String(data.exchange??'').trim()||undefined,
      market:String(data.market??'').trim()||undefined,
      price,volume:finiteNonNegative(data.volume),bid:finitePositive(data.bid),ask:finitePositive(data.ask),
      source:'FUGLE',quality:'LIVE',sourceTimestampEpochMillis:sourceTime,receivedAtEpochMillis:now,
      sessionDate:taipeiDate(sourceTime),fallbackLevel:0,sequence:finiteNonNegative(data.serial),
      isTrial:false,isClose:data.isClose===true,
    };
    this.latestQuotes.set(symbol,quote);this.lastSuccessEpochMillis=now;this.consecutiveFailures=0;this.recovering=false;
    this.emit({type:'quote',quote});this.emitHealth();
  }
  private handleServerError(root:Record<string,unknown>):void{
    const data=asRecord(root.data);const message=String(data?.message??'');
    const authFailure=/auth|credential|api key/i.test(message);
    this.consecutiveFailures+=1;if(authFailure){this.credentialRejected=true;this.manualDisconnect=true;}
    this.authenticated=false;this.activeChannelIds.clear();this.pendingSubscribeSymbols.clear();this.pendingUnsubscribeIds.clear();
    const socket=this.socket;this.socket=null;if(socket&&socket.readyState===WebSocket.OPEN)socket.close(1008,'Fugle server error');
    if(!authFailure)this.scheduleReconnect();this.emitHealth();
  }
  private handleDisconnect(socket:WebSocket,error:boolean):void{
    if(this.socket!==socket)return;
    this.socket=null;this.authenticated=false;this.connecting=false;this.activeChannelIds.clear();
    this.pendingSubscribeSymbols.clear();this.pendingUnsubscribeIds.clear();if(error)this.consecutiveFailures+=1;this.recovering=false;
    if(!this.manualDisconnect&&!this.credentialRejected&&this.desiredSymbols.size)this.scheduleReconnect();
    this.emitHealth();
  }
  private syncSubscriptions():void{
    const socket=this.socket;if(!this.authenticated||!socket||socket.readyState!==WebSocket.OPEN)return;
    const add=[...this.desiredSymbols].filter(symbol=>!this.activeChannelIds.has(symbol)&&!this.pendingSubscribeSymbols.has(symbol)).sort();
    const remove=[...this.activeChannelIds.entries()].filter(([symbol])=>!this.desiredSymbols.has(symbol)).map(([,id])=>id).filter(id=>!this.pendingUnsubscribeIds.has(id));
    if(add.length){for(const symbol of add)this.pendingSubscribeSymbols.add(symbol);socket.send(JSON.stringify({event:'subscribe',data:{channel:TRADE_CHANNEL,symbols:add}}));}
    if(remove.length){for(const id of remove)this.pendingUnsubscribeIds.add(id);socket.send(JSON.stringify({event:'unsubscribe',data:{ids:remove}}));}
  }
  private sendUnsubscribe(ids:readonly string[]):void{
    const socket=this.socket;if(!ids.length||!socket||socket.readyState!==WebSocket.OPEN)return;
    for(const id of ids)this.pendingUnsubscribeIds.add(id);
    socket.send(JSON.stringify({event:'unsubscribe',data:{ids}}));
  }
  private scheduleReconnect():void{
    if(this.manualDisconnect||this.credentialRejected||!this.desiredSymbols.size||this.reconnectTimer)return;
    const exponential=Math.min(RECONNECT_MAX_MILLIS,RECONNECT_BASE_MILLIS*(2**Math.min(5,this.reconnectAttempt)));
    const jitter=(this.reconnectAttempt*137)%RECONNECT_JITTER_MILLIS;this.reconnectAttempt+=1;
    const delay=exponential+jitter;this.nextReconnectEpochMillis=this.clockMillis()+delay;
    this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null;this.nextReconnectEpochMillis=0;this.connectNow();},delay);
  }
  private watchdogTick():void{
    if(!this.authenticated||!this.socket||this.manualDisconnect)return;
    const now=this.clockMillis(),last=this.lastMessageEpochMillis??this.lastHeartbeatEpochMillis??now;
    if(now-last>=HEARTBEAT_TIMEOUT_MILLIS){
      const socket=this.socket;this.socket=null;this.authenticated=false;this.connecting=false;this.consecutiveFailures+=1;this.recovering=false;
      this.activeChannelIds.clear();this.pendingSubscribeSymbols.clear();this.pendingUnsubscribeIds.clear();
      if(socket.readyState===WebSocket.OPEN)socket.close(1001,'Fugle heartbeat timeout');
      this.scheduleReconnect();this.emitHealth();return;
    }
    if(now-last>=PING_AFTER_SILENCE_MILLIS&&this.socket.readyState===WebSocket.OPEN){
      this.socket.send(JSON.stringify({event:'ping',data:{state:now}}));
    }
  }
  private heartbeatIsHealthy(now:number):boolean{
    const last=this.lastMessageEpochMillis??this.lastHeartbeatEpochMillis;return last!=null&&now-last<=HEARTBEAT_TIMEOUT_MILLIS;
  }
}
