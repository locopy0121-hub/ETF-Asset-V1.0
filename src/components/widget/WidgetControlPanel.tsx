import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SharedSnapshot } from '../../domain/snapshot';
import { sortWidgetHoldings } from '../../widget/widgetDomain';
import type {
  WidgetConfig,
  WidgetEffect,
  WidgetField,
  WidgetSize,
  WidgetSortKey,
  WidgetTemplate,
} from '../../widget/widgetDomain';
import { colors, radius, spacing } from '../../theme/tokens';

type SymbolOption={symbol:string;name?:string};
type Props = {
  value: WidgetConfig;
  onChange: (value: WidgetConfig) => void;
  availableSymbols?: readonly SymbolOption[];
  previewSnapshot?: SharedSnapshot|null;
};

const sizes: readonly WidgetSize[] = ['small', 'medium', 'large'];
const templates: readonly WidgetTemplate[] = ['asset-summary', 'quote-summary', 'compact', 'quote-wall'];
const fields:readonly WidgetField[]=['totalAssets','dailyPnl','quote','changePercent'];
const fieldLabels:Record<WidgetField,string>={totalAssets:'總資產',dailyPnl:'當日損益',quote:'行情',changePercent:'漲跌%'};
const effects:readonly WidgetEffect[]=['none','fade','pulse','flash-on-change'];
const effectLabels:Record<WidgetEffect,string>={none:'無',fade:'淡入',pulse:'脈衝', 'flash-on-change':'變動閃爍'};
const sortKeys:readonly WidgetSortKey[]=['manual','symbol','price','changePercent'];
const sortLabels:Record<WidgetSortKey,string>={manual:'手動',symbol:'代號',price:'價格',changePercent:'漲跌%'};
const palette=['#FFFFFF','#F8FAFC','#0F172A','#0066FF','#EF4444','#10B981','#64748B','#F59E0B'];

