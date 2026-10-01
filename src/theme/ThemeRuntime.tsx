import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,type PropsWithChildren,useContext,useEffect,useMemo,useState} from 'react';
import {Image} from 'react-native';
import { setNativeAppIcon } from '../native/TfAssetNativeBridge';

export type ThemeKey='sky'|'midnight'|'sand'|'forest'|'violet'|'rose'|'aqua'|'amber'|'ocean'|'slate';
export type ThemeBackgroundMode='fitWidth'|'fitHeight'|'fill';
export type AppIconKey='icon01'|'icon02'|'icon03'|'icon04'|'icon05'|'icon06'|'icon07'|'icon08'|'icon09'|'icon10';

export type ThemePalette=Readonly<{
  key:ThemeKey;
  label:string;
  dark:boolean;
  background:string;
  surface:string;
  surfaceMuted:string;
  border:string;
  primary:string;
  text:string;
  textSecondary:string;
  gain:string;
  loss:string;
  flat:string;
  warning:string;
}>;

export type ThemeSnapshot=Readonly<{
  themeKey:ThemeKey;
  backgroundIndex:number;
  customBackgroundUri:string|null;
  backgroundMode:ThemeBackgroundMode;
  backgroundOpacity:number;
  blurRadius:number;
  maskColor:string;
  maskOpacity:number;
  iconKey:AppIconKey;
}>;

export type ThemePrefs=ThemeSnapshot&Readonly<{
  customSlots:readonly (ThemeSnapshot|null)[];
}>;

const BACKGROUND_ASSETS=[
  require('../assets/theme/background_01.jpg'),
  require('../assets/theme/background_02.jpg'),
  require('../assets/theme/background_03.jpg'),
  require('../assets/theme/background_04.jpg'),
  require('../assets/theme/background_05.jpg'),
  require('../assets/theme/background_06.jpg'),
  require('../assets/theme/background_07.jpg'),
  require('../assets/theme/background_08.jpg'),
  require('../assets/theme/background_09.jpg'),
  require('../assets/theme/background_10.jpg'),
] as const;
const BACKGROUNDS:readonly string[]=BACKGROUND_ASSETS.map(source=>Image.resolveAssetSource(source).uri);

export const THEME_PRESETS:readonly ThemePalette[]=[
 {key:'sky',label:'經典金融',dark:false,background:'#F8FAFC',surface:'#FFFFFF',surfaceMuted:'#EFF6FF',border:'#DBEAFE',primary:'#0066FF',text:'#0F172A',textSecondary:'#64748B',gain:'#EF4444',loss:'#10B981',flat:'#64748B',warning:'#F59E0B'},
 {key:'midnight',label:'極簡清新',dark:true,background:'#08111F',surface:'#FFFFFF',surfaceMuted:'#EFF6FF',border:'#BFDBFE',primary:'#1D4ED8',text:'#0F172A',textSecondary:'#64748B',gain:'#E11D48',loss:'#059669',flat:'#64748B',warning:'#D97706'},
 {key:'sand',label:'科技藍光',dark:false,background:'#FFF7ED',surface:'#FFFBF5',surfaceMuted:'#FFEDD5',border:'#FED7AA',primary:'#EA580C',text:'#431407',textSecondary:'#9A3412',gain:'#DC2626',loss:'#059669',flat:'#78716C',warning:'#D97706'},
 {key:'forest',label:'行情動能',dark:false,background:'#ECFDF5',surface:'#F7FFF9',surfaceMuted:'#D1FAE5',border:'#A7F3D0',primary:'#047857',text:'#064E3B',textSecondary:'#477569',gain:'#DC2626',loss:'#047857',flat:'#6B7280',warning:'#B45309'},
 {key:'violet',label:'股息收益',dark:false,background:'#FAF5FF',surface:'#FFFFFF',surfaceMuted:'#F3E8FF',border:'#E9D5FF',primary:'#7C3AED',text:'#2E1065',textSecondary:'#6B5A80',gain:'#E11D48',loss:'#059669',flat:'#7C7288',warning:'#D97706'},
 {key:'rose',label:'成長動能',dark:false,background:'#FFF1F2',surface:'#FFFFFF',surfaceMuted:'#FFE4E6',border:'#FECDD3',primary:'#E11D48',text:'#4C0519',textSecondary:'#9F1239',gain:'#E11D48',loss:'#059669',flat:'#78716C',warning:'#D97706'},
 {key:'aqua',label:'牛市活力',dark:false,background:'#F0FDFA',surface:'#FFFFFF',surfaceMuted:'#CCFBF1',border:'#99F6E4',primary:'#0F766E',text:'#134E4A',textSecondary:'#52736F',gain:'#DC2626',loss:'#059669',flat:'#64748B',warning:'#D97706'},
 {key:'amber',label:'永續綠能',dark:false,background:'#FFFBEB',surface:'#FFFFFF',surfaceMuted:'#FEF3C7',border:'#FDE68A',primary:'#B45309',text:'#451A03',textSecondary:'#92400E',gain:'#DC2626',loss:'#059669',flat:'#78716C',warning:'#B45309'},
 {key:'ocean',label:'AI 智慧',dark:true,background:'#071A2B',surface:'#FFFFFF',surfaceMuted:'#E0F2FE',border:'#BAE6FD',primary:'#0284C7',text:'#0F172A',textSecondary:'#64748B',gain:'#E11D48',loss:'#059669',flat:'#64748B',warning:'#D97706'},
 {key:'slate',label:'尊榮質感',dark:false,background:'#F8FAFC',surface:'#FFFFFF',surfaceMuted:'#F1F5F9',border:'#CBD5E1',primary:'#475569',text:'#0F172A',textSecondary:'#64748B',gain:'#DC2626',loss:'#059669',flat:'#64748B',warning:'#D97706'}
];

