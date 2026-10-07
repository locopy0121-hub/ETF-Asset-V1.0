import { NativeModules, Platform } from 'react-native';
import type { SharedSnapshot } from '../domain/snapshot';
import type { MonitorConfig } from '../monitor/monitorDomain';
import type { WidgetConfig } from '../widget/widgetDomain';

export type NativeMonitorStatus=Readonly<{
  running:boolean;
  state:'running'|'stopped'|'permissionRequired';
  mode:'normal'|'mini';
  x:number;y:number;width:number;height:number;
  lastSyncAt:number;
  displaySymbol:string;
}>;

export type NativeMarketForceRefreshRequests=Readonly<{
  widgetAt:number;
  monitorAt:number;
}>;

export type NativeNotificationStatus=Readonly<{
  permissionGranted:boolean;
  appEnabled:boolean;
  channelCount:number;
  channels:Readonly<Record<string,boolean>>;
}>;
export const NATIVE_NOTIFICATION_CHANNELS={
  dividend:'tf_asset_dividend',
  market:'tf_asset_market',
  updates:'tf_asset_updates',
  backup:'tf_asset_backup',
  general:'tf_asset_general',
} as const;

export type UnifiedMarketIntradayPoint=Readonly<{
  at:number;price:number;
  quality:'trade'|'backup_realtime';
  source:'TWSE_MIS'|'FUGLE'|'SHIOAJI'|'YAHOO';
}>;
export type UnifiedMarketIntradaySeries=Readonly<{
  date:string;
  previousClose?:number|null;
  points:readonly UnifiedMarketIntradayPoint[];
}>;

export type UnifiedMarketRow=Readonly<{
  symbol:string;name:string;currentPrice:number;previousClose:number|null;officialTradePrice:number|null;
  sourceQuoteAt:number;
  quality:'trade'|'backup_realtime'|'bid_ask'|'previous_close'|'official_close';
  source:'TWSE_MIS'|'FUGLE'|'SHIOAJI'|'YAHOO'|'TWSE_DAILY'|'TPEX_DAILY';
  priceType:'REALTIME_TRADE'|'BACKUP_REALTIME'|'BID_ASK'|'PREV_CLOSE'|'OFFICIAL_CLOSE';
  isFallback:boolean;market:'TSE'|'OTC'|'UNKNOWN';statusMessage:string;checkedAt:number;
  volume?:number|null;
}>;
export type NativeMarketProviderHealth=Readonly<{
  source:'FUGLE'|'TWSE_MIS'|'YAHOO'|'CACHE';
  availability:'READY'|'THROTTLED'|'COOLDOWN';
  consecutiveFailures:number;
  lastAttemptEpochMillis:number|null;
  lastSuccessEpochMillis:number|null;
  nextAllowedEpochMillis:number;
  circuitState:'HEALTHY'|'DEGRADED'|'COOLDOWN'|'RECOVERING';
}>;
export type UnifiedMarketSnapshot=Readonly<{
  version:number;quotes:UnifiedMarketRow[];
  intraday?:Record<string,UnifiedMarketIntradaySeries>;
  updatedCount?:number;coveredCount?:number;requestedCount?:number;missing?:string[];
  errors?:string[];queriedAt?:number;conflictCount?:number;
  providerHealth?:readonly NativeMarketProviderHealth[];
  marketCore?:'SAIETF_NATIVE';
}>;
type TfAssetNativeModule={
  refreshUnifiedMarketData:(symbolsJson:string)=>Promise<string>;
  readUnifiedMarketData:()=>Promise<string>;
  setMarketBackendUrl:(url:string)=>Promise<boolean>;
  saveFugleApiKey:(apiKey:string)=>Promise<boolean>;
  loadFugleApiKey:()=>Promise<string|null>;
  clearFugleApiKey:()=>Promise<boolean>;
  loadMarketCoreCache:()=>Promise<string>;
  persistMarketCoreCache:(payloadJson:string)=>Promise<boolean>;
  clearMarketCoreCache:()=>Promise<boolean>;
  queryLocalEtfComponents:(symbol:string,topN:number)=>Promise<string>;
  queryLocalEtfMeta:(symbol:string)=>Promise<string>;
  replaceLocalEtfResearch:(payloadJson:string)=>Promise<string>;
  saveBackupDocument:(text:string,fileName:string)=>Promise<ExternalBackupReceipt|null>;
  openBackupDocument:()=>Promise<OpenedBackupDocument|null>;
  syncWidget:(configJson:string,snapshotJson:string)=>Promise<boolean>;
  syncMonitor:(configJson:string,snapshotJson:string)=>Promise<boolean>;
  requestWidgetRefresh:()=>Promise<boolean>;
  consumeWidgetForceRefreshRequest:()=>Promise<number>;
  consumeMonitorForceRefreshRequest:()=>Promise<number>;
  consumeMarketForceRefreshRequests?:()=>Promise<NativeMarketForceRefreshRequests>;
  startMonitor:()=>Promise<boolean>;
  stopMonitor:()=>Promise<boolean>;
  getMonitorStatus:()=>Promise<NativeMonitorStatus>;
  canDrawOverlays:()=>Promise<boolean>;
  openOverlaySettings:()=>Promise<boolean>;
  pickThemeBackground:()=>Promise<string|null>;
  setAppIcon:(iconKey:string)=>Promise<boolean>;
  readPendingCrashJournal:()=>Promise<string>;
  acknowledgeCrashJournal:()=>Promise<boolean>;
  saveCriticalDiagnostic:(code:string,screen:string)=>Promise<boolean>;
  ensureNotificationChannels:()=>Promise<string>;
  getNotificationStatus:()=>Promise<string>;
  openNotificationSettings:(channelId:string)=>Promise<boolean>;
  postTestNotification:(channelId:string)=>Promise<boolean>;
};

