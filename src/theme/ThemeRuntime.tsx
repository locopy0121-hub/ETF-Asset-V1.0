import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,type PropsWithChildren,useContext,useEffect,useMemo,useState} from 'react';

export type ThemeId='finance-blue'|'deep-sea'|'forest'|'sunrise'|'amethyst'|'glacier'|'mist'|'copper'|'neon'|'black-gold';
export type ThemeFit='fit-width'|'fit-height'|'fill';
export type ThemePalette=Readonly<{
  background:string;surface:string;surfaceMuted:string;primary:string;primaryPressed:string;
  text:string;textSecondary:string;border:string;gain:string;loss:string;flat:string;warning:string;
}>;
export type ThemeBackground=Readonly<{
  source:'builtin'|'custom';
  builtinId:string;
  customUri:string|null;
  fit:ThemeFit;
  opacity:number;
  blurRadius:number;
  maskOpacity:number;
}>;
export type CustomThemeSlot=Readonly<{
  slot:1|2|3|4|5;
  saved:boolean;
  name:string;
  palette:ThemePalette;
  appIconId:string;
  background:ThemeBackground;
}>;
export type ThemeState=Readonly<{
  selectedThemeId:ThemeId;
  palette:ThemePalette;
  appIconId:string;
  background:ThemeBackground;
  customSlots:readonly CustomThemeSlot[];
}>;

export type ThemePreset=Readonly<{id:ThemeId;name:string;iconId:string;backgroundId:string;palette:ThemePalette}>;
export type BuiltinBackground=Readonly<{id:string;name:string;uri:string}>;
export type AppIconOption=Readonly<{id:string;name:string;primary:string;background:string}>;

const png=(value:string)=>'data:image/png;base64,'+value;
export const BUILTIN_BACKGROUNDS:readonly BuiltinBackground[]=[
  {id:'bg-01',name:'金融藍光',uri:png('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAUElEQVR42oXQMQpAMQgD0OhgIB7z33/9c4e2dDObyCMGo79fRFeIUEUTb9hLIq3oirTiJM1CFWlFE2mFKtIKEWnFPTeKU3wW9wWj6F18FiIW1XQLJ7aR33AAAAAASUVORK5CYII=')},
  {id:'bg-02',name:'深海科技',uri:png('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAATklEQVR42oXOsQ3AMAwDQYpPZI7M4f0HS6MAbmx1LA7g1/MukYJyRHoTEbm3RyHiUQg8inI8iq3pLP6mqxB4FH13F0U8CnlvOoit6SyKfB8HBGjnVbSCAAAAAElFTkSuQmCC')},
  {id:'bg-03',name:'森林晨霧',uri:png('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAR0lEQVR42oXOoRGAAAADsaPivwOwBtOw/y4I0NRH5Djvq6iIlaIqVAuqmCkKmaKaKYRMod/pT7ynIdRMUcwUSqYoZopKphAf96IMJLUdzNAAAAAASUVORK5CYII=')},
  {id:'bg-04',name:'暖橙晨曦',uri:png('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAT0lEQVR42oXQsQ3AQAgEQZk//VLFN+Ra3aMTI5MA2QUjseJ67iNYuECbfxN7Y6MQ2CgWbqMQ2ChEbipEaqpFNLXiO9eL9KdaRFMrFm6jELyL7AsnlaPZqwAAAABJRU5ErkJggg==')},
  {id:'bg-05',name:'紫晶夜色',uri:png('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAR0lEQVR42oXOsQnAMBQDUSy4WyWDZCbv7yL5rdUJ8UBa77MVUEH8w9ehIqlCSBVqqkBShZAqmLmbUFKFmCrm+FUoqQJMFcoBmMQKQh8/i5QAAAAASUVORK5CYII=')},
  {id:'bg-06',name:'冰川藍白',uri:png('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAT0lEQVR42oXOwQmAQBBDURySMCnGEu3FUj0oK+iyueXw4Gfbj9NCkxbGaMJ6R0VhoaJooqKwUFFYrCie3Frcx4NosqIYx1fin5uIT24uLFxEcAvEdI9m5wAAAABJRU5ErkJggg==')},
  {id:'bg-07',name:'霧灰極簡',uri:png('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAS0lEQVR42oXOsQ3AIBBDUcXFfU+WMgOw/yBpggQR4KuueLL+dT8NMEW//28UBaAoTCkKQFF86CxWTV4MK4q5aSOGpr3oTUdhSlEAL9bdDM3yMleJAAAAAElFTkSuQmCC')},
  {id:'bg-08',name:'曜石紅銅',uri:png('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAT0lEQVR42oXQwQ2AMAxDUeW73oADY7H/NBygKEJtcvPhybIc13lYWHjwBkXKeEArLHph0YvZVIoPVeIZ3ggraEXetBUJ7cU8sxS/n9bC4gbQ0wY/X4fL9wAAAABJRU5ErkJggg==')},
  {id:'bg-09',name:'星夜霓虹',uri:png('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAATUlEQVR42o3OMQ6AQAwDQWV9ruEj/P97FIDEoeRC52Ikb2z7IQxWDOFkY1qhGPwQphX33VoUTbPImhLxacrE3FSIV1MtnqZGXHdLIXwCDt8FkcNYq8QAAAAASUVORK5CYII=')},
  {id:'bg-10',name:'曜石黑金',uri:png('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAATElEQVR42oXQOwrEUABCURT8bOHtf6MpQkKaGVs5hVyccyLUrBAjYo2KMd6dU0TgFDG3qMApanCKiFvE4BQVt7g/DfHp9Fs8nf6KCheAAQhjk0Ve3wAAAABJRU5ErkJggg==')},
];

