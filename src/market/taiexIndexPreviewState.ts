import type {TaiexDailyOhlc,TaiexIntraday} from './taiexIndexSource';
import type {IndexClose,IndexPoint,IndexRange,IndexSnapshot} from './taiexIndex';

// Ephemeral read-only mirror. No editor fetch or write of a financial source.
export type TaiexIndexPreviewSnapshot=Readonly<{
  range:IndexRange;mis:IndexSnapshot|null;history:readonly IndexClose[];
  points:readonly IndexPoint[];officialTape:TaiexIntraday|null;
  ohlc:readonly TaiexDailyOhlc[];gatesOn:boolean;
  busy:boolean;historyBusy:boolean;error:string|null;
}>;
let snapshot:TaiexIndexPreviewSnapshot|null=null;
const subscribers=new Set<()=>void>();
export const getTaiexIndexPreviewSnapshot=()=>snapshot;
export const subscribeTaiexIndexPreview=(listener:()=>void)=>{
  subscribers.add(listener);
  return ()=>{subscribers.delete(listener);};
};
export function publishTaiexIndexPreviewSnapshot(next:TaiexIndexPreviewSnapshot){
  snapshot=next;
  for(const notify of subscribers)notify();
}
export function clearTaiexIndexPreviewSnapshot(){
  snapshot=null;
  for(const notify of subscribers)notify();
}