export const APP_ICON_KEYS:readonly AppIconKey[]=['icon01','icon02','icon03','icon04','icon05','icon06','icon07','icon08','icon09','icon10'];
export const APP_ICON_PREVIEWS:readonly string[]=[
  require('../assets/theme/icon_01.jpg'),
  require('../assets/theme/icon_02.jpg'),
  require('../assets/theme/icon_03.jpg'),
  require('../assets/theme/icon_04.jpg'),
  require('../assets/theme/icon_05.jpg'),
  require('../assets/theme/icon_06.jpg'),
  require('../assets/theme/icon_07.jpg'),
  require('../assets/theme/icon_08.jpg'),
  require('../assets/theme/icon_09.jpg'),
  require('../assets/theme/icon_10.jpg'),
].map(source=>Image.resolveAssetSource(source).uri);
export const THEME_BACKGROUNDS=BACKGROUNDS;

const DEFAULT_SNAPSHOT:ThemeSnapshot={
  themeKey:'sky',
  backgroundIndex:0,
  customBackgroundUri:null,
  backgroundMode:'fill',
  backgroundOpacity:.22,
  blurRadius:0,
  maskColor:'#FFFFFF',
  maskOpacity:.08,
  iconKey:'icon01',
};
const DEFAULT_PREFS:ThemePrefs={...DEFAULT_SNAPSHOT,customSlots:[null,null,null,null,null]};

const STORAGE_KEY='@tf-asset/theme-runtime';
const clamp=(v:unknown,min:number,max:number,fallback:number)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
const validTheme=(v:unknown):ThemeKey=>THEME_PRESETS.some(x=>x.key===v)?v as ThemeKey:'sky';
const validIcon=(v:unknown):AppIconKey=>APP_ICON_KEYS.includes(v as AppIconKey)?v as AppIconKey:'icon01';
const validMode=(v:unknown):ThemeBackgroundMode=>v==='fitWidth'||v==='fitHeight'?v:'fill';
const color=(v:unknown,fallback:string)=>typeof v==='string'&&/^#[0-9A-Fa-f]{6}$/.test(v)?v.toUpperCase():fallback;
function normSnapshot(input:Partial<ThemeSnapshot>|null|undefined):ThemeSnapshot{
  return {
    themeKey:validTheme(input?.themeKey),
    backgroundIndex:Math.round(clamp(input?.backgroundIndex,0,BACKGROUNDS.length-1,0)),
    customBackgroundUri:typeof input?.customBackgroundUri==='string'&&input.customBackgroundUri.trim()?input.customBackgroundUri:null,
    backgroundMode:validMode(input?.backgroundMode),
    backgroundOpacity:clamp(input?.backgroundOpacity,0,1,DEFAULT_SNAPSHOT.backgroundOpacity),
    blurRadius:Math.round(clamp(input?.blurRadius,0,24,0)),
    maskColor:color(input?.maskColor,'#FFFFFF'),
    maskOpacity:clamp(input?.maskOpacity,0,.9,DEFAULT_SNAPSHOT.maskOpacity),
    iconKey:validIcon(input?.iconKey),
  };
}
function normalize(input:Partial<ThemePrefs>|null|undefined):ThemePrefs{
  const base=normSnapshot(input);
  const source=Array.isArray(input?.customSlots)?input!.customSlots:[];
  const customSlots=Array.from({length:5},(_,i)=>source[i]?normSnapshot(source[i] as ThemeSnapshot):null);
  return {...base,customSlots};
}