export function WidgetControlPanel({ value, onChange, availableSymbols=[], previewSnapshot=null }: Props) {
  const previewHolding=sortWidgetHoldings(previewSnapshot,value)[0];
  const previewTotal=previewSnapshot?.asset.totalAssets;
  const previewPct=previewHolding?.changePercent;
  const previewPrice=previewHolding?.price;
  const previewTone=(previewPct??0)>=0?value.style.gainColor:value.style.lossColor;
  const patch=(patch:Partial<WidgetConfig>)=>onChange({...value,...patch});
  const patchStyle=(stylePatch:Partial<WidgetConfig['style']>)=>patch({style:{...value.style,...stylePatch}});
  const patchEffects=(p:Partial<WidgetConfig['effects']>)=>patch({effects:{...value.effects,...p}});
  const patchSort=(p:Partial<WidgetConfig['sort']>)=>patch({sort:{...value.sort,...p}});
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
        <Text style={styles.sub}>尺寸、欄位、排序、字體、顏色、透明度與特效皆為 Widget 專屬設定。</Text>
      </View>
      <Pressable onPress={() => patch({enabled:!value.enabled})} style={[styles.pill,value.enabled&&styles.pillActive]}>
        <Text style={[styles.pillText,value.enabled&&styles.pillTextActive]}>{value.enabled?'已啟用':'未啟用'}</Text>
      </Pressable>
    </View>

    <Section title="即時預覽">
      <View style={[styles.preview,{backgroundColor:value.style.backgroundColor,opacity:value.style.backgroundOpacity,borderColor:value.style.borderColor,borderWidth:value.style.borderWidth,borderRadius:value.style.cornerRadius,padding:value.style.padding}]}>
        <Text style={{color:value.style.textColor,fontWeight:'900',fontSize:14*value.style.titleFontScale,textAlign:value.style.textAlign}}>TF Asset</Text>
        <Text style={{color:value.style.textColor,fontWeight:'900',fontSize:18*value.style.valueFontScale,textAlign:value.style.textAlign,marginTop:value.style.rowGap}}>{previewTotal==null?'等待資料':`NT$ ${Math.round(previewTotal).toLocaleString('zh-TW')}`}</Text>
        <Text style={{color:previewTone,fontWeight:'800',fontSize:12*value.style.fontScale,textAlign:value.style.textAlign,marginTop:value.style.rowGap}}>{previewHolding&&previewPrice!=null?`${previewHolding.symbol}  ${previewPrice.toFixed(2)}  ${previewPct==null?'':`${previewPct>=0?'+':''}${previewPct.toFixed(2)}%`}`:'尚無行情'}</Text>
      </View>
    </Section>

    <Section title="尺寸與模板">
      <Choice choices={sizes} value={value.size} label={x=>x==='small'?'小型':x==='large'?'大型':'中型'} onChange={size=>patch({size})}/>
      <Choice choices={templates} value={value.template} label={x=>x==='asset-summary'?'資產摘要':x==='quote-summary'?'行情摘要':x==='quote-wall'?'行情牆':'精簡'} onChange={template=>patch({template})}/>
      <Choice choices={['home','portfolio','dividend'] as const} value={value.tapTarget} label={x=>x==='home'?'首頁':x==='portfolio'?'庫存':'股息'} onChange={tapTarget=>patch({tapTarget})}/>
    </Section>

    <Section title="顯示欄位與排序">
      {fields.map(field=>{
        const active=value.fields.includes(field);
        return <View key={field} style={styles.orderRow}>
          <Pressable onPress={()=>toggleField(field)} style={[styles.choice,active&&styles.choiceActive]}><Text style={[styles.choiceText,active&&styles.choiceTextActive]}>{fieldLabels[field]}</Text></Pressable>
          {active?<><MiniButton label="↑" onPress={()=>moveField(field,-1)}/><MiniButton label="↓" onPress={()=>moveField(field,1)}/></>:null}
        </View>;
      })}
      <Text style={styles.label}>ETF 排序</Text>
      <Choice choices={sortKeys} value={value.sort.key} label={x=>sortLabels[x]} onChange={key=>patchSort({key})}/>
      {value.sort.key!=='manual'?<Choice choices={['asc','desc'] as const} value={value.sort.direction} label={x=>x==='asc'?'小→大':'大→小'} onChange={direction=>patchSort({direction})}/>:null}
      {availableSymbols.length?<View style={styles.symbolWrap}>{availableSymbols.map(row=><Pressable key={row.symbol} onPress={()=>toggleSymbol(row.symbol)} style={[styles.symbolChip,value.selectedSymbols.includes(row.symbol)&&styles.choiceActive]}><Text style={[styles.choiceText,value.selectedSymbols.includes(row.symbol)&&styles.choiceTextActive]}>{row.symbol}</Text></Pressable>)}</View>:<Text style={styles.note}>沒有持股時顯示全部 Snapshot 標的。</Text>}
    </Section>

    <Section title="字體與版面">
      <Step label="全局字體" value={Math.round(value.style.fontScale*100)} min={70} max={180} step={5} suffix="%" onChange={n=>patchStyle({fontScale:n/100})}/>
      <Step label="標題字體" value={Math.round(value.style.titleFontScale*100)} min={70} max={180} step={5} suffix="%" onChange={n=>patchStyle({titleFontScale:n/100})}/>
      <Step label="數值字體" value={Math.round(value.style.valueFontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>patchStyle({valueFontScale:n/100})}/>
      <Step label="內距" value={value.style.padding} min={0} max={32} step={2} suffix=" px" onChange={padding=>patchStyle({padding})}/>
      <Step label="列間距" value={value.style.rowGap} min={0} max={24} step={2} suffix=" px" onChange={rowGap=>patchStyle({rowGap})}/>
      <Choice choices={['left','center','right'] as const} value={value.style.textAlign} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={textAlign=>patchStyle({textAlign})}/>
    </Section>

    <Section title="顏色與外觀">
      <ColorEditor label="背景" value={value.style.backgroundColor} onChange={backgroundColor=>patchStyle({backgroundColor})}/>
      <ColorEditor label="文字" value={value.style.textColor} onChange={textColor=>patchStyle({textColor})}/>
      <ColorEditor label="次要文字" value={value.style.secondaryTextColor} onChange={secondaryTextColor=>patchStyle({secondaryTextColor})}/>
      <ColorEditor label="上漲 / 獲利" value={value.style.gainColor} onChange={gainColor=>patchStyle({gainColor})}/>
      <ColorEditor label="下跌 / 虧損" value={value.style.lossColor} onChange={lossColor=>patchStyle({lossColor})}/>
      <ColorEditor label="邊框" value={value.style.borderColor} onChange={borderColor=>patchStyle({borderColor})}/>
      <Step label="背景透明度" value={Math.round(value.style.backgroundOpacity*100)} min={10} max={100} step={5} suffix="%" onChange={n=>patchStyle({backgroundOpacity:n/100})}/>
      <Step label="圓角" value={value.style.cornerRadius} min={0} max={40} step={2} suffix=" px" onChange={cornerRadius=>patchStyle({cornerRadius})}/>
      <Step label="邊框粗細" value={value.style.borderWidth} min={0} max={6} step={1} suffix=" px" onChange={borderWidth=>patchStyle({borderWidth})}/>
      <Toggle label="陰影" value={value.style.shadowEnabled} onChange={shadowEnabled=>patchStyle({shadowEnabled})}/>
    </Section>

    <Section title="特效">
      <Toggle label="允許動畫" value={value.effects.animationsEnabled} onChange={animationsEnabled=>patchEffects({animationsEnabled})}/>
      <EffectChoice label="刷新" value={value.effects.refresh} onChange={refresh=>patchEffects({refresh})}/>
      <EffectChoice label="上漲" value={value.effects.gain} onChange={gain=>patchEffects({gain})}/>
      <EffectChoice label="下跌" value={value.effects.loss} onChange={loss=>patchEffects({loss})}/>
      <EffectChoice label="警示" value={value.effects.alert} onChange={alert=>patchEffects({alert})}/>
    </Section>

    <Text style={styles.note}>Widget 只讀 Shared Snapshot；此編輯器不建立第二套帳務公式。</Text>
  </View>;
}

function Section({title,children}:{title:string;children:React.ReactNode}){return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;}
function Choice<T extends string>({choices,value,label,onChange}:{choices:readonly T[];value:T;label:(v:T)=>string;onChange:(v:T)=>void}){return <View style={styles.row}>{choices.map(item=><Pressable key={item} onPress={()=>onChange(item)} style={[styles.choice,value===item&&styles.choiceActive]}><Text style={[styles.choiceText,value===item&&styles.choiceTextActive]}>{label(item)}</Text></Pressable>)}</View>;}
function MiniButton({label,onPress}:{label:string;onPress:()=>void}){return <Pressable onPress={onPress} style={styles.miniButton}><Text style={styles.miniButtonText}>{label}</Text></Pressable>;}
function Step({label,value,min,max,step,suffix,onChange}:{label:string;value:number;min:number;max:number;step:number;suffix:string;onChange:(n:number)=>void}){return <View style={styles.stepRow}><Text style={styles.stepLabel}>{label}</Text><MiniButton label="−" onPress={()=>onChange(Math.max(min,value-step))}/><Text style={styles.stepValue}>{value}{suffix}</Text><MiniButton label="＋" onPress={()=>onChange(Math.min(max,value+step))}/></View>;}
function Toggle({label,value,onChange}:{label:string;value:boolean;onChange:(v:boolean)=>void}){return <Pressable onPress={()=>onChange(!value)} style={styles.toggleRow}><Text style={styles.stepLabel}>{label}</Text><Text style={[styles.toggleState,value&&styles.toggleStateOn]}>{value?'開':'關'}</Text></Pressable>;}
function EffectChoice({label,value,onChange}:{label:string;value:WidgetEffect;onChange:(v:WidgetEffect)=>void}){return <View><Text style={styles.label}>{label}</Text><Choice choices={effects} value={value} label={x=>effectLabels[x]} onChange={onChange}/></View>;}
function ColorEditor({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <View style={styles.colorBlock}><Text style={styles.label}>{label}</Text><View style={styles.row}>{palette.map(c=><Pressable key={c} onPress={()=>onChange(c)} style={[styles.colorDot,{backgroundColor:c},value.toUpperCase()===c&&styles.colorDotActive]}/>)}</View><TextInput autoCapitalize="characters" value={value} onChangeText={onChange} style={styles.colorInput}/></View>;}

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
  orderRow:{flexDirection:'row',alignItems:'center',gap:6},
  miniButton:{width:34,height:32,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
  miniButtonText:{fontSize:14,fontWeight:'900',color:colors.primary},
  stepRow:{flexDirection:'row',alignItems:'center',gap:6},
  stepLabel:{fontSize:10,fontWeight:'800',color:colors.text,flex:1},
  stepValue:{minWidth:62,textAlign:'center',fontSize:10,fontWeight:'900',color:colors.text},
  toggleRow:{minHeight:36,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  toggleState:{paddingHorizontal:10,paddingVertical:5,borderRadius:999,overflow:'hidden',backgroundColor:colors.surface,color:colors.textSecondary,fontSize:10,fontWeight:'900'},
  toggleStateOn:{backgroundColor:'#EFF6FF',color:colors.primary},
  colorBlock:{gap:6},
  colorDot:{width:28,height:28,borderRadius:14,borderWidth:1,borderColor:colors.border},
  colorDotActive:{borderWidth:3,borderColor:colors.primary},
  colorInput:{height:36,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface,paddingHorizontal:9,color:colors.text,fontSize:10,fontWeight:'800'},
  symbolWrap:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  symbolChip:{paddingHorizontal:8,paddingVertical:6,borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
});
