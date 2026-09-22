import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,type PropsWithChildren,useContext,useEffect,useMemo,useState} from 'react';

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

const BACKGROUNDS:readonly string[]=[
'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAkklEQVR42u3VMQqAMAxG4TQn6AV6/0M5ujk5ikhxUKgWs9Z/eE4OUR6l5EvTUkuuFjzz6tfLsBl/Tkd/GTnjUXX35bCZtO2HTs19Qjo1JVeXqulP6PeaV5BCTQsSqfneQ/9uAZeq6S+1woZ0qZp2Qjp6YBmWYRmWYRmWYRmWYRmWYRmWYRmWYRmWYRmWYVk4Y2Yn4OtLHHTGbiQAAAAASUVORK5CYII=',
'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAfklEQVR42u2VsQ3AIAwEwUpPmQHSMRWjZTGGYIMU6QCjNA4uzpWx3tIXjy+mMwdPJcFZuTN0dO90lbdp9dZ2TDUyVXT9nxpZbG6ZEOrvhsb0bZmIptN+h7UmcqkxBMtgGSyDZbCMS40hWAbLYBksg2VcagzBMlhGqGEZLDOsB5AY8fQTyEmYAAAAAElFTkSuQmCC',
'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAABsElEQVR42u1ZSW7DMAyMCD0kf+lv8we/I1d/IOfc4h5sOIwWerioNdAKOQQRRU65jCg2Lc/H5XMt87R+Sdevy7DVs0K/gobr3y1uv3MPrXs4lEJX0x6oZJd/A8LRCDhsyLjpDRCCpsYhyKuEOYC0PB9aNKr0wg9uMF73G/63mjMdVLLME+HF6ak7flxOQRIgh1PAIaYth5BqHMGKTeVtQE4K0JY6X9lGM7IMHutlngqZbCC0w5LZBWp7/GDbu0XI5GBp0/xQvjZHIwKBl1W9S2CwzBQgY6q1kU37uFOEZI+fk9azgpP2rewhsXaHJZaVUHeWkCGEpOqWuoBsQXk3MexjwMRPkTlevS08XSJDJnvU5qeYHApf/4D+CiA5bT3MTlGUH3UFZRWv924D5x3MgXpzqEeM5pVxN8g06L+kyxxyUn7UFUQGvf6OQFdlcq+pxST3vrU2wrPBgAnsxPlu6s0YQ95liJ5CINmGnqCTEA3HL9fem9LzuFHQ2OmmH6/77cfmQ4hOksdHIQ8J1VOf8FxxMjVKAaebwp5xTh0yxvNMGhqTfFupj/1fx7hSVxXdN4fWvcRATchPAAAAAElFTkSuQmCC',
'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAlklEQVR42u3VsQ2AIBBGYbiSPRjFWR3CJexdwc5oZ2KhCUq8Fv7iWVmc5oWQ++K4zUPKwXmmY7lfms3Ye9r7S8sZ86qrL5vNxPXcdWqeE9KpGVI2qZr6hLrXfIIUakqQSM3/Huq7BUyqpr7UChvSpGrKCenogWVYhmVYhmVYhmVYhmVYhmVYhmVYhmVYhmVYhmXuTAjhAiCkUmCKpAJ6AAAAAElFTkSuQmCC',
'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAe0lEQVR42u3VsQ2AMAxEUWKxABuw/1RsQEVDAw1VIIgmJMVz5Vhn6YqLf9q3Y+ipYuisujM0Zu91uZppLu5U1cSjIuv/1MTLZpOJUH83dE9fk0mUdKXfUVuTXGqGsAzLsAzLsMylZgjLsAzLsAzLXGqGsAzLhBrLsKxinQ/Arwraq2/UAAAAAElFTkSuQmCC',
'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAABsElEQVR42u1ZOXLDMAw0MfyHm/z/J67cqtET7AdYKaSRYR7Q4mCimYTjwmOCwAbHEkTS8nhePtcyzeuX9HW9DFs9K/QraLj+3eL2O/fQuodDKXQ17YFKdvk3IByNgMOGjJveACFoahyCvEqYA0jL46lFo0ov/OAG43W/63mjMdVLLME+HF6ak7flxOQRIgh1PAIaYth5BqHMGKTeVtQE4K0JY6X9lGM7IMHutlngqZbCC0w5LZBWp7/GDbu0XI5GBp0/xQvjZHIwKBl1W9S2CwzBQgY6q1kU37uFOEZI+fk9azgpP2rewhsXaHJZaVUHeWkCGEpOqWuoBsQXk3MexjwMRPkTlevS08XSJDJnvU5qeYHApf/4D+CiA5bT3MTlGUH3UFZRWv924D5x3MgXpzqEeM5pVxN8g06L+kyxxyUn7UFUQGvf6OQFdlcq+pxST3vrU2wrPBgAnsxPlu6s0YQ95liJ5CINmGnqCTEA3HL9fem9LzuFHQ2OmmH6/77cfmQ4hOksdHIQ8J1VOf8FxxMjVKAaebwp5xTh0yxvNMGhqTfFupj/1fx7hSVxXdN4fWvcRATchPAAAAAElFTkSuQmCC',
'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAlUlEQVR42u3VsQmAMBBG4eSabJDVnM0R3MvKykpQECwUosFrk794VhanPEK4L47bPKQcnGfal/ul2Yy9p72/tJwxr7r6stlMXM9Dp+Y5IZ2aIWWTqqlPqHvNJ0ihpgSJ1Pzvob5bwKRq6kutsCFNqqackI4eWIZlWIZlWIZlWIZlWIZlWIZlWIZlWIZlWIZlWObOhBAuOiJSjY30ogoAAAAASUVORK5CYII=',
'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAe0lEQVR42u3VMQ6AIBBEUSBewQN6Mg/IEUzUxgrF2CAUbyvYzCZTzO6Px5bDSJXCYDWcoan473m9nM5LbaapJj0qivefmvQy2aUj1N8N3dPXpZNqutp2tNZEl5ohLMMyLMMyLHOpGcIyLMMyLMMyl5ohLMMyocYyLGtYJzXI/t3a/B+yAAAAAElFTkSuQmCC',
'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAABrElEQVR42u1ZOXLDMAw0MfpFPpH/N/6Ceteq3bm0UkhDIzygxUFHMzHHlYljjWNJwun+WC+/17zs33x/pcuw1fNCf4KG288et5V4hLY9HEphq+kPNJLlX4BwNAIOGzLuegeEoKlxCPIqYQ4g3R+rFo2qvHDFTTJdb0/8t5orHTQyLyvhzenpO64ulyAJkMMp4BDTXkNIN45gxabxNiAnBWhbna/JRjOyDJ7reVkLmclAaIctkwVqf1yx+avKlMnJ0pb5oXztjkYkAm+repfAZJkpQMZUWyOb9XFahFSPn5M2XSFIeWvykFgzF3JbCX1nSRlCSKrbUheQLSlZi38MmLgWmfPV28LLJTJlckRtcYqpofD1AfRfAMll62F2iqL8qCNoUvF67zRwnsEcqLeGesRoXhMeBpkG/Yd0WUNOyo86gshg138j0HWZfNfUYpLvvrU1wqvBgAm8ifPd1JsxhrzLEDuFQLINPcEgIRaOX669N6XncYMjPt/043p7vm0+hNgkeXwU8pBQPfUJrxUnU4PxPt8U9oxz6pAxnmfS0Jjk21p97H8d41pd1XQ/WQ69vh/MyscAAAAASUVORK5CYII=',
'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAlUlEQVR42u3VIQ6AMBAF0XavUV3J/Q+BJCgUgjsQgkBAUmhY234xKMRCJk2zL47zOuQUnGdatvul2Yy9p72/tJwxr7r6stlM3I9Tp+Y5IZ2aISeTqqlPqHvNJ0ihpgSJ1Pzvob5bwKRq6kutsCFNqqackI4eWIZlWIZlWIZlWIZlWIZlWIZlWIZlWIZlWIZlWObOhBAu1lxTBEpSgHoAAAAASUVORK5CYII='
];

