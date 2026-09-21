import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type DateFormat='YYYY-MM-DD'|'YYYY/MM/DD';
export type ProfitColorMode='red-up-green-down'|'green-up-red-down';
export type NotificationPrefs=Readonly<{
  exDividend:boolean;
  dividend:boolean;
  marketAlert:boolean;
  updateFailure:boolean;
  backupReminder:boolean;
  vibration:boolean;
  sound:boolean;
  leadDays:number;
}>;
export type DisplayPrefs=Readonly<{
  fontScale:number;
  amountDecimals:0|2;
  percentDecimals:0|1|2;
  thousandsSeparator:boolean;
  dateFormat:DateFormat;
  profitColorMode:ProfitColorMode;
  gainColor:string;
  lossColor:string;
  neutralColor:string;
}>;
export type TradeDefaults=Readonly<{
  brokerProfileId:string;
  accountLabel:string;
  tradeKind:'buy'|'sell';
}>;
export type AiResponseDetail='concise'|'balanced'|'detailed';
export type AiPrefs=Readonly<{
  enabled:boolean;
  floatingButtonVisible:boolean;
  floatingPanelVisible:boolean;
  buttonSize:number;
  buttonOpacity:number;
  panelWidth:number;
  panelHeight:number;
  panelOpacity:number;
  positionLocked:boolean;
  edgeSnap:boolean;
  statusDotVisible:boolean;
  networkSearch:boolean;
  holdingsNews:boolean;
  proactiveHints:boolean;
  showSources:boolean;
  showDates:boolean;
  useHistory:boolean;
  confirmBeforeWrite:boolean;
  responseDetail:AiResponseDetail;
  visiblePages:readonly ('home'|'ledger'|'portfolio'|'dividend'|'ai'|'settings')[];
}>;
export type SettingsPrefs=Readonly<{
  schema:1;
  notifications:NotificationPrefs;
  display:DisplayPrefs;
  ai:AiPrefs;
  tradeDefaults:TradeDefaults;
}>;

const DEFAULT_SETTINGS:SettingsPrefs={
  schema:1,
  notifications:{
    exDividend:true,
    dividend:true,
    marketAlert:false,
    updateFailure:true,
    backupReminder:true,
    vibration:true,
    sound:true,
    leadDays:1,
  },
  display:{
    fontScale:1,
    amountDecimals:0,
    percentDecimals:2,
    thousandsSeparator:true,
    dateFormat:'YYYY-MM-DD',
    profitColorMode:'red-up-green-down',
    gainColor:'#EF4444',
    lossColor:'#10B981',
    neutralColor:'#64748B',
  },
  ai:{
    enabled:true,
    floatingButtonVisible:true,
    floatingPanelVisible:true,
    buttonSize:52,
    buttonOpacity:1,
    panelWidth:360,
    panelHeight:430,
    panelOpacity:1,
    positionLocked:false,
    edgeSnap:true,
    statusDotVisible:true,
    networkSearch:true,
    holdingsNews:true,
    proactiveHints:true,
    showSources:true,
    showDates:true,
    useHistory:true,
    confirmBeforeWrite:true,
    responseDetail:'balanced',
    visiblePages:['home','ledger','portfolio','dividend','ai','settings'],
  },
  tradeDefaults:{
    brokerProfileId:'huanan-yongchang',
    accountLabel:'主要帳戶',
    tradeKind:'buy',
  },
};

const STORAGE_KEY='@tf-asset/settings-runtime';

