import {WebSocket} from 'ws';
import {epochLikeToMs,positive,VALID_SYMBOL} from './parser.mjs';

const DEFAULT_URL='wss://api.fugle.tw/marketdata/v1.0/stock/streaming';

export class FugleStream {
  constructor({
    apiKey=process.env.FUGLE_API_KEY??'',
    url=process.env.FUGLE_WS_URL??DEFAULT_URL,
    wsFactory=(target,options)=>new WebSocket(target,options),
    logger=console,
    idleTimeoutMs=75_000,
    maxQuoteAgeMs=30*60_000,
  }={}){
    this.apiKey=String(apiKey).trim();
    this.url=String(url).trim()||DEFAULT_URL;
    this.wsFactory=wsFactory;
    this.logger=logger;
    this.idleTimeoutMs=Math.max(45_000,Number(idleTimeoutMs)||75_000);
    this.maxQuoteAgeMs=Math.max(60_000,Number(maxQuoteAgeMs)||30*60_000);
    this.symbols=new Set();
    this.quotes=new Map();
    this.socket=null;
    this.state=this.apiKey?'DISCONNECTED':'DISABLED';
    this.lastMessageAt=0;
    this.lastConnectedAt=0;
    this.lastAuthenticatedAt=0;
    this.lastDisconnectAt=0;
    this.reconnectAttempt=0;
    this.reconnectTimer=null;
    this.watchdog=null;
    this.stopped=false;
    this.lastError='';
  }

  configured(){return Boolean(this.apiKey);}

  normalizeSymbols(symbols){
    return [...new Set((symbols??[]).map(s=>String(s).trim().toUpperCase()))]
      .filter(s=>VALID_SYMBOL.test(s));
  }

  start(symbols=[]){
    this.setSymbols(symbols);
    if(!this.configured())return false;
    this.stopped=false;
    if(!this.watchdog)this.watchdog=setInterval(()=>this.checkIdle(),15_000);
    this.connect();
    return true;
  }

  stop(){
    this.stopped=true;
    if(this.reconnectTimer){clearTimeout(this.reconnectTimer);this.reconnectTimer=null;}
    if(this.watchdog){clearInterval(this.watchdog);this.watchdog=null;}
    const socket=this.socket;this.socket=null;
    if(socket&&socket.readyState===WebSocket.OPEN)socket.close(1000,'service closing');
    else if(socket&&socket.readyState===WebSocket.CONNECTING)socket.terminate();
    this.state=this.configured()?'DISCONNECTED':'DISABLED';
  }

  setSymbols(symbols=[]){
    const next=new Set(this.normalizeSymbols(symbols));
    let changed=next.size!==this.symbols.size;
    if(!changed)for(const symbol of next)if(!this.symbols.has(symbol)){changed=true;break;}
    this.symbols=next;
    if(changed&&this.state==='AUTHENTICATED')this.subscribe();
    return changed;
  }

  connect(){
    if(this.stopped||!this.configured())return;
    const current=this.socket;
    if(current&&(current.readyState===WebSocket.OPEN||current.readyState===WebSocket.CONNECTING))return;
    this.state='CONNECTING';
    let socket;
    try{
      // Server-side TLS/WSS only. API key never enters the APK.
      socket=this.wsFactory(this.url,{
        handshakeTimeout:7_000,
        perMessageDeflate:false,
        maxPayload:512*1024,
        headers:{'User-Agent':'TF-Asset-MarketCenter/3.2.37'},
      });
    }catch(error){
      this.lastError=String(error?.message??error);
      this.scheduleReconnect();
      return;
    }
    this.socket=socket;
    socket.on('open',()=>{
      if(socket!==this.socket)return;
      this.state='AUTHENTICATING';
      this.lastConnectedAt=Date.now();
      this.lastMessageAt=this.lastConnectedAt;
      socket.send(JSON.stringify({event:'auth',data:{apikey:this.apiKey}}));
    });
    socket.on('message',raw=>{
      if(socket!==this.socket)return;
      this.lastMessageAt=Date.now();
      let message;
      try{message=JSON.parse(String(raw));}catch{return;}
      this.handleMessage(message);
    });
    socket.on('error',error=>{
      this.lastError=String(error?.message??error).slice(0,200);
    });
    socket.on('close',(code,reason)=>{
      if(socket!==this.socket)return;
      this.socket=null;
      this.lastDisconnectAt=Date.now();
      this.state='DISCONNECTED';
      this.lastError=('close '+code+' '+String(reason??'')).trim().slice(0,200);
      this.scheduleReconnect();
    });
  }

