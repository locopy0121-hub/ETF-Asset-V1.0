import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,type PropsWithChildren,useContext,useEffect,useMemo,useState} from 'react';
import {
  DEFAULT_ITEM_EFFECT,
  ITEM_EFFECT_INTENSITIES,
  ITEM_EFFECT_KINDS,
  ITEM_EFFECT_SPEEDS,
  ITEM_EFFECT_TRIGGERS,
  type ItemEffectConfig,
  type ItemVisualOverride,
} from '../domain/displayItemContract';
import { DEFAULT_HOLDING_WALL_CONFIG, type HoldingWallConfig, type HoldingWallFieldConfig } from '../domain/uiModels';
import {
  DEFAULT_MONITOR_CONFIG,DEFAULT_MONITOR_EFFECTS,DEFAULT_MONITOR_ITEMS,DEFAULT_MONITOR_SORT,DEFAULT_MONITOR_STYLE,DEFAULT_MINI_COLUMNS,DEFAULT_MINI_HEADER,DEFAULT_MINI_STATUS_BAR,DEFAULT_MINI_STATUS_ITEMS,DEFAULT_MONITOR_WALL_LAYOUT,MONITOR_FIELDS,
  type MonitorConfig,type MonitorEffect,type MonitorField,type MonitorItemConfig,type MonitorSortKey,type MonitorStyle,type MiniColumnConfig,type MiniHeaderStyle,type MiniStatusBarStyle,type MiniStatusItemConfig,type MonitorWallLayout,
} from './monitorDomain';

