import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MainPageKey } from '../domain/pageRegistry';
import type { DividendCalendarPrefs } from '../dividend/dividendCalendar';
import { normalizeControlPrefs, patchAiPrefs, patchPageTitle, resetLimitedPreferences } from './settingsControlBehavior';
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
export type AiPrefs=Readonly<{enabled:boolean;floatingButton:boolean}>;
export type NavigationPrefs=Readonly<{swipeEnabled:boolean;swipeThreshold:number;swipeEdgeOnly:boolean}>;
export type SettingsPrefs=Readonly<{
  schema:1;
  pageTitles:Partial<Record<MainPageKey,string>>;
  ai:AiPrefs;
  navigation:NavigationPrefs;
  dividendCalendar:DividendCalendarPrefs;
  notifications:NotificationPrefs;
  display:DisplayPrefs;
  tradeDefaults:TradeDefaults;
}>;

const DEFAULT_SETTINGS:SettingsPrefs={
  schema:1,
  pageTitles:{},
  ai:{enabled:true,floatingButton:true},
  navigation:{swipeEnabled:true,swipeThreshold:75,swipeEdgeOnly:false},
  dividendCalendar:{showLastBuyDate:true,showExDate:true,showRecordDate:true,showPaymentDate:true,showStatus:true},
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
  const t=input?.tradeDefaults;
  const controls=normalizeControlPrefs(input);
  const calendar=input?.dividendCalendar;
  const lead=Math.max(0,Math.min(30,Math.floor(Number(n?.leadDays??DEFAULT_SETTINGS.notifications.leadDays))));
  const fontScale=Math.max(0.8,Math.min(1.4,Number(d?.fontScale??DEFAULT_SETTINGS.display.fontScale)));
  const color=(value:unknown,fallback:string)=>typeof value==='string'&&/^#[0-9A-Fa-f]{6}$/.test(value)?value.toUpperCase():fallback;
  return {
    schema:1,
    pageTitles:controls.pageTitles,
    ai:controls.ai,
    navigation:{swipeEnabled:input?.navigation?.swipeEnabled!==false,swipeThreshold:Math.round(Math.max(50,Math.min(150,Number(input?.navigation?.swipeThreshold)||75))),swipeEdgeOnly:input?.navigation?.swipeEdgeOnly===true},
    dividendCalendar:{
      showLastBuyDate:calendar?.showLastBuyDate!==false,
      showExDate:calendar?.showExDate!==false,
      showRecordDate:calendar?.showRecordDate!==false,
      showPaymentDate:calendar?.showPaymentDate!==false,
      showStatus:calendar?.showStatus!==false,
    },
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
  patchTradeDefaults:(patch:Partial<TradeDefaults>)=>void;
  patchPageTitle:(page:MainPageKey,title:string)=>void;
  patchAi:(patch:Partial<AiPrefs>)=>void;
  patchNavigation:(patch:Partial<NavigationPrefs>)=>void;
  patchDividendCalendar:(patch:Partial<DividendCalendarPrefs>)=>void;
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
    patchTradeDefaults:patch=>setPrefs(current=>normalize({...current,tradeDefaults:{...current.tradeDefaults,...patch}})),
    patchPageTitle:(page,title)=>setPrefs(current=>normalize(patchPageTitle(current,page,title))),
    patchAi:patch=>setPrefs(current=>normalize(patchAiPrefs(current,patch))),
    patchNavigation:patch=>setPrefs(current=>normalize({...current,navigation:{...current.navigation,...patch}})),
    patchDividendCalendar:patch=>setPrefs(current=>normalize({...current,dividendCalendar:{...current.dividendCalendar,...patch}})),
    resetPreferences:()=>setPrefs(current=>normalize(resetLimitedPreferences(current,DEFAULT_SETTINGS))),
  }),[hydrated,prefs]);

  return <SettingsRuntimeContext.Provider value={value}>{children}</SettingsRuntimeContext.Provider>;
}

export function useSettingsRuntime(){
  const value=useContext(SettingsRuntimeContext);
  if(!value)throw new Error('useSettingsRuntime must be used inside SettingsRuntimeProvider');
  return value;
}

export { DEFAULT_SETTINGS, STORAGE_KEY as SETTINGS_STORAGE_KEY };
