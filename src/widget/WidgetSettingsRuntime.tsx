import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  DEFAULT_WIDGET_CONFIG,
  DEFAULT_WIDGET_EFFECTS,
  DEFAULT_WIDGET_FIELD_STYLES,
  DEFAULT_WIDGET_SORT,
  DEFAULT_WIDGET_STYLE,
  WIDGET_FIELDS,
  type WidgetConfig,
  type WidgetEffect,
  type WidgetField,
  type WidgetFieldStyle,
  type WidgetSortKey,
  type WidgetTemplate,
} from './widgetDomain';
import {
  DEFAULT_ITEM_EFFECT,
  ITEM_EFFECT_INTENSITIES,
  ITEM_EFFECT_KINDS,
  ITEM_EFFECT_SPEEDS,
  ITEM_EFFECT_TRIGGERS,
  type ItemEffectConfig,
} from '../domain/displayItemContract';

const STORAGE_KEY='@tf-asset/widget-settings';
const VALID_FIELDS:readonly WidgetField[]=WIDGET_FIELDS;
const VALID_TEMPLATES:readonly WidgetTemplate[]=['asset-summary','quote-summary','compact','advanced','minimal','transparent','quote-wall'];
const VALID_EFFECTS:readonly WidgetEffect[]=['none','fade','pulse','flash-on-change'];
const VALID_SORTS:readonly WidgetSortKey[]=['manual','symbol','price','changePercent'];
const clamp=(value:unknown,min:number,max:number,fallback:number)=>{
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
};
const color=(value:unknown,fallback:string)=>typeof value==='string'&&/^#[0-9A-Fa-f]{6}$/.test(value)?value:fallback;
const uniqueStrings=(value:unknown)=>Array.isArray(value)?Array.from(new Set(value.map(x=>String(x).trim().toUpperCase()).filter(Boolean))):[];
const nullableColor=(value:unknown)=>value==null?null:typeof value==='string'&&/^#[0-9A-Fa-f]{6}$/.test(value)?value.toUpperCase():null;
const normItemEffect=(effect:Partial<ItemEffectConfig>|undefined):ItemEffectConfig=>({
  kind:ITEM_EFFECT_KINDS.includes(effect?.kind as ItemEffectConfig['kind'])?effect!.kind as ItemEffectConfig['kind']:DEFAULT_ITEM_EFFECT.kind,
  trigger:ITEM_EFFECT_TRIGGERS.includes(effect?.trigger as ItemEffectConfig['trigger'])?effect!.trigger as ItemEffectConfig['trigger']:DEFAULT_ITEM_EFFECT.trigger,
  speed:ITEM_EFFECT_SPEEDS.includes(effect?.speed as ItemEffectConfig['speed'])?effect!.speed as ItemEffectConfig['speed']:DEFAULT_ITEM_EFFECT.speed,
  intensity:ITEM_EFFECT_INTENSITIES.includes(effect?.intensity as ItemEffectConfig['intensity'])?effect!.intensity as ItemEffectConfig['intensity']:DEFAULT_ITEM_EFFECT.intensity,
});
const normFieldStyles=(styles:readonly Partial<WidgetFieldStyle>[]|undefined,legacyProfit:readonly WidgetField[]|undefined):readonly WidgetFieldStyle[]=>{
  const input=Array.isArray(styles)?styles:[];
  const byField=new Map(input.map(item=>[item.field,item]));
  return DEFAULT_WIDGET_FIELD_STYLES.map(fallback=>{
    const item=byField.get(fallback.field);
    const visual=item?.visual;
    return {
      field:fallback.field,
      label:typeof item?.label==='string'&&item.label.trim()?item.label.trim().slice(0,16):fallback.label,
      visual:{
        fontScale:clamp(visual?.fontScale,.7,2,fallback.visual.fontScale),
        textColor:nullableColor(visual?.textColor),
        backgroundColor:nullableColor(visual?.backgroundColor),
        textAlign:visual?.textAlign==='left'||visual?.textAlign==='center'||visual?.textAlign==='right'?visual.textAlign:null,
        lineGap:visual?.lineGap==null?null:clamp(visual.lineGap,0,32,0),
        paddingY:clamp(visual?.paddingY,0,16,fallback.visual.paddingY),
        useProfitColor:visual?.useProfitColor??legacyProfit?.includes(fallback.field)??fallback.visual.useProfitColor,
        effect:normItemEffect(visual?.effect),
      },
    };
  });
};

