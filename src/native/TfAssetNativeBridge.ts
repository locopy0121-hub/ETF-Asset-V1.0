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

export type UnifiedMarketRow=Readonly<{
  symbol:string;name:string;currentPrice:number;previousClose:number|null;
  sourceQuoteAt:number;quality:'trade'|'official_close';source:'TWSE_MIS'|'TWSE_DAILY'|'TPEX_DAILY';checkedAt:number;
}>;
export type UnifiedMarketSnapshot=Readonly<{
  version:number;quotes:UnifiedMarketRow[];
  updatedCount?:number;coveredCount?:number;requestedCount?:number;missing?:string[];
  errors?:string[];queriedAt?:number;conflictCount?:number;
}>;
type TfAssetNativeModule={
  refreshUnifiedMarketData:(symbolsJson:string)=>Promise<string>;
  readUnifiedMarketData:()=>Promise<string>;
  setMarketBackendUrl:(url:string)=>Promise<boolean>;
  syncWidget:(configJson:string,snapshotJson:string)=>Promise<boolean>;
  syncMonitor:(configJson:string,snapshotJson:string)=>Promise<boolean>;
  requestWidgetRefresh:()=>Promise<boolean>;
  consumeWidgetForceRefreshRequest:()=>Promise<number>;
  consumeMonitorForceRefreshRequest:()=>Promise<number>;
  startMonitor:()=>Promise<boolean>;
  stopMonitor:()=>Promise<boolean>;
  getMonitorStatus:()=>Promise<NativeMonitorStatus>;
  canDrawOverlays:()=>Promise<boolean>;
  openOverlaySettings:()=>Promise<boolean>;
  pickThemeBackground:()=>Promise<string|null>;
  setAppIcon:(iconKey:string)=>Promise<boolean>;
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
export async function startNativeMonitor(){return native?native.startMonitor():false;}
export async function stopNativeMonitor(){return native?native.stopMonitor():false;}
export async function getNativeMonitorStatus(){return native?native.getMonitorStatus():null;}
export async function canDrawOverlays(){return native?native.canDrawOverlays():false;}
export async function openOverlaySettings(){return native?native.openOverlaySettings():false;}
export async function pickNativeThemeBackground(){return native?native.pickThemeBackground():null;}
export async function setNativeAppIcon(iconKey:string){return native?native.setAppIcon(iconKey):false;}

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