export const APP_ICON_OPTIONS:readonly AppIconOption[]=[
  {id:'icon-01',name:'金融藍',primary:'#0B63F6',background:'#FFFFFF'},
  {id:'icon-02',name:'深海藍',primary:'#38BDF8',background:'#06203A'},
  {id:'icon-03',name:'森林綠',primary:'#16A36A',background:'#ECFDF5'},
  {id:'icon-04',name:'晨曦橙',primary:'#F97316',background:'#FFF7ED'},
  {id:'icon-05',name:'紫晶',primary:'#8B5CF6',background:'#1E1B4B'},
  {id:'icon-06',name:'冰川',primary:'#0EA5E9',background:'#F0F9FF'},
  {id:'icon-07',name:'霧灰',primary:'#475569',background:'#F8FAFC'},
  {id:'icon-08',name:'紅銅',primary:'#B4533C',background:'#24100D'},
  {id:'icon-09',name:'霓虹',primary:'#A855F7',background:'#0F102D'},
  {id:'icon-10',name:'黑金',primary:'#D4A72C',background:'#171717'},
];

const p=(background:string,surface:string,surfaceMuted:string,primary:string,primaryPressed:string,text:string,textSecondary:string,border:string,gain='#EF4444',loss='#10B981',flat='#C58B00',warning='#C77B00'):ThemePalette=>({
  background,surface,surfaceMuted,primary,primaryPressed,text,textSecondary,border,gain,loss,flat,warning,
});
export const BUILTIN_THEMES:readonly ThemePreset[]=[
  {id:'finance-blue',name:'經典金融藍',iconId:'icon-01',backgroundId:'bg-01',palette:p('#F6F8FC','#FFFFFF','#EEF4FF','#0B63F6','#084CC0','#122033','#66758A','#D9E2F0')},
  {id:'deep-sea',name:'深海科技藍',iconId:'icon-02',backgroundId:'bg-02',palette:p('#061A2B','#0A263D','#103451','#38BDF8','#0284C7','#F8FAFC','#A8C1D8','#1E4B68')},
  {id:'forest',name:'森林護眼綠',iconId:'icon-03',backgroundId:'bg-03',palette:p('#F4FAF5','#FFFFFF','#E8F5EA','#16835B','#0F6848','#173B2C','#5F7D6E','#CEE2D4')},
  {id:'sunrise',name:'晨曦暖橙',iconId:'icon-04',backgroundId:'bg-04',palette:p('#FFF8F1','#FFFFFF','#FFF0E3','#E86A17','#B94D0F','#4A2A17','#8A644B','#F0D8C5')},
  {id:'amethyst',name:'紫晶夜色',iconId:'icon-05',backgroundId:'bg-05',palette:p('#171329','#211A3A','#2D244D','#A78BFA','#7C3AED','#F5F3FF','#C4B5D8','#4A3B69')},
  {id:'glacier',name:'冰川藍白',iconId:'icon-06',backgroundId:'bg-06',palette:p('#F1FAFD','#FFFFFF','#E3F5FB','#0EA5E9','#0284C7','#143445','#668493','#CBE5EF')},
  {id:'mist',name:'霧灰極簡',iconId:'icon-07',backgroundId:'bg-07',palette:p('#F5F6F8','#FFFFFF','#EEF0F3','#475569','#334155','#1F2937','#6B7280','#D8DCE2')},
  {id:'copper',name:'曜石紅銅',iconId:'icon-08',backgroundId:'bg-08',palette:p('#1D1311','#2A1A17','#38211D','#C26446','#97452F','#FFF7F3','#D7B5A8','#5A332A')},
  {id:'neon',name:'星夜霓虹',iconId:'icon-09',backgroundId:'bg-09',palette:p('#0D0E25','#171832','#23234B','#A855F7','#7E22CE','#F8F4FF','#C7B5D8','#393968')},
  {id:'black-gold',name:'曜石黑金',iconId:'icon-10',backgroundId:'bg-10',palette:p('#151515','#1D1D1D','#282828','#D4A72C','#A67E13','#FFF9E8','#C8B98D','#454033')},
];