type Value=Readonly<{
  hydrated:boolean;
  prefs:ThemePrefs;
  palette:ThemePalette;
  backgroundUri:string;
  patch:(patch:Partial<ThemeSnapshot>)=>void;
  selectTheme:(key:ThemeKey)=>void;
  selectBackground:(index:number)=>void;
  saveSlot:(index:number)=>void;
  applySlot:(index:number)=>void;
  clearSlot:(index:number)=>void;
  reset:()=>void;
}>;

const Context=createContext<Value|null>(null);
export function ThemeRuntimeProvider({children}:PropsWithChildren){
  const [prefs,setPrefs]=useState<ThemePrefs>(DEFAULT_PREFS);
  const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{let alive=true;AsyncStorage.getItem(STORAGE_KEY).then(raw=>{if(alive&&raw)setPrefs(normalize(JSON.parse(raw) as Partial<ThemePrefs>));}).catch(()=>{}).finally(()=>{if(alive)setHydrated(true);});return()=>{alive=false;};},[]);
  useEffect(()=>{if(hydrated)AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(prefs)).catch(()=>{});},[hydrated,prefs]);
  useEffect(()=>{
    if(!hydrated)return;
    void setNativeAppIcon(prefs.iconKey).catch(()=>{});
  },[hydrated,prefs.iconKey]);
  const value=useMemo<Value>(()=>{
    const palette=THEME_PRESETS.find(x=>x.key===prefs.themeKey)??THEME_PRESETS[0]!;
     return {
      hydrated,prefs,palette,backgroundUri:prefs.customBackgroundUri??BACKGROUNDS[prefs.backgroundIndex]!,
      patch:patch=>setPrefs(current=>normalize({...current,...patch,customSlots:current.customSlots})),
      selectTheme:themeKey=>setPrefs(current=>normalize({...current,themeKey,customSlots:current.customSlots})),
      selectBackground:backgroundIndex=>setPrefs(current=>normalize({...current,backgroundIndex,customBackgroundUri:null,customSlots:current.customSlots})),
      saveSlot:index=>setPrefs(current=>{if(index<0||index>=5)return current;const slots=[...current.customSlots];slots[index]={themeKey:current.themeKey,backgroundIndex:current.backgroundIndex,customBackgroundUri:current.customBackgroundUri,backgroundMode:current.backgroundMode,backgroundOpacity:current.backgroundOpacity,blurRadius:current.blurRadius,maskColor:current.maskColor,maskOpacity:current.maskOpacity,iconKey:current.iconKey};return {...current,customSlots:slots};}),
      applySlot:index=>setPrefs(current=>{const slot=current.customSlots[index];return slot?normalize({...slot,customSlots:current.customSlots}):current;}),
      clearSlot:index=>setPrefs(current=>{if(index<0||index>=5)return current;const slots=[...current.customSlots];slots[index]=null;return {...current,customSlots:slots};}),
      reset:()=>setPrefs(DEFAULT_PREFS),
    };
  },[hydrated,prefs]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useThemeRuntime(){const value=useContext(Context);if(!value)throw new Error('useThemeRuntime must be used inside ThemeRuntimeProvider');return value;}
export {DEFAULT_PREFS as DEFAULT_THEME_PREFS,STORAGE_KEY as THEME_STORAGE_KEY};
