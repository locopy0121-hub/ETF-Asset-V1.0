import type {IndexClose,IndexPoint,IndexRange,IndexSnapshot,TaiexDailyOhlc,TaiexIntraday} from '../market/taiexIndex';

/** Read-only market state from the live TAIEX card; the settings preview never polls. */
export type TaiexPreviewSnapshot=Readonly<{
  range:IndexRange;gatesOn:boolean;
  mis:IndexSnapshot|null;history:readonly IndexClose[];points:readonly IndexPoint[];
  officialTape:TaiexIntraday|null;ohlc:readonly TaiexDailyOhlc[];
  busy:boolean;historyBusy:boolean;error:string|null;
}>;
let snapshot:TaiexPreviewSnapshot|null=null;
const listeners=new Set<()=>void>();
export const getTaiexPreviewSnapshot=()=>snapshot;
export const subscribeTaiexPreviewSnapshot=(listener:()=>void)=>{
  listeners.add(listener);
  return()=>{listeners.delete(listener);};
};
export function publishTaiexPreviewSnapshot(next:TaiexPreviewSnapshot|null){
  if(Object.is(next,snapshot))return;
  snapshot=next;
  for(const listener of listeners)listener();
}
export const subscribeNoTaiexPreview=()=>()=>{};
export const noTaiexPreviewSnapshot=()=>null;
