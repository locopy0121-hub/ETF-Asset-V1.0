import type {RuntimeQuote} from '../finance/financeSeed';

export type MarketComparisonDiagnosis=
  |'MATCH'
  |'NEED_BROKER_VALUE'
  |'CENTER_MISSING'
  |'APP_MISSING'
  |'APP_SYNC_MISMATCH'
  |'CENTER_SOURCE_MISMATCH'
  |'BROKER_SOURCE_OR_TIME_MISMATCH'
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

export function marketSourceField(quote:Pick<RuntimeQuote,'source'|'quality'>|undefined){
  if(!quote)return '尚無';
  if(quote.source==='TWSE_MIS'&&quote.quality==='trade')return 'z｜實際成交價';
  if(quote.source==='TWSE_DAILY'&&quote.quality==='official_close')return 'ClosingPrice｜官方收盤';
  if(quote.source==='TPEX_DAILY'&&quote.quality==='official_close')return 'Close｜官方收盤';
  return (quote.source??'未知來源')+'｜'+(quote.quality??'未知品質');
}

export function diagnoseMarketComparison(input:{
  appPrice:number|null|undefined;
  brokerPrice:number|null|undefined;
  centerPrice:number|null|undefined;
}):MarketComparisonDiagnosis{
  const {appPrice,brokerPrice,centerPrice}=input;
  if(typeof brokerPrice!=='number'||!Number.isFinite(brokerPrice)||brokerPrice<=0)return 'NEED_BROKER_VALUE';
  if(typeof centerPrice!=='number'||!Number.isFinite(centerPrice)||centerPrice<=0)return 'CENTER_MISSING';
  if(typeof appPrice!=='number'||!Number.isFinite(appPrice)||appPrice<=0)return 'APP_MISSING';
  const appBroker=sameMarketPrice(appPrice,brokerPrice);
  const appCenter=sameMarketPrice(appPrice,centerPrice);
  const centerBroker=sameMarketPrice(centerPrice,brokerPrice);
  if(appBroker&&appCenter&&centerBroker)return 'MATCH';
  if(centerBroker&&!appCenter)return 'APP_SYNC_MISMATCH';
  if(appBroker&&!centerBroker)return 'CENTER_SOURCE_MISMATCH';
  if(appCenter&&!centerBroker)return 'BROKER_SOURCE_OR_TIME_MISMATCH';
  return 'MULTI_MISMATCH';
}

export function marketComparisonDiagnosisLabel(code:MarketComparisonDiagnosis){
  switch(code){
    case 'MATCH':return '三方一致';
    case 'NEED_BROKER_VALUE':return '請先輸入證券中心基準值';
    case 'CENTER_MISSING':return '行情中心尚無可核實行情';
    case 'APP_MISSING':return '此代號目前沒有 App 持股行情可比';
    case 'APP_SYNC_MISMATCH':return '疑似 App 顯示未同步行情中心';
    case 'CENTER_SOURCE_MISMATCH':return '疑似行情中心來源／價格與證券中心不一致';
    case 'BROKER_SOURCE_OR_TIME_MISMATCH':return 'App 與行情中心一致；請核對證券中心來源時間';
    case 'MULTI_MISMATCH':return '三方數值不同，需依來源時間與欄位繼續查核';
  }
}
