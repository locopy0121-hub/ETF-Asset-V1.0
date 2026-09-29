import type {RuntimeQuote} from '../finance/financeSeed';

export type MarketComparisonDiagnosis=
  |'MATCH'
  |'OFFICIAL_MISSING'
  |'CENTER_MISSING'
  |'APP_MISSING'
  |'APP_SYNC_MISMATCH'
  |'CENTER_SOURCE_MISMATCH'
  |'APP_CENTER_VS_OFFICIAL_MISMATCH'
  |'MULTI_MISMATCH';

export const MARKET_COMPARE_EPSILON=0.0001;

export function priceDifference(left:number|null|undefined,right:number|null|undefined){
  return typeof left==='number'&&Number.isFinite(left)&&typeof right==='number'&&Number.isFinite(right)
    ?left-right:null;
}

export function sameMarketPrice(left:number|null|undefined,right:number|null|undefined,epsilon=MARKET_COMPARE_EPSILON){
  const diff=priceDifference(left,right);
  return diff!==null&&Math.abs(diff)<=epsilon;
}

export function marketSourceField(quote:Pick<RuntimeQuote,'source'|'quality'|'priceType'|'isFallback'>|undefined){
  if(!quote)return '尚無';
  if(quote.source==='TWSE_MIS'&&quote.priceType==='REALTIME_TRADE')return 'z｜實際成交價';
  if(quote.source==='TWSE_MIS'&&quote.priceType==='BACKUP_REALTIME')return 'pz｜最近成交參考（Fallback）';
  if(quote.source==='TWSE_MIS'&&quote.priceType==='BID_ASK')return 'b/a｜委託簿參考（Fallback）';
  if(quote.source==='TWSE_MIS'&&quote.priceType==='PREV_CLOSE')return 'y｜昨收（Fallback）';
  if(quote.source==='YAHOO')return 'Yahoo｜備援行情（Fallback）';
  if(quote.source==='TWSE_DAILY'&&quote.quality==='official_close')return 'ClosingPrice｜官方收盤';
  if(quote.source==='TPEX_DAILY'&&quote.quality==='official_close')return 'Close｜官方收盤';
  return (quote.source??'未知來源')+'｜'+(quote.priceType??quote.quality??'未知品質');
}

export function diagnoseMarketComparison(input:{
  appPrice:number|null|undefined;
  officialPrice:number|null|undefined;
  centerPrice:number|null|undefined;
}):MarketComparisonDiagnosis{
  const {appPrice,officialPrice,centerPrice}=input;
  if(typeof officialPrice!=='number'||!Number.isFinite(officialPrice)||officialPrice<=0)return 'OFFICIAL_MISSING';
  if(typeof centerPrice!=='number'||!Number.isFinite(centerPrice)||centerPrice<=0)return 'CENTER_MISSING';
  if(typeof appPrice!=='number'||!Number.isFinite(appPrice)||appPrice<=0)return 'APP_MISSING';
  const appOfficial=sameMarketPrice(appPrice,officialPrice);
  const appCenter=sameMarketPrice(appPrice,centerPrice);
  const centerOfficial=sameMarketPrice(centerPrice,officialPrice);
  if(appOfficial&&appCenter&&centerOfficial)return 'MATCH';
  if(centerOfficial&&!appCenter)return 'APP_SYNC_MISMATCH';
  if(appOfficial&&!centerOfficial)return 'CENTER_SOURCE_MISMATCH';
  if(appCenter&&!centerOfficial)return 'APP_CENTER_VS_OFFICIAL_MISMATCH';
  return 'MULTI_MISMATCH';
}

export function marketComparisonDiagnosisLabel(code:MarketComparisonDiagnosis){
  switch(code){
    case 'MATCH':return '三方一致';
    case 'OFFICIAL_MISSING':return '證券中心／官方來源尚無可核實的 z 實際成交價';
    case 'CENTER_MISSING':return '行情中心尚無可核實行情';
    case 'APP_MISSING':return '此代號目前沒有 App 持股行情可比';
    case 'APP_SYNC_MISMATCH':return '行情中心與官方一致；App 顯示可能尚未同步行情中心';
    case 'CENTER_SOURCE_MISMATCH':return 'App 與官方一致；行情中心數值／來源可能不同步';
    case 'APP_CENTER_VS_OFFICIAL_MISMATCH':return 'App 與行情中心一致，但與官方行情不同；請比對三方來源時間';
    case 'MULTI_MISMATCH':return '三方數值不同，需依來源時間與欄位繼續查核';
  }
}
