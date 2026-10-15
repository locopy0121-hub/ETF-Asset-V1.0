import type {DailyCandle} from './twseDailyHistory';
export type IndicatorPoint=Readonly<{date:string;k:number|null;d:number|null;dif:number|null;dea:number|null;histogram:number|null}>;
/** Reference indicators computed exclusively from official exchange OHLC, with no fabricated prehistory. */
export function computeTechnicalSignals(candles:readonly DailyCandle[]):IndicatorPoint[]{
  const rows=[...candles].filter(x=>x.high>=x.low&&x.low>0&&x.close>0).sort((a,b)=>a.date.localeCompare(b.date));
  const out:IndicatorPoint[]=[];
  let ema12=0,ema26=0,dea=0,k=50,d=50;
  for(let i=0;i<rows.length;i++){
    const c=rows[i]!;
    ema12=i===0?c.close:ema12+(c.close-ema12)*2/13;
    ema26=i===0?c.close:ema26+(c.close-ema26)*2/27;
    const dif=ema12-ema26;
    dea=i===0?dif:dea+(dif-dea)*2/10;
    let kv:number|null=null,dv:number|null=null;
    if(i>=8){
      const last=rows.slice(i-8,i+1);
      const highest=Math.max(...last.map(x=>x.high)),lowest=Math.min(...last.map(x=>x.low));
      const rsv=highest===lowest?50:(c.close-lowest)/(highest-lowest)*100;
      k=(2*k+rsv)/3;d=(2*d+k)/3;
      kv=k;dv=d;
    }
    out.push({date:c.date,k:kv,d:dv,dif:i>=25?dif:null,dea:i>=33?dea:null,
      histogram:i>=33?2*(dif-dea):null});
  }
  return out;
}