const native=NativeModules.TfAssetNative as TfAssetNativeModule|undefined;
export const nativeRuntimeAvailable=Platform.OS==='android'&&!!native;

export async function syncNativeWidget(config:WidgetConfig,snapshot:SharedSnapshot){
  if(!native)return false;
  return native.syncWidget(JSON.stringify(config),JSON.stringify(snapshot));
}
export async function syncNativeMonitor(config:MonitorConfig,snapshot:SharedSnapshot){
  if(!native)return false;
  return native.syncMonitor(JSON.stringify(config),JSON.stringify(snapshot));
}
export async function requestNativeWidgetRefresh(){return native?native.requestWidgetRefresh():false;}
export async function consumeNativeWidgetForceRefreshRequest(){return native?native.consumeWidgetForceRefreshRequest():0;}
export async function consumeNativeMonitorForceRefreshRequest(){return native?native.consumeMonitorForceRefreshRequest():0;}
export async function consumeNativeMarketForceRefreshRequests():Promise<NativeMarketForceRefreshRequests>{
  if(!native)return {widgetAt:0,monitorAt:0};
  if(typeof native.consumeMarketForceRefreshRequests==='function')return native.consumeMarketForceRefreshRequests();
  // Compatibility fallback for an older native shell while JS is hot-reloaded.
  const [widgetAt,monitorAt]=await Promise.all([
    native.consumeWidgetForceRefreshRequest(),
    native.consumeMonitorForceRefreshRequest(),
  ]);
  return {widgetAt,monitorAt};
}
export async function startNativeMonitor(){return native?native.startMonitor():false;}
export async function stopNativeMonitor(){return native?native.stopMonitor():false;}
export async function getNativeMonitorStatus(){return native?native.getMonitorStatus():null;}
export async function canDrawOverlays(){return native?native.canDrawOverlays():false;}
export async function openOverlaySettings(){return native?native.openOverlaySettings():false;}
export async function pickNativeThemeBackground(){return native?native.pickThemeBackground():null;}
export async function setNativeAppIcon(iconKey:string){return native?native.setAppIcon(iconKey):false;}

export async function ensureNativeNotificationChannels():Promise<NativeNotificationStatus|null>{
  if(!native?.ensureNotificationChannels)return null;
  return JSON.parse(await native.ensureNotificationChannels()) as NativeNotificationStatus;
}
export async function getNativeNotificationStatus():Promise<NativeNotificationStatus|null>{
  if(!native?.getNotificationStatus)return null;
  return JSON.parse(await native.getNotificationStatus()) as NativeNotificationStatus;
}
export async function openNativeNotificationSettings(channelId=''){
  return native?.openNotificationSettings?native.openNotificationSettings(channelId):false;
}
export async function postNativeTestNotification(channelId=NATIVE_NOTIFICATION_CHANNELS.general){
  return native?.postTestNotification?native.postTestNotification(channelId):false;
}

export const unifiedMarketCenterAvailable=Platform.OS==='android'
  &&typeof native?.refreshUnifiedMarketData==='function'
  &&typeof native?.readUnifiedMarketData==='function';
export async function loadUnifiedMarketData():Promise<UnifiedMarketSnapshot>{
  if(!unifiedMarketCenterAvailable||!native)throw new Error('Android 行情資料中心尚未安裝');
  const raw=await native.readUnifiedMarketData();
  return JSON.parse(raw) as UnifiedMarketSnapshot;
}
export async function refreshUnifiedMarketData(symbols:readonly string[]):Promise<UnifiedMarketSnapshot>{
  if(!unifiedMarketCenterAvailable||!native)throw new Error('Android 行情資料中心尚未安裝');
  const raw=await native.refreshUnifiedMarketData(JSON.stringify(symbols));
  return JSON.parse(raw) as UnifiedMarketSnapshot;
}

export async function setNativeMarketBackendUrl(url:string){
  if(!unifiedMarketCenterAvailable||!native)return false;
  return native.setMarketBackendUrl(url);
}

