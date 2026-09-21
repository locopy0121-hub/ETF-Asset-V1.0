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

type TfAssetNativeModule={
  syncWidget:(configJson:string,snapshotJson:string)=>Promise<boolean>;
  syncMonitor:(configJson:string,snapshotJson:string)=>Promise<boolean>;
  requestWidgetRefresh:()=>Promise<boolean>;
  consumeWidgetForceRefreshRequest:()=>Promise<number>;
  startMonitor:()=>Promise<boolean>;
  stopMonitor:()=>Promise<boolean>;
  getMonitorStatus:()=>Promise<NativeMonitorStatus>;
  canDrawOverlays:()=>Promise<boolean>;
  openOverlaySettings:()=>Promise<boolean>;
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
export async function startNativeMonitor(){return native?native.startMonitor():false;}
export async function stopNativeMonitor(){return native?native.stopMonitor():false;}
export async function getNativeMonitorStatus(){return native?native.getMonitorStatus():null;}
export async function canDrawOverlays(){return native?native.canDrawOverlays():false;}
export async function openOverlaySettings(){return native?native.openOverlaySettings():false;}