function normalize(input:Partial<WidgetConfig>|null|undefined):WidgetConfig{
  const size=input?.size==='small'||input?.size==='medium'||input?.size==='large'?input.size:'2x2';
  const template=VALID_TEMPLATES.includes(input?.template as WidgetTemplate)?input!.template as WidgetTemplate:'asset-summary';
  const style=input?.style;
  const effects=input?.effects;
  const sort=input?.sort;
  const fields=Array.isArray(input?.fields)
    ? input.fields.filter((x):x is WidgetField=>VALID_FIELDS.includes(x as WidgetField))
    : [...DEFAULT_WIDGET_CONFIG.fields];
  const legacyProfit=Array.isArray(input?.profitColorFields)?input!.profitColorFields.filter((x):x is WidgetField=>VALID_FIELDS.includes(x as WidgetField)):[...DEFAULT_WIDGET_CONFIG.profitColorFields];
  const fieldStyles=normFieldStyles(input?.fieldStyles,legacyProfit);
  return {
    enabled:input?.enabled??DEFAULT_WIDGET_CONFIG.enabled,
    size,
    template,
    fields:fields.length?fields:[...DEFAULT_WIDGET_CONFIG.fields],
    fieldStyles,
    style:{
      fontScale:clamp(style?.fontScale,0.7,1.8,DEFAULT_WIDGET_STYLE.fontScale),
      titleFontScale:clamp(style?.titleFontScale,0.7,1.8,DEFAULT_WIDGET_STYLE.titleFontScale),
      valueFontScale:clamp(style?.valueFontScale,0.7,2,DEFAULT_WIDGET_STYLE.valueFontScale),
      backgroundColor:color(style?.backgroundColor,DEFAULT_WIDGET_STYLE.backgroundColor),
      textColor:color(style?.textColor,DEFAULT_WIDGET_STYLE.textColor),
      secondaryTextColor:color(style?.secondaryTextColor,DEFAULT_WIDGET_STYLE.secondaryTextColor),
      gainColor:color(style?.gainColor,DEFAULT_WIDGET_STYLE.gainColor),
      lossColor:color(style?.lossColor,DEFAULT_WIDGET_STYLE.lossColor),
      neutralColor:color(style?.neutralColor,DEFAULT_WIDGET_STYLE.neutralColor),
      backgroundOpacity:clamp(style?.backgroundOpacity,0.1,1,DEFAULT_WIDGET_STYLE.backgroundOpacity),
      borderColor:color(style?.borderColor,DEFAULT_WIDGET_STYLE.borderColor),
      borderWidth:clamp(style?.borderWidth,0,6,DEFAULT_WIDGET_STYLE.borderWidth),
      cornerRadius:clamp(style?.cornerRadius,0,40,DEFAULT_WIDGET_STYLE.cornerRadius),
      shadowEnabled:style?.shadowEnabled??DEFAULT_WIDGET_STYLE.shadowEnabled,
      textAlign:style?.textAlign==='center'||style?.textAlign==='right'?style.textAlign:'left',
      rowGap:clamp(style?.rowGap,0,24,DEFAULT_WIDGET_STYLE.rowGap),
      padding:clamp(style?.padding,0,32,DEFAULT_WIDGET_STYLE.padding),
    },
    effects:{
      refresh:VALID_EFFECTS.includes(effects?.refresh as WidgetEffect)?effects!.refresh:DEFAULT_WIDGET_EFFECTS.refresh,
      gain:VALID_EFFECTS.includes(effects?.gain as WidgetEffect)?effects!.gain:DEFAULT_WIDGET_EFFECTS.gain,
      loss:VALID_EFFECTS.includes(effects?.loss as WidgetEffect)?effects!.loss:DEFAULT_WIDGET_EFFECTS.loss,
      alert:VALID_EFFECTS.includes(effects?.alert as WidgetEffect)?effects!.alert:DEFAULT_WIDGET_EFFECTS.alert,
      animationsEnabled:effects?.animationsEnabled??DEFAULT_WIDGET_EFFECTS.animationsEnabled,
    },
    sort:{
      key:VALID_SORTS.includes(sort?.key as WidgetSortKey)?sort!.key:DEFAULT_WIDGET_SORT.key,
      direction:sort?.direction==='desc'?'desc':'asc',
      manualSymbols:uniqueStrings(sort?.manualSymbols),
    },
    selectedSymbols:uniqueStrings(input?.selectedSymbols),
    profitColorFields:fieldStyles.filter(item=>item.visual.useProfitColor).map(item=>item.field),
    wallColumns:Math.round(clamp(input?.wallColumns,1,4,DEFAULT_WIDGET_CONFIG.wallColumns)),
    forceRefreshOnTap:input?.forceRefreshOnTap??DEFAULT_WIDGET_CONFIG.forceRefreshOnTap,
    tapTarget:input?.tapTarget==='portfolio'||input?.tapTarget==='dividend'?input.tapTarget:'home',
  };
}

type WidgetSettingsRuntimeValue=Readonly<{
  hydrated:boolean;
  config:WidgetConfig;
  setConfig:(config:WidgetConfig)=>void;
  patch:(patch:Partial<WidgetConfig>)=>void;
  reset:()=>void;
}>;

const Context=createContext<WidgetSettingsRuntimeValue|null>(null);

export function WidgetSettingsRuntimeProvider({children}:PropsWithChildren){
  const [config,setConfigState]=useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw=>{
        if(!alive||!raw)return;
        setConfigState(normalize(JSON.parse(raw) as Partial<WidgetConfig>));
      })
      .catch(()=>{})
      .finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(config)).catch(()=>{});
  },[hydrated,config]);

  const value=useMemo<WidgetSettingsRuntimeValue>(()=>({
    hydrated,
    config,
    setConfig:next=>setConfigState(normalize(next)),
    patch:patch=>setConfigState(current=>normalize({...current,...patch})),
    reset:()=>setConfigState(DEFAULT_WIDGET_CONFIG),
  }),[hydrated,config]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useWidgetSettingsRuntime(){
  const value=useContext(Context);
  if(!value)throw new Error('useWidgetSettingsRuntime must be used inside WidgetSettingsRuntimeProvider');
  return value;
}

export { STORAGE_KEY as WIDGET_SETTINGS_STORAGE_KEY };