export async function saveNativeFugleApiKey(apiKey:string){
  if(!nativeRuntimeAvailable||!native)return false;
  return native.saveFugleApiKey(apiKey.trim());
}
export async function loadNativeFugleApiKey(){
  if(!nativeRuntimeAvailable||!native)return null;
  return native.loadFugleApiKey();
}
export async function clearNativeFugleApiKey(){
  if(!nativeRuntimeAvailable||!native)return false;
  return native.clearFugleApiKey();
}
export async function loadNativeMarketCache(){
  if(!nativeRuntimeAvailable||!native)return '';
  return native.loadMarketCoreCache();
}
export async function persistNativeMarketCache(payloadJson:string){
  if(!nativeRuntimeAvailable||!native)return false;
  return native.persistMarketCoreCache(payloadJson);
}
export async function clearNativeMarketCache(){
  if(!nativeRuntimeAvailable||!native)return false;
  return native.clearMarketCoreCache();
}

export type LocalEtfComponent=Readonly<{
  stockSymbol:string;
  stockName:string;
  weight:number;
  industry:string;
  source:string;
  effectiveDate:string;
  updatedAt:string;
}>;
export type LocalEtfComponentsResult=Readonly<{
  symbol:string;
  topN:number;
  total:number;
  available:boolean;
  components:readonly LocalEtfComponent[];
}>;
export type LocalEtfMeta=Readonly<{
  symbol:string;
  frequency:string;
  terRatio:number|null;
  category:string;
  issuer:string;
  trackingIndex:string;
  active:boolean;
  source:string;
  effectiveDate:string;
  updatedAt:string;
}>;
export type LocalEtfMetaResult=Readonly<{symbol:string;available:boolean;meta:LocalEtfMeta|null}>;
export type LocalEtfResearchImport=Readonly<{
  datasetVersion:string;
  importedAt:string;
  components:readonly Readonly<{
    etfSymbol:string;stockSymbol:string;stockName:string;weight:number;industry:string;
    source:string;effectiveDate:string;updatedAt:string;
  }>[];
  meta:readonly Readonly<{
    etfSymbol:string;frequency:string;terRatio:number|null;category:string;issuer:string;
    trackingIndex:string;active:boolean;source:string;effectiveDate:string;updatedAt:string;
  }>[];
}>;

export const localEtfResearchAvailable=Platform.OS==='android'
  &&typeof native?.queryLocalEtfComponents==='function'
  &&typeof native?.queryLocalEtfMeta==='function';

export async function queryLocalEtfComponents(symbol:string,topN=20):Promise<LocalEtfComponentsResult>{
  if(!localEtfResearchAvailable||!native)throw new Error('本機 ETF 研究資料庫尚未安裝');
  const raw=await native.queryLocalEtfComponents(symbol,Math.max(1,Math.min(100,Math.floor(topN))));
  return JSON.parse(raw) as LocalEtfComponentsResult;
}
export async function queryLocalEtfMeta(symbol:string):Promise<LocalEtfMetaResult>{
  if(!localEtfResearchAvailable||!native)throw new Error('本機 ETF 研究資料庫尚未安裝');
  const raw=await native.queryLocalEtfMeta(symbol);
  return JSON.parse(raw) as LocalEtfMetaResult;
}
export async function replaceLocalEtfResearch(payload:LocalEtfResearchImport){
  if(!localEtfResearchAvailable||!native||typeof native.replaceLocalEtfResearch!=='function')
    throw new Error('本機 ETF 研究資料匯入介面尚未安裝');
  return JSON.parse(await native.replaceLocalEtfResearch(JSON.stringify(payload))) as Readonly<{
    componentCount:number;metaCount:number;datasetVersion:string;importedAt:string;
  }>;
}


export type ExternalBackupReceipt=Readonly<{
  uri:string;fileName:string;bytes:number;verified:true;
}>;
export type OpenedBackupDocument=Readonly<{
  uri:string;fileName:string;bytes:number;text:string;
}>;
export const backupDocumentPickerAvailable=Platform.OS==='android'
  &&typeof native?.saveBackupDocument==='function'
  &&typeof native?.openBackupDocument==='function';
export async function saveExternalBackup(text:string,fileName:string):Promise<ExternalBackupReceipt|null>{
  if(!backupDocumentPickerAvailable||!native)throw new Error('Android 外部 JSON 備份檔案選擇器無法使用');
  return native.saveBackupDocument(text,fileName);
}
export async function chooseExternalBackup():Promise<OpenedBackupDocument|null>{
  if(!backupDocumentPickerAvailable||!native)throw new Error('Android 外部 JSON 還原選擇器無法使用');
  return native.openBackupDocument();
}

/** Native Java/Kotlin uncaught exception metadata persists across a process restart. */
export async function readPendingNativeCrashJournal():Promise<string>{
  return native&&typeof native.readPendingCrashJournal==='function'?native.readPendingCrashJournal():'';
}
export async function acknowledgeNativeCrashJournal():Promise<boolean>{
  return native&&typeof native.acknowledgeCrashJournal==='function'?native.acknowledgeCrashJournal():false;
}
export function saveCriticalNativeDiagnostic(code:string,screen:string):void{
  if(native&&typeof native.saveCriticalDiagnostic==='function')void native.saveCriticalDiagnostic(code,screen).catch(()=>{});
}
