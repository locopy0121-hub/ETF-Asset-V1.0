import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearNativeMarketCache,loadNativeMarketCache,nativeRuntimeAvailable,persistNativeMarketCache,
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
    const state=await this.load();return state?.snapshots?[...state.snapshots]:[];
  }
  async loadCandles(symbol:string,sessionDate:string):Promise<MarketMinuteCandle[]>{
    const state=await this.load();if(!state)return [];
    return state.candles.filter(row=>row.symbol===symbol&&row.sessionDate===sessionDate).sort((a,b)=>a.bucketEpochMillis-b.bucketEpochMillis);
  }
  async persist(quotes:readonly MarketQuote[],persistedAtEpochMillis=Date.now()):Promise<void>{
    if(!quotes.length)return;
    const previous=await this.load();
    const snapshots=new Map<string,MarketQuote>((previous?.snapshots??[]).map(row=>[row.symbol,row] as const));
    const candles=new Map<string,MarketMinuteCandle>((previous?.candles??[]).map(row=>[`${row.symbol}|${row.bucketEpochMillis}`,row] as const));
    for(const quote of quotes){
      if(quote.source==='CACHE'){
        if(!snapshots.has(quote.symbol))snapshots.set(quote.symbol,quote);
        continue;
      }
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
    const serialized=JSON.stringify(next);
    if(nativeRuntimeAvailable){
      const ok=await persistNativeMarketCache(serialized);
      if(!ok)throw new Error('Android SQLite market persistence failed');
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY,serialized);
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
  private latest:ReadonlyMap<string,MarketQuote>=new Map();
  private readonly unsubscribe:()=>void;
  private timer:ReturnType<typeof setInterval>|null;
  constructor(
    marketDataCenter:MarketDataCenter,
    private readonly repository:MarketPersistenceRepository,
    private readonly persistIntervalMillis=5000,
  ){
    this.latest=marketDataCenter.memoryQuotes();
    this.unsubscribe=marketDataCenter.subscribe(snapshot=>{this.latest=snapshot;});
    this.timer=setInterval(()=>{void this.flushNow();},this.persistIntervalMillis);
  }
  async flushNow():Promise<void>{
    if(this.latest.size)await this.repository.persist([...this.latest.values()]);
  }
  dispose():void{
    this.unsubscribe();if(this.timer){clearInterval(this.timer);this.timer=null;}
  }
}

export {STORAGE_KEY as MARKET_PERSISTENCE_FALLBACK_STORAGE_KEY};
