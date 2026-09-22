import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  ITEM_EFFECT_INTENSITIES,
  ITEM_EFFECT_KINDS,
  ITEM_EFFECT_SPEEDS,
  ITEM_EFFECT_TRIGGERS,
  type ItemEffectIntensity,
  type ItemEffectKind,
  type ItemEffectSpeed,
  type ItemEffectTrigger,
  type ItemVisualOverride,
} from '../../domain/displayItemContract';
import type { SharedSnapshot } from '../../domain/snapshot';
import {
  WIDGET_FIELDS,
  WIDGET_FIELD_LABELS,
  sortWidgetHoldings,
  widgetFieldStyle,
  type WidgetConfig,
  type WidgetEffect,
  type WidgetField,
  type WidgetFieldStyle,
  type WidgetSize,
  type WidgetSortKey,
  type WidgetTemplate,
} from '../../widget/widgetDomain';
import { ColorPalettePicker } from '../ColorPalettePicker';
import { colors, radius, spacing } from '../../theme/tokens';

type SymbolOption={symbol:string;name?:string};
type Props = {
  value: WidgetConfig;
  onChange: (value: WidgetConfig) => void;
  availableSymbols?: readonly SymbolOption[];
  previewSnapshot?: SharedSnapshot|null;
};

const sizes: readonly WidgetSize[] = ['2x2','small', 'medium', 'large'];
const templates: readonly WidgetTemplate[] = ['asset-summary','quote-summary','compact','advanced','minimal','transparent','quote-wall'];
const effects:readonly WidgetEffect[]=['none','fade','pulse','flash-on-change'];
const effectLabels:Record<WidgetEffect,string>={none:'無',fade:'淡入',pulse:'脈衝', 'flash-on-change':'變動閃爍'};
const itemEffectLabels:Record<ItemEffectKind,string>={none:'無',fade:'淡入',pulse:'脈衝','flash-on-change':'變動閃爍',bounce:'跳動'};
const triggerLabels:Record<ItemEffectTrigger,string>={always:'常駐',refresh:'刷新',change:'數值變動',gain:'上漲',loss:'下跌',alert:'警報'};
const speedLabels:Record<ItemEffectSpeed,string>={slow:'慢',normal:'正常',fast:'快'};
const intensityLabels:Record<ItemEffectIntensity,string>={soft:'弱',medium:'中',strong:'強'};
const sortKeys:readonly WidgetSortKey[]=['manual','symbol','price','changePercent'];
const sortLabels:Record<WidgetSortKey,string>={manual:'手動',symbol:'代號',price:'價格',changePercent:'漲跌%'};