const STORAGE_KEY='@tf-asset/monitor-settings';
const VALID_FIELDS:readonly MonitorField[]=MONITOR_FIELDS;
const VALID_EFFECTS:readonly MonitorEffect[]=['none','fade','pulse','flash-on-change'];
const VALID_SORTS:readonly MonitorSortKey[]=['manual','symbol','price','changePercent'];
const clamp=(v:unknown,min:number,max:number,fallback:number)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
const color=(v:unknown,f:string)=>typeof v==='string'&&/^#[0-9A-Fa-f]{6}$/.test(v)?v.toUpperCase():f;
const nullableColor=(v:unknown)=>v==null?null:typeof v==='string'&&/^#[0-9A-Fa-f]{6}$/.test(v)?v.toUpperCase():null;
const strings=(v:unknown)=>Array.isArray(v)?Array.from(new Set(v.map(x=>String(x).trim().toUpperCase()).filter(Boolean))):[];
const normItemEffect=(effect:Partial<ItemEffectConfig>|undefined):ItemEffectConfig=>({
  kind:ITEM_EFFECT_KINDS.includes(effect?.kind as ItemEffectConfig['kind'])?effect!.kind as ItemEffectConfig['kind']:DEFAULT_ITEM_EFFECT.kind,
  trigger:ITEM_EFFECT_TRIGGERS.includes(effect?.trigger as ItemEffectConfig['trigger'])?effect!.trigger as ItemEffectConfig['trigger']:DEFAULT_ITEM_EFFECT.trigger,
  speed:ITEM_EFFECT_SPEEDS.includes(effect?.speed as ItemEffectConfig['speed'])?effect!.speed as ItemEffectConfig['speed']:DEFAULT_ITEM_EFFECT.speed,
  intensity:ITEM_EFFECT_INTENSITIES.includes(effect?.intensity as ItemEffectConfig['intensity'])?effect!.intensity as ItemEffectConfig['intensity']:DEFAULT_ITEM_EFFECT.intensity,
});
const normVisual=(visual:Partial<ItemVisualOverride>|undefined,fallback:ItemVisualOverride):ItemVisualOverride=>({
  fontScale:clamp(visual?.fontScale,.7,2,fallback.fontScale),
  textColor:nullableColor(visual?.textColor),
  backgroundColor:nullableColor(visual?.backgroundColor),
  textAlign:visual?.textAlign==='left'||visual?.textAlign==='center'||visual?.textAlign==='right'?visual.textAlign:null,
  lineGap:visual?.lineGap==null?null:clamp(visual.lineGap,0,32,0),
  paddingY:clamp(visual?.paddingY,0,16,fallback.paddingY),
  useProfitColor:visual?.useProfitColor??fallback.useProfitColor,
  effect:normItemEffect(visual?.effect),
});
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
  rowGap:clamp(s?.rowGap,0,32,fallback.rowGap),padding:clamp(s?.padding,0,32,fallback.padding),
});
const normNormalItems=(items:readonly Partial<MonitorItemConfig>[]|undefined):readonly MonitorItemConfig[]=>{
  const input=Array.isArray(items)?items:[];
  const map=new Map(input.map(item=>[item.field,item]));
  return DEFAULT_MONITOR_ITEMS.map(fallback=>{
    const item=map.get(fallback.field);
    return {
      field:fallback.field,
      label:typeof item?.label==='string'&&item.label.trim()?item.label.trim().slice(0,16):fallback.label,
      visual:normVisual(item?.visual,fallback.visual),
    };
  });
};
const normMiniHeader=(h:Partial<MiniHeaderStyle>|undefined):MiniHeaderStyle=>({
  visible:h?.visible??DEFAULT_MINI_HEADER.visible,
  height:clamp(h?.height,22,56,DEFAULT_MINI_HEADER.height),
  backgroundColor:color(h?.backgroundColor,DEFAULT_MINI_HEADER.backgroundColor),
  backgroundOpacity:clamp(h?.backgroundOpacity,.1,1,DEFAULT_MINI_HEADER.backgroundOpacity),
  textColor:color(h?.textColor,DEFAULT_MINI_HEADER.textColor),
  fontScale:clamp(h?.fontScale,.7,1.6,DEFAULT_MINI_HEADER.fontScale),
  borderColor:color(h?.borderColor,DEFAULT_MINI_HEADER.borderColor),
  borderWidth:clamp(h?.borderWidth,0,4,DEFAULT_MINI_HEADER.borderWidth),
  effect:normItemEffect(h?.effect),
});
const normMiniColumns=(columns:readonly Partial<MiniColumnConfig>[]|undefined):readonly MiniColumnConfig[]=>{
  const input=Array.isArray(columns)?columns:[];
  const map=new Map(input.map(column=>[column.field,column]));
  return DEFAULT_MINI_COLUMNS.map(defaultColumn=>{
    const column=map.get(defaultColumn.field);
    return {
      field:defaultColumn.field,
      enabled:column?.enabled??defaultColumn.enabled,
      widthPercent:clamp(column?.widthPercent,10,60,defaultColumn.widthPercent),
      align:column?.align==='center'||column?.align==='right'?column.align:'left',
      fontScale:clamp(column?.fontScale,.7,2,defaultColumn.fontScale),
      useProfitColor:column?.useProfitColor??defaultColumn.useProfitColor,
      label:typeof column?.label==='string'&&column.label.trim()?column.label.trim().slice(0,12):defaultColumn.label,
      textColor:nullableColor(column?.textColor),
      backgroundColor:nullableColor(column?.backgroundColor),
      lineGap:column?.lineGap==null?null:clamp(column.lineGap,0,32,0),
      paddingY:clamp(column?.paddingY,0,16,defaultColumn.paddingY),
      effect:normItemEffect(column?.effect),
    };
  });
};
const normMiniStatusBar=(bar:Partial<MiniStatusBarStyle>|undefined):MiniStatusBarStyle=>({
  visible:bar?.visible??DEFAULT_MINI_STATUS_BAR.visible,
  height:clamp(bar?.height,24,96,DEFAULT_MINI_STATUS_BAR.height),
  columns:Math.round(clamp(bar?.columns,1,4,DEFAULT_MINI_STATUS_BAR.columns)),
  backgroundColor:color(bar?.backgroundColor,DEFAULT_MINI_STATUS_BAR.backgroundColor),
  backgroundOpacity:clamp(bar?.backgroundOpacity,.1,1,DEFAULT_MINI_STATUS_BAR.backgroundOpacity),
  textColor:color(bar?.textColor,DEFAULT_MINI_STATUS_BAR.textColor),
  fontScale:clamp(bar?.fontScale,.7,1.6,DEFAULT_MINI_STATUS_BAR.fontScale),
  borderColor:color(bar?.borderColor,DEFAULT_MINI_STATUS_BAR.borderColor),
  borderWidth:clamp(bar?.borderWidth,0,4,DEFAULT_MINI_STATUS_BAR.borderWidth),
});
const normMiniStatusItems=(items:readonly Partial<MiniStatusItemConfig>[]|undefined):readonly MiniStatusItemConfig[]=>{
  const input=Array.isArray(items)?items:[];
  const map=new Map(input.map(item=>[item.field,item]));
  return DEFAULT_MINI_STATUS_ITEMS.map(defaultItem=>{
    const item=map.get(defaultItem.field);
    return {
      field:defaultItem.field,
      enabled:item?.enabled??defaultItem.enabled,
      label:typeof item?.label==='string'&&item.label.trim()?item.label.trim().slice(0,12):defaultItem.label,
      useProfitColor:item?.useProfitColor??defaultItem.useProfitColor,
      fontScale:clamp(item?.fontScale,.7,2,defaultItem.fontScale),
      textColor:nullableColor(item?.textColor),
      backgroundColor:nullableColor(item?.backgroundColor),
      align:item?.align==='left'||item?.align==='right'?item.align:'center',
      lineGap:item?.lineGap==null?null:clamp(item.lineGap,0,32,0),
      paddingY:clamp(item?.paddingY,0,16,defaultItem.paddingY),
      effect:normItemEffect(item?.effect),
    };
  });
};
const normWallLayout=(layout:Partial<MonitorWallLayout>|undefined):MonitorWallLayout=>({
  columns:Math.round(clamp(layout?.columns,1,4,DEFAULT_MONITOR_WALL_LAYOUT.columns)),
  columnGap:clamp(layout?.columnGap,0,32,DEFAULT_MONITOR_WALL_LAYOUT.columnGap),
  rowGap:clamp(layout?.rowGap,0,32,DEFAULT_MONITOR_WALL_LAYOUT.rowGap),
});
const normWall=(wall:Partial<HoldingWallConfig>|undefined):HoldingWallConfig=>{
  const fallback=DEFAULT_HOLDING_WALL_CONFIG;
  const input=Array.isArray(wall?.fields)?wall!.fields:[];
  const byField=new Map(input.map(field=>[field.field,field]));
  return {
    header:{
      visible:wall?.header?.visible??fallback.header.visible,
      fontScale:clamp(wall?.header?.fontScale,.7,1.8,fallback.header.fontScale),
      backgroundColor:color(wall?.header?.backgroundColor,fallback.header.backgroundColor),
      textColor:color(wall?.header?.textColor,fallback.header.textColor),
      borderColor:color(wall?.header?.borderColor,fallback.header.borderColor),
      borderWidth:clamp(wall?.header?.borderWidth,0,6,fallback.header.borderWidth),
      effect:normItemEffect(wall?.header?.effect),
    },
    fields:fallback.fields.map(defaultField=>{
      const field=byField.get(defaultField.field) as Partial<HoldingWallFieldConfig>|undefined;
      return {
        field:defaultField.field,
        enabled:field?.enabled??defaultField.enabled,
        label:typeof field?.label==='string'&&field.label.trim()?field.label.trim().slice(0,12):defaultField.label,
        fontScale:clamp(field?.fontScale,.7,2,defaultField.fontScale),
        align:field?.align==='center'||field?.align==='right'?field.align:'left',
        useProfitColor:field?.useProfitColor??defaultField.useProfitColor,
        textColor:nullableColor(field?.textColor),
        backgroundColor:nullableColor(field?.backgroundColor),
        lineGap:field?.lineGap==null?null:clamp(field.lineGap,0,32,0),
        paddingY:clamp(field?.paddingY,0,16,defaultField.paddingY),
        effect:normItemEffect(field?.effect),
      };
    }),
    style:{
      backgroundColor:color(wall?.style?.backgroundColor,fallback.style.backgroundColor),
      textColor:color(wall?.style?.textColor,fallback.style.textColor),
      secondaryTextColor:color(wall?.style?.secondaryTextColor,fallback.style.secondaryTextColor),
      gainColor:color(wall?.style?.gainColor,fallback.style.gainColor),
      lossColor:color(wall?.style?.lossColor,fallback.style.lossColor),
      borderColor:color(wall?.style?.borderColor,fallback.style.borderColor),
      borderWidth:clamp(wall?.style?.borderWidth,0,6,fallback.style.borderWidth),
      cornerRadius:clamp(wall?.style?.cornerRadius,0,40,fallback.style.cornerRadius),
      padding:clamp(wall?.style?.padding,0,32,fallback.style.padding),
      rowGap:clamp(wall?.style?.rowGap,0,32,fallback.style.rowGap),
    },
  };
};

