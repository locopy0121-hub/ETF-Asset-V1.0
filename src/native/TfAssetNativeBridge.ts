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

export type ExternalBackupReceipt=Readonly<{uri:string;fileName:string;bytes:number;verified:true}>;
export type SelectedBackupDocument=Readonly<{uri:string;fileName:string;bytes:number;text:string}>;
type TfAssetNativeModule={
  saveBackupDocument:(text:string,fileName:string)=>Promise<ExternalBackupReceipt|null>;
  openBackupDocument:()=>Promise<SelectedBackupDocument|null>;
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

/** Android Storage Access Framework: document lives in the selected provider, not app-private AsyncStorage. */
export const backupDocumentPickerAvailable=Platform.OS==='android'
  &&typeof native?.saveBackupDocument==='function'
  &&typeof native?.openBackupDocument==='function';
export async function saveExternalBackup(text:string,fileName:string):Promise<ExternalBackupReceipt|null>{
  if(!backupDocumentPickerAvailable||!native)throw new Error('目前版本未安裝 Android 外部備份功能');
  return native.saveBackupDocument(text,fileName);
}
export async function chooseExternalBackup():Promise<SelectedBackupDocument|null>{
  if(!backupDocumentPickerAvailable||!native)throw new Error('目前版本未安裝 Android 外部備份功能');
  return native.openBackupDocument();
}
