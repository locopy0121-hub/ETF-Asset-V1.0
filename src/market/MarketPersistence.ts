import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearNativeMarketCache,loadNativeMarketCache,loadNativeMarketSnapshots,nativeRuntimeAvailable,persistNativeMarketCache,
} from '../native/TfAssetNativeBridge';
import type {MarketDataCenter,MarketQuote} from './MarketCore';

export type MarketMinuteCandle=Readonly<{
  symbol:string;
  sessionDate:string;
  bucketEpochMillis:number;
  open:number;
  high:number;
  low:number;
  close:number;
  volume:number;
  source:string;
  updatedAtEpochMillis:number;
}>;

type PersistedMarketCache=Readonly<{
  schema:4;
  snapshots:readonly MarketQuote[];
  candles:readonly MarketMinuteCandle[];
  persistedAtEpochMillis:number;
}>;

const STORAGE_KEY='@tf-asset/v4-market-persistence-fallback';
const MINUTE_MILLIS=60000;
const MAX_CANDLE_ROWS=12000;

export class MarketPersistenceRepository{
  private state:PersistedMarketCache|null|undefined;

  async loadSnapshots():Promise<MarketQuote[]>{
    if(nativeRuntimeAvailable){
      try{
        const raw=await loadNativeMarketSnapshots();if(!raw)return [];
        const parsed=JSON.parse(raw) as {snapshots?:MarketQuote[]};
        return Array.isArray(parsed.snapshots)?parsed.snapshots:[];
      }catch{return [];}
    }
    const state=await this.load();return state?.snapshots?[...state.snapshots]:[];
  }
  async loadCandles(symbol:string,sessionDate:string):Promise<MarketMinuteCandle[]>{
    const state=await this.load();if(!state)return [];
    return state.candles.filter(row=>row.symbol===symbol&&row.sessionDate===sessionDate).sort((a,b)=>a.bucketEpochMillis-b.bucketEpochMillis);
  }
  async persist(quotes:readonly MarketQuote[],persistedAtEpochMillis=Date.now()):Promise<void>{
    if(!quotes.length)return;
    if(nativeRuntimeAvailable){
      const delta:PersistedMarketCache={schema:4,snapshots:[...quotes],candles:[],persistedAtEpochMillis};
      const ok=await persistNativeMarketCache(JSON.stringify(delta));
      if(!ok)throw new Error('Android SQLite market persistence failed');
      return;
    }
    const previous=await this.load();
    const snapshots=new Map<string,MarketQuote>((previous?.snapshots??[]).map(row=>[row.symbol,row] as const));
    const candles=new Map<string,MarketMinuteCandle>((previous?.candles??[]).map(row=>[`${row.symbol}|${row.bucketEpochMillis}`,row] as const));
    for(const quote of quotes){
      snapshots.set(quote.symbol,quote);
      if(!(quote.sourceTimestampEpochMillis>0)||!quote.sessionDate)continue;
      const bucket=quote.sourceTimestampEpochMillis-quote.sourceTimestampEpochMillis%MINUTE_MILLIS;
      const key=`${quote.symbol}|${bucket}`,existing=candles.get(key);
      candles.set(key,{
        symbol:quote.symbol,sessionDate:quote.sessionDate,bucketEpochMillis:bucket,
        open:existing?.open??quote.price,
        high:Math.max(existing?.high??quote.price,quote.price),
        low:Math.min(existing?.low??quote.price,quote.price),
        close:quote.price,volume:Math.max(existing?.volume??0,quote.volume??0),
        source:quote.source,updatedAtEpochMillis:persistedAtEpochMillis,
      });
    }
    const candleRows=[...candles.values()].sort((a,b)=>b.bucketEpochMillis-a.bucketEpochMillis).slice(0,MAX_CANDLE_ROWS);
    const next:PersistedMarketCache={schema:4,snapshots:[...snapshots.values()],candles:candleRows,persistedAtEpochMillis};
    this.state=next;
    await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(next));
  }
  async clear():Promise<void>{
    this.state=null;
    if(nativeRuntimeAvailable){await clearNativeMarketCache();return;}
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
  private async load():Promise<PersistedMarketCache|null>{
    if(this.state!==undefined)return this.state;
    try{
      const raw=nativeRuntimeAvailable
        ?await loadNativeMarketCache()
        :await AsyncStorage.getItem(STORAGE_KEY);
      if(!raw){this.state=null;return null;}
      const parsed=JSON.parse(raw) as Partial<PersistedMarketCache>;
      if(parsed.schema!==4||!Array.isArray(parsed.snapshots)||!Array.isArray(parsed.candles)){
        this.state=null;return null;
      }
      this.state=parsed as PersistedMarketCache;
      return this.state;
    }catch{
      this.state=null;return null;
    }
  }
}

export class MarketPersistenceController{
  private readonly dirtyQuotes=new Map<string,MarketQuote>();
  private readonly versions=new Map<string,string>();
  private readonly unsubscribe:()=>void;
  private timer:ReturnType<typeof setInterval>|null;
  private flushPromise:Promise<void>|null=null;
  constructor(
    marketDataCenter:MarketDataCenter,
    private readonly repository:MarketPersistenceRepository,
    private readonly persistIntervalMillis=5000,
  ){
    const observe=(snapshot:ReadonlyMap<string,MarketQuote>)=>{
      for(const [symbol,quote] of snapshot){
        const version=`${quote.source}|${quote.sourceTimestampEpochMillis}|${quote.receivedAtEpochMillis}|${quote.price}|${quote.volume??''}`;
        if(this.versions.get(symbol)===version)continue;
        this.versions.set(symbol,version);this.dirtyQuotes.set(symbol,quote);
      }
    };
    observe(marketDataCenter.memoryQuotes());
    this.unsubscribe=marketDataCenter.subscribe(observe);
    this.timer=setInterval(()=>{void this.flushNow();},this.persistIntervalMillis);
  }
  async flushNow():Promise<void>{
    if(this.flushPromise)return this.flushPromise;
    if(!this.dirtyQuotes.size)return;
    const batch=[...this.dirtyQuotes.values()];
    this.dirtyQuotes.clear();
    this.flushPromise=this.repository.persist(batch).catch(error=>{
      for(const quote of batch)this.dirtyQuotes.set(quote.symbol,quote);
      throw error;
    }).finally(()=>{this.flushPromise=null;});
    return this.flushPromise;
  }
  dispose():void{
    this.unsubscribe();if(this.timer){clearInterval(this.timer);this.timer=null;}
  }
}

export {STORAGE_KEY as MARKET_PERSISTENCE_FALLBACK_STORAGE_KEY};