function normalize(input:Partial<MonitorConfig>|null|undefined):MonitorConfig{
  const normal=input?.normalLayout, mini=input?.miniLayout;
  const fields=Array.isArray(input?.fields)?input.fields.filter((x):x is MonitorField=>VALID_FIELDS.includes(x as MonitorField)):[...DEFAULT_MONITOR_CONFIG.fields];
  const miniFields=Array.isArray(input?.miniFields)?input.miniFields.filter((x):x is MonitorField=>VALID_FIELDS.includes(x as MonitorField)):[...DEFAULT_MONITOR_CONFIG.miniFields];
  const effects=input?.effects,sort=input?.sort;
  return {
    enabled:input?.enabled??false,
    mode:input?.mode==='mini'?'mini':'normal',
    template:['portfolio','quotes','compact','single','dual','advanced','market-wall','heatmap','pnl-wall','weight-wall','ticker','terminal'].includes(String(input?.template))?input!.template as MonitorConfig['template']:'portfolio',
    fields:fields.length?fields:[...DEFAULT_MONITOR_CONFIG.fields],
    normalItems:normNormalItems(input?.normalItems),
    miniFields:miniFields.length?miniFields:[...DEFAULT_MONITOR_CONFIG.miniFields],
    selectedSymbols:strings(input?.selectedSymbols),
    showBreathingLight:input?.showBreathingLight??true,
    alertChangePct:Number.isFinite(Number(input?.alertChangePct))?Math.max(0,Number(input?.alertChangePct)):null,
    normalLayout:{x:clamp(normal?.x,-2000,2000,16),y:clamp(normal?.y,-2000,2000,120),width:clamp(normal?.width,120,1200,320),height:clamp(normal?.height,56,1600,420)},
    miniLayout:{x:clamp(mini?.x,-2000,2000,16),y:clamp(mini?.y,-2000,2000,120),width:clamp(mini?.width,220,900,360),height:clamp(mini?.height,120,800,330)},
    normalStyle:normStyle(input?.normalStyle,DEFAULT_MONITOR_STYLE),
    miniStyle:normStyle(input?.miniStyle,DEFAULT_MONITOR_CONFIG.miniStyle),
    miniHeader:normMiniHeader(input?.miniHeader),
    miniColumns:normMiniColumns(input?.miniColumns),
    miniStatusBar:normMiniStatusBar(input?.miniStatusBar),
    miniStatusItems:normMiniStatusItems(input?.miniStatusItems),
    normalWall:normWall(input?.normalWall),
    normalWallLayout:normWallLayout(input?.normalWallLayout),
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