export function WidgetControlPanel({ value, onChange, availableSymbols=[], previewSnapshot=null }: Props) {
  const [editingField,setEditingField]=useState<WidgetField|null>(null);
  const sortedRows=sortWidgetHoldings(previewSnapshot,value);
  const previewHolding=sortedRows[0];
  const wallSupported:readonly WidgetField[]=['symbol','name','price','change','changePercent','shares','avgCost','holdingMarketValue','pnl','roi','comprehensivePnl','marketStatus','updatedAt','dailyPnl','quote'];
  const selectedWallFields=value.fields.filter(field=>wallSupported.includes(field)).slice(0,4);
  const wallPreviewFields=selectedWallFields.length?selectedWallFields:(['name','symbol','price','changePercent'] as const);
  const wallPreviewRows=sortedRows.slice(0,Math.min(8,Math.max(1,value.wallColumns*2)));
  const previewLines=value.fields.slice(0,widgetTemplateCapacity(value.template)).map(field=>{
    const config=widgetFieldStyle(value,field);
    return {field,config,...widgetFieldText(previewSnapshot,previewHolding,field,config.label)};
  });
  const previewPct=previewHolding?.changePercent;
  const previewTone=(previewPct??0)>=0?value.style.gainColor:value.style.lossColor;
  const patch=(patch:Partial<WidgetConfig>)=>onChange({...value,...patch});
  const patchStyle=(stylePatch:Partial<WidgetConfig['style']>)=>patch({style:{...value.style,...stylePatch}});
  const patchEffects=(p:Partial<WidgetConfig['effects']>)=>patch({effects:{...value.effects,...p}});
  const patchSort=(p:Partial<WidgetConfig['sort']>)=>patch({sort:{...value.sort,...p}});
  const patchField=(field:WidgetField,change:Partial<WidgetFieldStyle>)=>patch({
    fieldStyles:value.fieldStyles.map(item=>item.field===field?{...item,...change}:item),
  });
  const patchVisual=(field:WidgetField,change:Partial<ItemVisualOverride>)=>{
    const current=widgetFieldStyle(value,field);
    const next={...current.visual,...change};
    const fieldStyles=value.fieldStyles.map(item=>item.field===field?{...item,visual:next}:item);
    const profitColorFields=next.useProfitColor
      ?Array.from(new Set([...value.profitColorFields,field]))
      :value.profitColorFields.filter(item=>item!==field);
    patch({fieldStyles,profitColorFields});
  };
  const patchItemEffect=(field:WidgetField,change:Partial<ItemVisualOverride['effect']>)=>{
    const current=widgetFieldStyle(value,field);
    patchVisual(field,{effect:{...current.visual.effect,...change}});
  };
  const toggleField=(field:WidgetField)=>{
    const current=[...value.fields];
    patch({fields:current.includes(field)?current.filter(x=>x!==field):[...current,field]});
  };
  const moveField=(field:WidgetField,delta:number)=>{
    const current=[...value.fields];
    const index=current.indexOf(field);
    const target=index+delta;
    if(index<0||target<0||target>=current.length)return;
    const a=current[index]!; const b=current[target]!; current[index]=b; current[target]=a;
    patch({fields:current});
  };
  const toggleSymbol=(symbol:string)=>{
    const next=value.selectedSymbols.includes(symbol)
      ? value.selectedSymbols.filter(x=>x!==symbol)
      : [...value.selectedSymbols,symbol];
    patch({selectedSymbols:next,sort:{...value.sort,manualSymbols:next}});
  };

  return <View style={styles.card}>
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>手機桌面 Widget 編輯器</Text>
        <Text style={styles.sub}>A 管理顯示項目與順序；點選 A 後只展開該項目的 B 細部設定。</Text>
      </View>
      <Pressable onPress={() => patch({enabled:!value.enabled})} style={[styles.pill,value.enabled&&styles.pillActive]}>
        <Text style={[styles.pillText,value.enabled&&styles.pillTextActive]}>{value.enabled?'已啟用':'未啟用'}</Text>
      </Pressable>
    </View>

    <Section title="即時預覽">
      {value.template==='quote-wall'
        ?<View style={[styles.preview,styles.wallPreview,{backgroundColor:value.style.backgroundColor,opacity:value.style.backgroundOpacity,borderColor:value.style.borderColor,borderWidth:value.style.borderWidth,borderRadius:value.style.cornerRadius,padding:value.style.padding}]}>
          {wallPreviewRows.map(row=><View key={row.symbol} style={[styles.wallPreviewCard,{flexBasis:value.wallColumns===1?'100%':value.wallColumns===2?'48%':value.wallColumns===3?'31%':'23%'}]}>
            {wallPreviewFields.map((field,index)=>{
              const config=widgetFieldStyle(value,field);
              const visual=config.visual;
              const line=widgetFieldText(previewSnapshot,row,field,config.label);
              const numeric=row.changePercent??0;
              const tone=line.profit&&visual.useProfitColor?(numeric>=0?value.style.gainColor:value.style.lossColor):(visual.textColor??value.style.textColor);
              return <Text key={field} numberOfLines={1} style={{
                color:tone,
                backgroundColor:visual.backgroundColor??'transparent',
                fontSize:10*value.style.fontScale*visual.fontScale,
                fontWeight:'800',
                textAlign:visual.textAlign??value.style.textAlign,
                marginTop:index===0?0:(visual.lineGap??value.style.rowGap),
                paddingVertical:visual.paddingY,
              }}>{line.text}</Text>;
            })}
          </View>)}
          {!wallPreviewRows.length?<Text style={{color:value.style.secondaryTextColor}}>尚無持股資料</Text>:null}
        </View>
        :<View style={[styles.preview,{backgroundColor:value.style.backgroundColor,opacity:value.style.backgroundOpacity,borderColor:value.style.borderColor,borderWidth:value.style.borderWidth,borderRadius:value.style.cornerRadius,padding:value.style.padding}]}>
          {previewLines.map((line,index)=>{
            const visual=line.config.visual;
            const tone=line.profit&&visual.useProfitColor?previewTone:(visual.textColor??value.style.textColor);
            return <Text key={line.field} numberOfLines={1} style={{
              color:tone,
              backgroundColor:visual.backgroundColor??'transparent',
              fontWeight:index===0?'900':'800',
              fontSize:(index===0?14*value.style.titleFontScale:12*value.style.fontScale)*visual.fontScale,
              textAlign:visual.textAlign??value.style.textAlign,
              marginTop:index===0?0:(visual.lineGap??value.style.rowGap),
              paddingVertical:visual.paddingY,
            }}>{line.text}</Text>;
          })}
          {!previewLines.length?<Text style={{color:value.style.secondaryTextColor}}>請選擇顯示項目</Text>:null}
        </View>}
      <Text style={styles.note}>預覽與桌面 Renderer 使用同一 A 順序／B 樣式；行情牆只取適用持股欄位，避免摘要預覽與實體行情牆不一致。</Text>
    </Section>

    <Section title="尺寸與模板">
      <Choice choices={sizes} value={value.size} label={x=>x==='2x2'?'2×2':x==='small'?'小型':x==='large'?'大型':'中型'} onChange={size=>patch({size})}/>
      <Choice choices={templates} value={value.template} label={x=>x==='asset-summary'?'資產摘要':x==='quote-summary'?'行情摘要':x==='compact'?'精簡':x==='advanced'?'進階資訊':x==='minimal'?'極簡':x==='quote-wall'?'行情牆':'透明'} onChange={template=>patch({template})}/>
      {value.template==='quote-wall'?<Step label="行情牆並排欄數" value={value.wallColumns} min={1} max={4} step={1} suffix=" 欄" onChange={wallColumns=>patch({wallColumns})}/>:null}
      <Toggle label="點擊 Widget 強制更新" value={value.forceRefreshOnTap} onChange={forceRefreshOnTap=>patch({forceRefreshOnTap})}/>
      <Choice choices={['home','portfolio','dividend'] as const} value={value.tapTarget} label={x=>x==='home'?'首頁':x==='portfolio'?'庫存':'股息'} onChange={tapTarget=>patch({tapTarget})}/>
    </Section>

    <Section title="A 顯示項目（母）">
      <Text style={styles.note}>A 只控制顯示／隱藏、順序與要編輯哪一項；上一個 B 會在選擇另一項時自動收合。</Text>
      {WIDGET_FIELDS.map(field=>{
        const active=value.fields.includes(field);
        const selected=editingField===field;
        const config=widgetFieldStyle(value,field);
        return <View key={field} style={styles.abCard}>
          <View style={styles.orderRow}>
            <Pressable onPress={()=>setEditingField(selected?null:field)} style={[styles.choice,selected&&styles.choiceActive]}>
              <Text style={[styles.choiceText,selected&&styles.choiceTextActive]}>{config.label||WIDGET_FIELD_LABELS[field]}</Text>
            </Pressable>
            <Pressable onPress={()=>toggleField(field)} style={[styles.visibilityButton,active&&styles.visibilityButtonOn]}>
              <Text style={[styles.visibilityText,active&&styles.visibilityTextOn]}>{active?'顯示':'隱藏'}</Text>
            </Pressable>
            {active?<><MiniButton label="↑" onPress={()=>moveField(field,-1)}/><MiniButton label="↓" onPress={()=>moveField(field,1)}/></>:null}
          </View>
          {selected?<View style={styles.bPanel}>
            <Text style={styles.bTitle}>B 單項細部：{WIDGET_FIELD_LABELS[field]}</Text>
            <LabelInput value={config.label} onChange={label=>patchField(field,{label:label.slice(0,16)})}/>
            <Step label="單項字體" value={Math.round(config.visual.fontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>patchVisual(field,{fontScale:n/100})}/>
            <Toggle label="套用損益色" value={config.visual.useProfitColor} onChange={useProfitColor=>patchVisual(field,{useProfitColor})}/>
            <Toggle label="自訂文字顏色" value={config.visual.textColor!=null} onChange={enabled=>patchVisual(field,{textColor:enabled?value.style.textColor:null})}/>
            {config.visual.textColor?<ColorPalettePicker label="單項文字顏色" value={config.visual.textColor} onChange={textColor=>patchVisual(field,{textColor})}/>:null}
            <Toggle label="自訂單項背景" value={config.visual.backgroundColor!=null} onChange={enabled=>patchVisual(field,{backgroundColor:enabled?value.style.backgroundColor:null})}/>
            {config.visual.backgroundColor?<ColorPalettePicker label="單項背景" value={config.visual.backgroundColor} onChange={backgroundColor=>patchVisual(field,{backgroundColor})}/>:null}
            <Text style={styles.label}>單項對齊</Text>
            <Choice choices={['left','center','right'] as const} value={config.visual.textAlign??value.style.textAlign} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={textAlign=>patchVisual(field,{textAlign})}/>
            <Toggle label="自訂行距" value={config.visual.lineGap!=null} onChange={enabled=>patchVisual(field,{lineGap:enabled?value.style.rowGap:null})}/>
            {config.visual.lineGap!=null?<Step label="單項行距" value={config.visual.lineGap} min={0} max={32} step={1} suffix=" px" onChange={lineGap=>patchVisual(field,{lineGap})}/>:null}
            <Step label="上下內距" value={config.visual.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>patchVisual(field,{paddingY})}/>
            <Text style={styles.label}>單項特效</Text>
            <Choice choices={ITEM_EFFECT_KINDS} value={config.visual.effect.kind} label={x=>itemEffectLabels[x]} onChange={kind=>patchItemEffect(field,{kind})}/>
            {config.visual.effect.kind!=='none'?<>
              <Text style={styles.label}>觸發條件</Text>
              <Choice choices={ITEM_EFFECT_TRIGGERS} value={config.visual.effect.trigger} label={x=>triggerLabels[x]} onChange={trigger=>patchItemEffect(field,{trigger})}/>
              <Text style={styles.label}>速度</Text>
              <Choice choices={ITEM_EFFECT_SPEEDS} value={config.visual.effect.speed} label={x=>speedLabels[x]} onChange={speed=>patchItemEffect(field,{speed})}/>
              <Text style={styles.label}>強度</Text>
              <Choice choices={ITEM_EFFECT_INTENSITIES} value={config.visual.effect.intensity} label={x=>intensityLabels[x]} onChange={intensity=>patchItemEffect(field,{intensity})}/>
            </>:null}
          </View>:null}
        </View>;
      })}
      <Text style={styles.label}>ETF 排序</Text>
      <Choice choices={sortKeys} value={value.sort.key} label={x=>sortLabels[x]} onChange={key=>patchSort({key})}/>
      {value.sort.key!=='manual'?<Choice choices={['asc','desc'] as const} value={value.sort.direction} label={x=>x==='asc'?'小→大':'大→小'} onChange={direction=>patchSort({direction})}/>:null}
      {availableSymbols.length?<View style={styles.symbolWrap}>{availableSymbols.map(row=><Pressable key={row.symbol} onPress={()=>toggleSymbol(row.symbol)} style={[styles.symbolChip,value.selectedSymbols.includes(row.symbol)&&styles.choiceActive]}><Text style={[styles.choiceText,value.selectedSymbols.includes(row.symbol)&&styles.choiceTextActive]}>{row.symbol}</Text></Pressable>)}</View>:<Text style={styles.note}>沒有持股時顯示全部 Snapshot 標的。</Text>}
    </Section>

    <Section title="Widget 全域字體與版面">
      <Step label="全局字體" value={Math.round(value.style.fontScale*100)} min={70} max={180} step={5} suffix="%" onChange={n=>patchStyle({fontScale:n/100})}/>
      <Step label="標題字體" value={Math.round(value.style.titleFontScale*100)} min={70} max={180} step={5} suffix="%" onChange={n=>patchStyle({titleFontScale:n/100})}/>
      <Step label="數值字體" value={Math.round(value.style.valueFontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>patchStyle({valueFontScale:n/100})}/>
      <Step label="內距" value={value.style.padding} min={0} max={32} step={2} suffix=" px" onChange={padding=>patchStyle({padding})}/>
      <Step label="全域行距" value={value.style.rowGap} min={0} max={32} step={1} suffix=" px" onChange={rowGap=>patchStyle({rowGap})}/>
      <Choice choices={['left','center','right'] as const} value={value.style.textAlign} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={textAlign=>patchStyle({textAlign})}/>
    </Section>

    <Section title="Widget 全域顏色與外觀">
      <Text style={styles.note}>B 未覆寫的項目繼承這裡；所有顏色一律使用調色盤。</Text>
      <ColorPalettePicker label="背景" value={value.style.backgroundColor} onChange={backgroundColor=>patchStyle({backgroundColor})}/>
      <ColorPalettePicker label="文字" value={value.style.textColor} onChange={textColor=>patchStyle({textColor})}/>
      <ColorPalettePicker label="次要文字" value={value.style.secondaryTextColor} onChange={secondaryTextColor=>patchStyle({secondaryTextColor})}/>
      <ColorPalettePicker label="上漲 / 獲利" value={value.style.gainColor} onChange={gainColor=>patchStyle({gainColor})}/>
      <ColorPalettePicker label="下跌 / 虧損" value={value.style.lossColor} onChange={lossColor=>patchStyle({lossColor})}/>
      <ColorPalettePicker label="平盤 / 中性" value={value.style.neutralColor} onChange={neutralColor=>patchStyle({neutralColor})}/>
      <ColorPalettePicker label="邊框" value={value.style.borderColor} onChange={borderColor=>patchStyle({borderColor})}/>
      <Step label="背景透明度" value={Math.round(value.style.backgroundOpacity*100)} min={10} max={100} step={5} suffix="%" onChange={n=>patchStyle({backgroundOpacity:n/100})}/>
      <Step label="圓角" value={value.style.cornerRadius} min={0} max={40} step={2} suffix=" px" onChange={cornerRadius=>patchStyle({cornerRadius})}/>
      <Step label="邊框粗細" value={value.style.borderWidth} min={0} max={6} step={1} suffix=" px" onChange={borderWidth=>patchStyle({borderWidth})}/>
      <Toggle label="陰影" value={value.style.shadowEnabled} onChange={shadowEnabled=>patchStyle({shadowEnabled})}/>
    </Section>

    <Section title="全域特效（相容層）">
      <Text style={styles.note}>保留舊全域特效供未指定 B 特效的舊設定相容；新單項效果以 B 設定為優先。</Text>
      <Toggle label="允許動畫" value={value.effects.animationsEnabled} onChange={animationsEnabled=>patchEffects({animationsEnabled})}/>
      <EffectChoice label="刷新" value={value.effects.refresh} onChange={refresh=>patchEffects({refresh})}/>
      <EffectChoice label="上漲" value={value.effects.gain} onChange={gain=>patchEffects({gain})}/>
      <EffectChoice label="下跌" value={value.effects.loss} onChange={loss=>patchEffects({loss})}/>
      <EffectChoice label="警示" value={value.effects.alert} onChange={alert=>patchEffects({alert})}/>
    </Section>

    <Text style={styles.note}>Widget 只讀 Shared Snapshot；A/B 只改顯示設定，不建立第二套帳務公式。</Text>
  </View>;
}

function Section({title,children}:{title:string;children:React.ReactNode}){return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;}
function Choice<T extends string>({choices,value,label,onChange}:{choices:readonly T[];value:T;label:(v:T)=>string;onChange:(v:T)=>void}){return <View style={styles.row}>{choices.map(item=><Pressable key={item} onPress={()=>onChange(item)} style={[styles.choice,value===item&&styles.choiceActive]}><Text style={[styles.choiceText,value===item&&styles.choiceTextActive]}>{label(item)}</Text></Pressable>)}</View>;}
function MiniButton({label,onPress}:{label:string;onPress:()=>void}){return <Pressable onPress={onPress} style={styles.miniButton}><Text style={styles.miniButtonText}>{label}</Text></Pressable>;}
function Step({label,value,min,max,step,suffix,onChange}:{label:string;value:number;min:number;max:number;step:number;suffix:string;onChange:(n:number)=>void}){return <View style={styles.stepRow}><Text style={styles.stepLabel}>{label}</Text><MiniButton label="−" onPress={()=>onChange(Math.max(min,value-step))}/><Text style={styles.stepValue}>{value}{suffix}</Text><MiniButton label="＋" onPress={()=>onChange(Math.min(max,value+step))}/></View>;}
function Toggle({label,value,onChange}:{label:string;value:boolean;onChange:(v:boolean)=>void}){return <Pressable onPress={()=>onChange(!value)} style={styles.toggleRow}><Text style={styles.stepLabel}>{label}</Text><Text style={[styles.toggleState,value&&styles.toggleStateOn]}>{value?'開':'關'}</Text></Pressable>;}
function EffectChoice({label,value,onChange}:{label:string;value:WidgetEffect;onChange:(v:WidgetEffect)=>void}){return <View><Text style={styles.label}>{label}</Text><Choice choices={effects} value={value} label={x=>effectLabels[x]} onChange={onChange}/></View>;}
function LabelInput({value,onChange}:{value:string;onChange:(value:string)=>void}){return <View style={styles.labelEdit}><Text style={styles.label}>顯示名稱</Text><TextInput value={value} onChangeText={onChange} style={styles.input}/></View>;}

const styles = StyleSheet.create({
  card:{backgroundColor:colors.surfaceMuted,borderRadius:radius.lg,padding:spacing.md,borderWidth:1,borderColor:colors.border,gap:10},
  header:{flexDirection:'row',alignItems:'center',gap:8},
  title:{fontSize:14,fontWeight:'900',color:colors.text},
  sub:{fontSize:10,lineHeight:15,color:colors.textSecondary,marginTop:2},
  pill:{paddingHorizontal:10,paddingVertical:7,borderRadius:999,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  pillActive:{backgroundColor:colors.primary,borderColor:colors.primary},
  pillText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  pillTextActive:{color:'#FFFFFF'},
  section:{gap:8,paddingTop:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  sectionTitle:{fontSize:11,fontWeight:'900',color:colors.text},
  label:{fontSize:10,fontWeight:'900',color:colors.textSecondary},
  row:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  choice:{paddingHorizontal:9,paddingVertical:7,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  choiceActive:{borderColor:colors.primary,backgroundColor:'#EFF6FF'},
  choiceText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  choiceTextActive:{color:colors.primary},
  note:{fontSize:9,lineHeight:14,color:colors.textSecondary},
  preview:{minHeight:110,justifyContent:'center'},
  orderRow:{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'},
  miniButton:{width:34,height:32,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
  miniButtonText:{fontSize:14,fontWeight:'900',color:colors.primary},
  stepRow:{flexDirection:'row',alignItems:'center',gap:6},
  stepLabel:{fontSize:10,fontWeight:'800',color:colors.text,flex:1},
  stepValue:{minWidth:62,textAlign:'center',fontSize:10,fontWeight:'900',color:colors.text},
  toggleRow:{minHeight:36,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  toggleState:{paddingHorizontal:10,paddingVertical:5,borderRadius:999,overflow:'hidden',backgroundColor:colors.surface,color:colors.textSecondary,fontSize:10,fontWeight:'900'},
  toggleStateOn:{backgroundColor:'#EFF6FF',color:colors.primary},
  visibilityButton:{paddingHorizontal:8,paddingVertical:6,borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  visibilityButtonOn:{borderColor:colors.primary,backgroundColor:'#EFF6FF'},
  visibilityText:{fontSize:9,fontWeight:'900',color:colors.textSecondary},
  visibilityTextOn:{color:colors.primary},
  symbolWrap:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  symbolChip:{paddingHorizontal:8,paddingVertical:6,borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  abCard:{gap:6,padding:8,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface},
  bPanel:{gap:8,paddingTop:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  bTitle:{fontSize:10,fontWeight:'900',color:colors.primary},
  labelEdit:{gap:4},
  inlineValue:{fontSize:11,fontWeight:'900',color:colors.text},
  input:{minHeight:38,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface,paddingHorizontal:10,paddingVertical:7,fontSize:11,fontWeight:'800',color:colors.text},
  wallPreview:{flexDirection:'row',flexWrap:'wrap',alignContent:'flex-start',justifyContent:'space-between',gap:6},
  wallPreviewCard:{borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,padding:6,minHeight:56},
});

function widgetFieldText(snapshot:SharedSnapshot|null,holding:SharedSnapshot['holdings'][number]|undefined,field:WidgetField,label:string):{text:string;profit:boolean}{
  const asset=snapshot?.asset;
  const money=(v:number|undefined)=>v==null?'--':Math.round(v).toLocaleString('zh-TW');
  const signedMoney=(v:number|undefined)=>v==null?'--':`${v>=0?'+':''}${Math.round(v).toLocaleString('zh-TW')}`;
  const signed2=(v:number|null|undefined,suffix='')=>v==null?'--':`${v>=0?'+':''}${v.toFixed(2)}${suffix}`;
  switch(field){
    case 'appName':return {text:'TF Asset',profit:false};
    case 'totalAssets':return {text:`${label} NT$ ${money(asset?.totalAssets)}`,profit:false};
    case 'marketValue':return {text:`${label} NT$ ${money(asset?.marketValue)}`,profit:false};
    case 'cash':return {text:`${label} NT$ ${money(asset?.cash)}`,profit:false};
    case 'unrealizedPnl':return {text:`${label} ${signedMoney(asset?.unrealizedPnl)}`,profit:true};
    case 'realizedPnl':return {text:`${label} ${signedMoney(asset?.realizedPnl)}`,profit:true};
    case 'dividendIncome':return {text:`${label} ${money(asset?.dividendIncome)}`,profit:false};
    case 'totalReturn':return {text:`${label} ${signedMoney(asset?.totalReturn)}`,profit:true};
    case 'symbol':return {text:holding?.symbol??'--',profit:false};
    case 'name':return {text:holding?.name??'--',profit:false};
    case 'price':return {text:`${label} ${holding?.price==null?'--':holding.price.toFixed(2)}`,profit:false};
    case 'change':return {text:`${label} ${signed2(holding?.change)}`,profit:true};
    case 'changePercent':return {text:`${label} ${signed2(holding?.changePercent,'%')}`,profit:true};
    case 'shares':return {text:`${label} ${holding?Math.round(holding.shares).toLocaleString('zh-TW'):'--'}`,profit:false};
    case 'avgCost':return {text:`${label} ${holding?holding.avgCost.toFixed(2):'--'}`,profit:false};
    case 'holdingMarketValue':return {text:`${label} ${money(holding?.marketValue)}`,profit:false};
    case 'pnl':return {text:`${label} ${signedMoney(holding?.pnl)}`,profit:true};
    case 'roi':return {text:`${label} ${holding?signed2(holding.roi,'%'):'--'}`,profit:true};
    case 'comprehensivePnl':return {text:`${label} ${signedMoney(holding?.comprehensivePnl)}`,profit:true};
    case 'marketStatus':return {text:`${label} ${holding?.marketStatus??'--'}`,profit:false};
    case 'updatedAt':return {text:`${label} ${holding?.updatedAt?new Date(holding.updatedAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}):'--'}`,profit:false};
    case 'dailyPnl':return {text:`${label} ${signed2(holding?.change)}`,profit:true};
    case 'quote':return {text:holding?`${holding.symbol} ${holding.price?.toFixed(2)??'--'} ${signed2(holding.changePercent,'%')}`:'尚無行情',profit:true};
  }
}

function widgetTemplateCapacity(template:WidgetTemplate){
  if(template==='minimal')return 2;
  if(template==='compact')return 3;
  if(template==='transparent'||template==='quote-summary')return 4;
  if(template==='quote-wall')return 12;
  if(template==='asset-summary')return 5;
  return 6;
}