const defaultBackground=(id='bg-01'):ThemeBackground=>({source:'builtin',builtinId:id,customUri:null,fit:'fill',opacity:.22,blurRadius:0,maskOpacity:0});
const initialPreset=BUILTIN_THEMES[0]!;
const emptySlots=():CustomThemeSlot[]=>[1,2,3,4,5].map(slot=>({
  slot:slot as 1|2|3|4|5,saved:false,name:'自訂主題 '+slot,palette:initialPreset.palette,appIconId:initialPreset.iconId,background:defaultBackground(initialPreset.backgroundId),
}));
export const DEFAULT_THEME_STATE:ThemeState={
  selectedThemeId:initialPreset.id,palette:initialPreset.palette,appIconId:initialPreset.iconId,background:defaultBackground(initialPreset.backgroundId),customSlots:emptySlots(),
};
const STORAGE_KEY='@tf-asset/theme-runtime-v1';
const color=(v:unknown,fallback:string)=>typeof v==='string'&&/^#[0-9A-Fa-f]{6}$/.test(v)?v.toUpperCase():fallback;
const clamp=(n:unknown,min:number,max:number,fallback:number)=>{const v=Number(n);return Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;};
const normalizePalette=(v:Partial<ThemePalette>|null|undefined,f:ThemePalette):ThemePalette=>({
  background:color(v?.background,f.background),surface:color(v?.surface,f.surface),surfaceMuted:color(v?.surfaceMuted,f.surfaceMuted),
  primary:color(v?.primary,f.primary),primaryPressed:color(v?.primaryPressed,f.primaryPressed),text:color(v?.text,f.text),
  textSecondary:color(v?.textSecondary,f.textSecondary),border:color(v?.border,f.border),gain:color(v?.gain,f.gain),
  loss:color(v?.loss,f.loss),flat:color(v?.flat,f.flat),warning:color(v?.warning,f.warning),
});
const normalizeBackground=(v:Partial<ThemeBackground>|null|undefined,f:ThemeBackground):ThemeBackground=>({
  source:v?.source==='custom'?'custom':'builtin',
  builtinId:BUILTIN_BACKGROUNDS.some(x=>x.id===v?.builtinId)?String(v?.builtinId):f.builtinId,
  customUri:typeof v?.customUri==='string'&&v.customUri.trim()?v.customUri:null,
  fit:v?.fit==='fit-width'||v?.fit==='fit-height'?v.fit:'fill',
  opacity:clamp(v?.opacity,0,1,f.opacity),blurRadius:clamp(v?.blurRadius,0,30,f.blurRadius),maskOpacity:clamp(v?.maskOpacity,0,.9,f.maskOpacity),
});
function normalize(input:Partial<ThemeState>|null|undefined):ThemeState{
  const preset=BUILTIN_THEMES.find(x=>x.id===input?.selectedThemeId)??initialPreset;
  const bg=defaultBackground(preset.backgroundId);
  const slots=emptySlots().map((fallback,index)=>{
    const src=Array.isArray(input?.customSlots)?input?.customSlots[index] as Partial<CustomThemeSlot>|undefined:undefined;
    return {...fallback,saved:src?.saved===true,name:typeof src?.name==='string'&&src.name.trim()?src.name.trim().slice(0,24):fallback.name,
      palette:normalizePalette(src?.palette,preset.palette),appIconId:APP_ICON_OPTIONS.some(x=>x.id===src?.appIconId)?String(src?.appIconId):fallback.appIconId,
      background:normalizeBackground(src?.background,bg)};
  });
  return {
    selectedThemeId:preset.id,palette:normalizePalette(input?.palette,preset.palette),
    appIconId:APP_ICON_OPTIONS.some(x=>x.id===input?.appIconId)?String(input?.appIconId):preset.iconId,
    background:normalizeBackground(input?.background,bg),customSlots:slots,
  };
}