export const THEME_PRESETS:readonly ThemePalette[]=[
 {key:'sky',label:'晴空藍',dark:false,background:'#F8FAFC',surface:'#FFFFFF',surfaceMuted:'#EFF6FF',border:'#DBEAFE',primary:'#0066FF',text:'#0F172A',textSecondary:'#64748B',gain:'#EF4444',loss:'#10B981',flat:'#64748B',warning:'#F59E0B'},
 {key:'midnight',label:'午夜藍',dark:false,background:'#08111F',surface:'#FFFFFF',surfaceMuted:'#EFF6FF',border:'#BFDBFE',primary:'#1D4ED8',text:'#0F172A',textSecondary:'#64748B',gain:'#E11D48',loss:'#059669',flat:'#64748B',warning:'#D97706'},
 {key:'sand',label:'暖沙',dark:false,background:'#FFF7ED',surface:'#FFFBF5',surfaceMuted:'#FFEDD5',border:'#FED7AA',primary:'#EA580C',text:'#431407',textSecondary:'#9A3412',gain:'#DC2626',loss:'#059669',flat:'#78716C',warning:'#D97706'},
 {key:'forest',label:'森林',dark:false,background:'#ECFDF5',surface:'#F7FFF9',surfaceMuted:'#D1FAE5',border:'#A7F3D0',primary:'#047857',text:'#064E3B',textSecondary:'#477569',gain:'#DC2626',loss:'#047857',flat:'#6B7280',warning:'#B45309'},
 {key:'violet',label:'紫晶',dark:false,background:'#FAF5FF',surface:'#FFFFFF',surfaceMuted:'#F3E8FF',border:'#E9D5FF',primary:'#7C3AED',text:'#2E1065',textSecondary:'#6B5A80',gain:'#E11D48',loss:'#059669',flat:'#7C7288',warning:'#D97706'},
 {key:'rose',label:'玫瑰',dark:false,background:'#FFF1F2',surface:'#FFFFFF',surfaceMuted:'#FFE4E6',border:'#FECDD3',primary:'#E11D48',text:'#4C0519',textSecondary:'#9F1239',gain:'#E11D48',loss:'#059669',flat:'#78716C',warning:'#D97706'},
 {key:'aqua',label:'青瓷',dark:false,background:'#F0FDFA',surface:'#FFFFFF',surfaceMuted:'#CCFBF1',border:'#99F6E4',primary:'#0F766E',text:'#134E4A',textSecondary:'#52736F',gain:'#DC2626',loss:'#059669',flat:'#64748B',warning:'#D97706'},
 {key:'amber',label:'琥珀',dark:false,background:'#FFFBEB',surface:'#FFFFFF',surfaceMuted:'#FEF3C7',border:'#FDE68A',primary:'#B45309',text:'#451A03',textSecondary:'#92400E',gain:'#DC2626',loss:'#059669',flat:'#78716C',warning:'#B45309'},
 {key:'ocean',label:'深海',dark:false,background:'#071A2B',surface:'#FFFFFF',surfaceMuted:'#E0F2FE',border:'#BAE6FD',primary:'#0284C7',text:'#0F172A',textSecondary:'#64748B',gain:'#E11D48',loss:'#059669',flat:'#64748B',warning:'#D97706'},
 {key:'slate',label:'霧銀',dark:false,background:'#F8FAFC',surface:'#FFFFFF',surfaceMuted:'#F1F5F9',border:'#CBD5E1',primary:'#475569',text:'#0F172A',textSecondary:'#64748B',gain:'#DC2626',loss:'#059669',flat:'#64748B',warning:'#D97706'}
];

export const APP_ICON_KEYS:readonly AppIconKey[]=['icon01','icon02','icon03','icon04','icon05','icon06','icon07','icon08','icon09','icon10'];
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