function normalize(input:Partial<SettingsPrefs>|null|undefined):SettingsPrefs{
  const n=input?.notifications;
  const d=input?.display;
  const a=input?.ai;
  const t=input?.tradeDefaults;
  const lead=Math.max(0,Math.min(30,Math.floor(Number(n?.leadDays??DEFAULT_SETTINGS.notifications.leadDays))));
  const fontScale=Math.max(0.8,Math.min(1.4,Number(d?.fontScale??DEFAULT_SETTINGS.display.fontScale)));
  const color=(value:unknown,fallback:string)=>typeof value==='string'&&/^#[0-9A-Fa-f]{6}$/.test(value)?value.toUpperCase():fallback;
  return {
    schema:1,
    notifications:{
      exDividend:n?.exDividend??DEFAULT_SETTINGS.notifications.exDividend,
      dividend:n?.dividend??DEFAULT_SETTINGS.notifications.dividend,
      marketAlert:n?.marketAlert??DEFAULT_SETTINGS.notifications.marketAlert,
      updateFailure:n?.updateFailure??DEFAULT_SETTINGS.notifications.updateFailure,
      backupReminder:n?.backupReminder??DEFAULT_SETTINGS.notifications.backupReminder,
      vibration:n?.vibration??DEFAULT_SETTINGS.notifications.vibration,
      sound:n?.sound??DEFAULT_SETTINGS.notifications.sound,
      leadDays:lead,
    },
    display:{
      fontScale:Number.isFinite(fontScale)?fontScale:1,
      amountDecimals:d?.amountDecimals===2?2:0,
      percentDecimals:d?.percentDecimals===0||d?.percentDecimals===1?d.percentDecimals:2,
      thousandsSeparator:d?.thousandsSeparator??DEFAULT_SETTINGS.display.thousandsSeparator,
      dateFormat:d?.dateFormat==='YYYY/MM/DD'?'YYYY/MM/DD':'YYYY-MM-DD',
      profitColorMode:d?.profitColorMode==='green-up-red-down'?'green-up-red-down':'red-up-green-down',
      gainColor:color(d?.gainColor,DEFAULT_SETTINGS.display.gainColor),
      lossColor:color(d?.lossColor,DEFAULT_SETTINGS.display.lossColor),
      neutralColor:color(d?.neutralColor,DEFAULT_SETTINGS.display.neutralColor),
    },
    ai:{
      enabled:a?.enabled??DEFAULT_SETTINGS.ai.enabled,
      floatingButtonVisible:a?.floatingButtonVisible??DEFAULT_SETTINGS.ai.floatingButtonVisible,
      floatingPanelVisible:a?.floatingPanelVisible??DEFAULT_SETTINGS.ai.floatingPanelVisible,
      buttonSize:Math.max(40,Math.min(88,Number(a?.buttonSize??DEFAULT_SETTINGS.ai.buttonSize))),
      buttonOpacity:Math.max(.25,Math.min(1,Number(a?.buttonOpacity??DEFAULT_SETTINGS.ai.buttonOpacity))),
      panelWidth:Math.max(280,Math.min(620,Number(a?.panelWidth??DEFAULT_SETTINGS.ai.panelWidth))),
      panelHeight:Math.max(300,Math.min(760,Number(a?.panelHeight??DEFAULT_SETTINGS.ai.panelHeight))),
      panelOpacity:Math.max(.35,Math.min(1,Number(a?.panelOpacity??DEFAULT_SETTINGS.ai.panelOpacity))),
      positionLocked:a?.positionLocked??DEFAULT_SETTINGS.ai.positionLocked,
      edgeSnap:a?.edgeSnap??DEFAULT_SETTINGS.ai.edgeSnap,
      statusDotVisible:a?.statusDotVisible??DEFAULT_SETTINGS.ai.statusDotVisible,
      networkSearch:a?.networkSearch??DEFAULT_SETTINGS.ai.networkSearch,
      holdingsNews:a?.holdingsNews??DEFAULT_SETTINGS.ai.holdingsNews,
      proactiveHints:a?.proactiveHints??DEFAULT_SETTINGS.ai.proactiveHints,
      showSources:a?.showSources??DEFAULT_SETTINGS.ai.showSources,
      showDates:a?.showDates??DEFAULT_SETTINGS.ai.showDates,
      useHistory:a?.useHistory??DEFAULT_SETTINGS.ai.useHistory,
      confirmBeforeWrite:a?.confirmBeforeWrite??DEFAULT_SETTINGS.ai.confirmBeforeWrite,
      responseDetail:a?.responseDetail==='concise'||a?.responseDetail==='detailed'?a.responseDetail:'balanced',
      visiblePages:Array.isArray(a?.visiblePages)
        ? Array.from(new Set(a.visiblePages.filter((page):page is 'home'|'ledger'|'portfolio'|'dividend'|'ai'|'settings'=>['home','ledger','portfolio','dividend','ai','settings'].includes(String(page)))))
        : DEFAULT_SETTINGS.ai.visiblePages,
    },
    tradeDefaults:{
      brokerProfileId:String(t?.brokerProfileId??DEFAULT_SETTINGS.tradeDefaults.brokerProfileId),
      accountLabel:String(t?.accountLabel??DEFAULT_SETTINGS.tradeDefaults.accountLabel),
      tradeKind:t?.tradeKind==='sell'?'sell':'buy',
    },
  };
}

type SettingsRuntimeValue=Readonly<{
  hydrated:boolean;
  prefs:SettingsPrefs;
  patchNotifications:(patch:Partial<NotificationPrefs>)=>void;
  patchDisplay:(patch:Partial<DisplayPrefs>)=>void;
  patchAi:(patch:Partial<AiPrefs>)=>void;
  patchTradeDefaults:(patch:Partial<TradeDefaults>)=>void;
  resetPreferences:()=>void;
}>;

const SettingsRuntimeContext=createContext<SettingsRuntimeValue|null>(null);

export function SettingsRuntimeProvider({children}:PropsWithChildren){
  const [prefs,setPrefs]=useState<SettingsPrefs>(DEFAULT_SETTINGS);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw=>{
        if(!alive||!raw)return;
        const parsed=JSON.parse(raw) as Partial<SettingsPrefs>;
        if(parsed.schema===1)setPrefs(normalize(parsed));
      })
      .catch(()=>{})
      .finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(prefs)).catch(()=>{});
  },[hydrated,prefs]);

  const value=useMemo<SettingsRuntimeValue>(()=>({
    hydrated,
    prefs,
    patchNotifications:patch=>setPrefs(current=>normalize({...current,notifications:{...current.notifications,...patch}})),
    patchDisplay:patch=>setPrefs(current=>normalize({...current,display:{...current.display,...patch}})),
    patchAi:patch=>setPrefs(current=>normalize({...current,ai:{...current.ai,...patch}})),
    patchTradeDefaults:patch=>setPrefs(current=>normalize({...current,tradeDefaults:{...current.tradeDefaults,...patch}})),
    resetPreferences:()=>setPrefs(DEFAULT_SETTINGS),
  }),[hydrated,prefs]);

  return <SettingsRuntimeContext.Provider value={value}>{children}</SettingsRuntimeContext.Provider>;
}

export function useSettingsRuntime(){
  const value=useContext(SettingsRuntimeContext);
  if(!value)throw new Error('useSettingsRuntime must be used inside SettingsRuntimeProvider');
  return value;
}

export { DEFAULT_SETTINGS, STORAGE_KEY as SETTINGS_STORAGE_KEY };