type ThemeRuntimeValue=Readonly<{
  hydrated:boolean;state:ThemeState;activeThemeName:string;backgroundUri:string|null;
  applyPreset:(id:ThemeId)=>void;patchPalette:(patch:Partial<ThemePalette>)=>void;setAppIconId:(id:string)=>void;
  patchBackground:(patch:Partial<ThemeBackground>)=>void;setCustomBackgroundUri:(uri:string|null)=>void;
  saveCustomSlot:(slot:1|2|3|4|5)=>void;applyCustomSlot:(slot:1|2|3|4|5)=>void;resetTheme:()=>void;
}>;
const Context=createContext<ThemeRuntimeValue|null>(null);
export function ThemeRuntimeProvider({children}:PropsWithChildren){
  const [state,setState]=useState<ThemeState>(DEFAULT_THEME_STATE);
  const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{let alive=true;AsyncStorage.getItem(STORAGE_KEY).then(raw=>{if(alive&&raw)setState(normalize(JSON.parse(raw) as Partial<ThemeState>));}).catch(()=>{}).finally(()=>{if(alive)setHydrated(true);});return()=>{alive=false;};},[]);
  useEffect(()=>{if(hydrated)AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(state)).catch(()=>{});},[hydrated,state]);
  const value=useMemo<ThemeRuntimeValue>(()=>{
    const active=BUILTIN_THEMES.find(x=>x.id===state.selectedThemeId)??initialPreset;
    const backgroundUri=state.background.source==='custom'
      ?state.background.customUri
      :BUILTIN_BACKGROUNDS.find(x=>x.id===state.background.builtinId)?.uri??null;
    return {
      hydrated,state,activeThemeName:active.name,backgroundUri,
      applyPreset:id=>setState(current=>{const preset=BUILTIN_THEMES.find(x=>x.id===id)??initialPreset;return {...current,selectedThemeId:preset.id,palette:preset.palette,appIconId:preset.iconId,background:{...current.background,source:'builtin',builtinId:preset.backgroundId,customUri:null}};}),
      patchPalette:patch=>setState(current=>({...current,palette:normalizePalette({...current.palette,...patch},current.palette)})),
      setAppIconId:id=>setState(current=>({...current,appIconId:APP_ICON_OPTIONS.some(x=>x.id===id)?id:current.appIconId})),
      patchBackground:patch=>setState(current=>({...current,background:normalizeBackground({...current.background,...patch},current.background)})),
      setCustomBackgroundUri:uri=>setState(current=>({...current,background:{...current.background,source:uri?'custom':'builtin',customUri:uri}})),
      saveCustomSlot:slot=>setState(current=>({...current,customSlots:current.customSlots.map(item=>item.slot===slot?{slot,saved:true,name:'自訂主題 '+slot,palette:current.palette,appIconId:current.appIconId,background:current.background}:item)})),
      applyCustomSlot:slot=>setState(current=>{const item=current.customSlots.find(x=>x.slot===slot);return !item?.saved?current:{...current,palette:item.palette,appIconId:item.appIconId,background:item.background};}),
      resetTheme:()=>setState(DEFAULT_THEME_STATE),
    };
  },[hydrated,state]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useThemeRuntime(){const value=useContext(Context);if(!value)throw new Error('useThemeRuntime must be inside ThemeRuntimeProvider');return value;}