  handleMessage(message){
    const event=String(message?.event??'');
    if(event==='authenticated'){
      this.state='AUTHENTICATED';
      this.lastAuthenticatedAt=Date.now();
      this.reconnectAttempt=0;
      this.subscribe();
      return;
    }
    if(event==='heartbeat')return;
    if(event==='error'){
      this.lastError=String(message?.data?.message??'Fugle WebSocket error').slice(0,200);
      return;
    }
    if(event!=='data'||message?.channel!=='trades')return;
    const row=message?.data;
    if(!row||row.isTrial===true)return;
    const symbol=String(row.symbol??'').trim().toUpperCase();
    const price=positive(row.price);
    const sourceQuoteAt=epochLikeToMs(row.time,Date.now());
    if(!VALID_SYMBOL.test(symbol)||price===null||sourceQuoteAt===null)return;
    const exchange=String(row.market??row.exchange??'').toUpperCase();
    const quote={
      symbol,name:symbol,currentPrice:price,previousClose:null,
      officialTradePrice:null,sourceQuoteAt,quality:'trade',source:'FUGLE',
      priceType:'REALTIME_TRADE',isFallback:false,
      market:exchange.includes('OTC')||exchange.includes('TPEX')?'OTC':
        exchange.includes('TSE')||exchange.includes('TWSE')?'TSE':'UNKNOWN',
      statusMessage:'Fugle WebSocket 即時成交',
      checkedAt:Date.now(),
      volume:positive(row.volume)??0,
    };
    const old=this.quotes.get(symbol);
    if(!old||quote.sourceQuoteAt>=old.sourceQuoteAt)this.quotes.set(symbol,quote);
  }

  subscribe(){
    const socket=this.socket;
    if(!socket||socket.readyState!==WebSocket.OPEN||this.state!=='AUTHENTICATED')return;
    const symbols=[...this.symbols];
    if(!symbols.length)return;
    // Fugle supports multi-symbol subscriptions on the same channel.
    socket.send(JSON.stringify({event:'subscribe',data:{channel:'trades',symbols}}));
  }

  latest(symbolInput,now=Date.now()){
    const symbol=String(symbolInput).trim().toUpperCase();
    const quote=this.quotes.get(symbol);
    if(!quote)return null;
    if(now-quote.sourceQuoteAt>this.maxQuoteAgeMs)return null;
    return {...quote,checkedAt:now};
  }

  checkIdle(now=Date.now()){
    if(this.stopped||!this.configured())return;
    if(this.socket?.readyState===WebSocket.OPEN&&this.lastMessageAt>0
      &&now-this.lastMessageAt>this.idleTimeoutMs){
      this.lastError='heartbeat timeout';
      this.socket.terminate();
      return;
    }
    if(!this.socket||this.socket.readyState===WebSocket.CLOSED)this.connect();
  }

  scheduleReconnect(){
    if(this.stopped||!this.configured()||this.reconnectTimer)return;
    const delay=Math.min(60_000,1_000*2**Math.min(this.reconnectAttempt,6));
    this.reconnectAttempt++;
    this.reconnectTimer=setTimeout(()=>{
      this.reconnectTimer=null;
      this.connect();
    },delay);
  }

  health(now=Date.now()){
    return {
      configured:this.configured(),
      state:this.state,
      subscribedSymbols:this.symbols.size,
      cachedQuotes:this.quotes.size,
      lastMessageAt:this.lastMessageAt||null,
      lastConnectedAt:this.lastConnectedAt||null,
      lastAuthenticatedAt:this.lastAuthenticatedAt||null,
      lastDisconnectAt:this.lastDisconnectAt||null,
      heartbeatAgeMs:this.lastMessageAt?Math.max(0,now-this.lastMessageAt):null,
      reconnectAttempt:this.reconnectAttempt,
      lastError:this.lastError||null,
      endpoint:'FUGLE_WSS',
    };
  }
}
