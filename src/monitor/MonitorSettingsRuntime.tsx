import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,type PropsWithChildren,useContext,useEffect,useMemo,useState} from 'react';
import {
  DEFAULT_MONITOR_CONFIG,DEFAULT_MONITOR_EFFECTS,DEFAULT_MONITOR_SORT,DEFAULT_MONITOR_STYLE,
  type MonitorConfig,type MonitorEffect,type MonitorField,type MonitorSortKey,type MonitorStyle,
} from './monitorDomain';

const STORAGE_KEY='@tf-asset/monitor-settings';
const VALID_FIELDS:readonly MonitorField[]=['symbol','price','changePercent','marketValue','pnl'];
const VALID_EFFECTS:readonly MonitorEffect[]=['none','fade','pulse','flash-on-change'];
const VALID_SORTS:readonly MonitorSortKey[]=['manual','symbol','price','changePercent'];
const clamp=(v:unknown,min:number,max:number,fallback:number)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
const color=(v:unknown,f:string)=>typeof v==='string'&&/^#[0-9A-Fa-f]{6}$/.test(v)?v:f;
const strings=(v:unknown)=>Array.isArray(v)?Array.from(new Set(v.map(x=>String(x).trim().toUpperCase()).filter(Boolean))):[];
const normStyle=(s:Partial<MonitorStyle>|undefined,fallback:MonitorStyle):MonitorStyle=>({
  fontScale:clamp(s?.fontScale,.7,1.8,fallback.fontScale),
  titleFontScale:clamp(s?.titleFontScale,.7,1.8,fallback.titleFontScale),
  valueFontScale:clamp(s?.valueFontScale,.7,2,fallback.valueFontScale),
  backgroundColor:color(s?.backgroundColor,fallback.backgroundColor),
  textColor:color(s?.textColor,fallback.textColor),
  secondaryTextColor:color(s?.secondaryTextColor,fallback.secondaryTextColor),
  gainColor:color(s?.gainColor,fallback.gainColor),lossColor:color(s?.lossColor,fallback.lossColor),neutralColor:color(s?.neutralColor,fallback.neutralColor),
  backgroundOpacity:clamp(s?.backgroundOpacity,.1,1,fallback.backgroundOpacity),
  borderColor:color(s?.borderColor,fallback.borderColor),borderWidth:clamp(s?.borderWidth,0,6,fallback.borderWidth),cornerRadius:clamp(s?.cornerRadius,0,40,fallback.cornerRadius),
  shadowEnabled:s?.shadowEnabled??fallback.shadowEnabled,textAlign:s?.textAlign==='center'||s?.textAlign==='right'?s.textAlign:'left',
  rowGap:clamp(s?.rowGap,0,24,fallback.rowGap),padding:clamp(s?.padding,0,32,fallback.padding),
});

function normalize(input:Partial<MonitorConfig>|null|undefined):MonitorConfig{
  const normal=input?.normalLayout, mini=input?.miniLayout;
  const fields=Array.isArray(input?.fields)?input.fields.filter((x):x is MonitorField=>VALID_FIELDS.includes(x as MonitorField)):[...DEFAULT_MONITOR_CONFIG.fields];
  const miniFields=Array.isArray(input?.miniFields)?input.miniFields.filter((x):x is MonitorField=>VALID_FIELDS.includes(x as MonitorField)):[...DEFAULT_MONITOR_CONFIG.miniFields];
  const effects=input?.effects,sort=input?.sort;
  return {
    enabled:input?.enabled??false,mode:input?.mode==='mini'?'mini':'normal',template:input?.template==='quotes'||input?.template==='compact'?input.template:'portfolio',
    fields:fields.length?fields:[...DEFAULT_MONITOR_CONFIG.fields],miniFields:miniFields.length?miniFields:[...DEFAULT_MONITOR_CONFIG.miniFields],
    selectedSymbols:strings(input?.selectedSymbols),showBreathingLight:input?.showBreathingLight??true,
    alertChangePct:Number.isFinite(Number(input?.alertChangePct))?Math.max(0,Number(input?.alertChangePct)):null,
    normalLayout:{x:clamp(normal?.x,-2000,2000,16),y:clamp(normal?.y,-2000,2000,120),width:clamp(normal?.width,120,1200,320),height:clamp(normal?.height,56,1600,420)},
    miniLayout:{x:clamp(mini?.x,-2000,2000,16),y:clamp(mini?.y,-2000,2000,120),width:clamp(mini?.width,120,600,180),height:clamp(mini?.height,56,300,72)},
    normalStyle:normStyle(input?.normalStyle,DEFAULT_MONITOR_STYLE),miniStyle:normStyle(input?.miniStyle,DEFAULT_MONITOR_CONFIG.miniStyle),
    effects:{
      refresh:VALID_EFFECTS.includes(effects?.refresh as MonitorEffect)?effects!.refresh:DEFAULT_MONITOR_EFFECTS.refresh,
      gain:VALID_EFFECTS.includes(effects?.gain as MonitorEffect)?effects!.gain:DEFAULT_MONITOR_EFFECTS.gain,
      loss:VALID_EFFECTS.includes(effects?.loss as MonitorEffect)?effects!.loss:DEFAULT_MONITOR_EFFECTS.loss,
      alert:VALID_EFFECTS.includes(effects?.alert as MonitorEffect)?effects!.alert:DEFAULT_MONITOR_EFFECTS.alert,
      animationsEnabled:effects?.animationsEnabled??true,
    },
    sort:{key:VALID_SORTS.includes(sort?.key as MonitorSortKey)?sort!.key:DEFAULT_MONITOR_SORT.key,direction:sort?.direction==='desc'?'desc':'asc',manualSymbols:strings(sort?.manualSymbols)},
    alwaysOnTop:input?.alwaysOnTop??true,
  };
}

type Value=Readonly<{hydrated:boolean;config:MonitorConfig;setConfig:(c:MonitorConfig)=>void;patch:(p:Partial<MonitorConfig>)=>void;reset:()=>void;}>;
const Context=createContext<Value|null>(null);
export function MonitorSettingsRuntimeProvider({children}:PropsWithChildren){
  const [config,setConfigState]=useState<MonitorConfig>(DEFAULT_MONITOR_CONFIG);const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{let alive=true;AsyncStorage.getItem(STORAGE_KEY).then(raw=>{if(alive&&raw)setConfigState(normalize(JSON.parse(raw) as Partial<MonitorConfig>));}).catch(()=>{}).finally(()=>{if(alive)setHydrated(true);});return()=>{alive=false;};},[]);
  useEffect(()=>{if(hydrated)AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(config)).catch(()=>{});},[hydrated,config]);
  const value=useMemo<Value>(()=>({hydrated,config,setConfig:next=>setConfigState(normalize(next)),patch:p=>setConfigState(c=>normalize({...c,...p})),reset:()=>setConfigState(DEFAULT_MONITOR_CONFIG)}),[hydrated,config]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useMonitorSettingsRuntime(){const value=useContext(Context);if(!value)throw new Error('useMonitorSettingsRuntime must be used inside MonitorSettingsRuntimeProvider');return value;}
export { STORAGE_KEY as MONITOR_SETTINGS_STORAGE_KEY };
