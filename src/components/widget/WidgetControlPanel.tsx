import { Pressable, StyleSheet, Text, View } from 'react-native';

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
import { ColorPalettePicker } from '../ColorPalettePicker';
import { DISPLAY_PALETTES } from '../../theme/displayPalettes';
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
const fields:readonly WidgetField[]=['appName','totalAssets','marketValue','cash','unrealizedPnl','realizedPnl','dividendIncome','totalReturn','symbol','name','price','change','changePercent','shares','avgCost','holdingMarketValue','pnl','roi','comprehensivePnl','marketStatus','updatedAt','dailyPnl','quote'];
const fieldLabels:Record<WidgetField,string>={
  appName:'App 名稱',totalAssets:'總資產',marketValue:'持股總市值',cash:'現金',unrealizedPnl:'未實現損益',realizedPnl:'已實現損益',
  dividendIncome:'股息收入',totalReturn:'總報酬',symbol:'ETF 代號',name:'ETF 名稱',price:'價格',change:'漲跌',changePercent:'漲跌%',
  shares:'股數',avgCost:'成本均價',holdingMarketValue:'單檔市值',pnl:'持股損益',roi:'報酬%',comprehensivePnl:'含息損益',
  marketStatus:'市場狀態',updatedAt:'最後更新',dailyPnl:'當日損益',quote:'行情'
};
const effects:readonly WidgetEffect[]=['none','fade','pulse','flash-on-change'];
const effectLabels:Record<WidgetEffect,string>={none:'無',fade:'淡入',pulse:'脈衝', 'flash-on-change':'變動閃爍'};
const sortKeys:readonly WidgetSortKey[]=['manual','symbol','price','changePercent'];
const sortLabels:Record<WidgetSortKey,string>={manual:'手動',symbol:'代號',price:'價格',changePercent:'漲跌%'};
export function WidgetControlPanel({ value, onChange, availableSymbols=[], previewSnapshot=null }: Props) {
  const previewHolding=sortWidgetHoldings(previewSnapshot,value)[0];
  const previewLines=value.fields.slice(0,widgetTemplateCapacity(value.template)).map(field=>({field,...widgetFieldText(previewSnapshot,previewHolding,field)}));
  const previewPct=previewHolding?.changePercent;
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
  const toggleProfitColor=(field:WidgetField)=>patch({profitColorFields:value.profitColorFields.includes(field)?value.profitColorFields.filter(x=>x!==field):[...value.profitColorFields,field]});
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
        {previewLines.map((line,index)=><Text key={index} numberOfLines={1} style={{color:line.profit&&value.profitColorFields.includes(line.field)?previewTone:value.style.textColor,fontWeight:index===0?'900':'800',fontSize:(index===0?14*value.style.titleFontScale:12*value.style.fontScale),textAlign:value.style.textAlign,marginTop:index===0?0:value.style.rowGap}}>{line.text}</Text>)}
        {!previewLines.length?<Text style={{color:value.style.secondaryTextColor}}>請選擇顯示項目</Text>:null}
      </View>
      <Text style={styles.note}>2×2 所有項目皆可選；實際顯示數量依樣式容量決定，已選項目依上／下順序顯示。</Text>
    </Section>

    <Section title="尺寸與模板">
      <Choice choices={sizes} value={value.size} label={x=>x==='2x2'?'2×2':x==='small'?'小型':x==='large'?'大型':'中型'} onChange={size=>patch({size})}/>
      <Choice choices={templates} value={value.template} label={x=>x==='asset-summary'?'資產摘要':x==='quote-summary'?'行情摘要':x==='compact'?'精簡':x==='advanced'?'進階資訊':x==='minimal'?'極簡':x==='quote-wall'?'行情牆':'透明'} onChange={template=>patch({template})}/>
      {value.template==='quote-wall'?<Step label="行情牆並排欄數" value={value.wallColumns} min={1} max={4} step={1} suffix=" 欄" onChange={wallColumns=>patch({wallColumns})}/>:null}
      <Toggle label="點擊 Widget 強制更新" value={value.forceRefreshOnTap} onChange={forceRefreshOnTap=>patch({forceRefreshOnTap})}/>
      <Choice choices={['home','portfolio','dividend'] as const} value={value.tapTarget} label={x=>x==='home'?'首頁':x==='portfolio'?'庫存':'股息'} onChange={tapTarget=>patch({tapTarget})}/>
    </Section>

    <Section title="顯示欄位與排序">
      {fields.map(field=>{
        const active=value.fields.includes(field);
        return <View key={field} style={styles.orderRow}>
          <Pressable onPress={()=>toggleField(field)} style={[styles.choice,active&&styles.choiceActive]}><Text style={[styles.choiceText,active&&styles.choiceTextActive]}>{fieldLabels[field]}</Text></Pressable>
          {active?<><MiniButton label="↑" onPress={()=>moveField(field,-1)}/><MiniButton label="↓" onPress={()=>moveField(field,1)}/><Pressable onPress={()=>toggleProfitColor(field)} style={[styles.profitButton,value.profitColorFields.includes(field)&&styles.profitButtonOn]}><Text style={[styles.profitButtonText,value.profitColorFields.includes(field)&&styles.profitButtonTextOn]}>損益色</Text></Pressable></>:null}
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

    <Section title="全局調色盤">
      <Text style={styles.note}>選一次套用整套 Widget 配色；下方個別顏色仍可再微調。</Text>
      <View style={styles.row}>{DISPLAY_PALETTES.map(palette=><Pressable key={palette.key} onPress={()=>patchStyle({
        backgroundColor:palette.backgroundColor,textColor:palette.textColor,secondaryTextColor:palette.secondaryTextColor,
        gainColor:palette.gainColor,lossColor:palette.lossColor,neutralColor:palette.neutralColor,
        borderColor:palette.borderColor,backgroundOpacity:palette.backgroundOpacity,
      })} style={styles.paletteCard}>
        <View style={[styles.palettePreview,{backgroundColor:palette.backgroundColor,borderColor:palette.borderColor}]}>
          <View style={[styles.paletteDot,{backgroundColor:palette.textColor}]}/><View style={[styles.paletteDot,{backgroundColor:palette.gainColor}]}/><View style={[styles.paletteDot,{backgroundColor:palette.lossColor}]}/>
        </View>
        <Text style={styles.choiceText}>{palette.label}</Text>
      </Pressable>)}</View>
    </Section>

    <Section title="顏色與外觀">
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
  profitButton:{paddingHorizontal:8,paddingVertical:6,borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  profitButtonOn:{borderColor:colors.primary,backgroundColor:'#EFF6FF'},
  profitButtonText:{fontSize:9,fontWeight:'900',color:colors.textSecondary},
  profitButtonTextOn:{color:colors.primary},
  symbolWrap:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  symbolChip:{paddingHorizontal:8,paddingVertical:6,borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  paletteCard:{gap:4,alignItems:'center'},palettePreview:{width:64,height:38,borderRadius:10,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4},paletteDot:{width:10,height:10,borderRadius:5},
});


function widgetFieldText(snapshot:SharedSnapshot|null,holding:SharedSnapshot['holdings'][number]|undefined,field:WidgetField):{text:string;profit:boolean}{
  const asset=snapshot?.asset;
  const money=(v:number|undefined)=>v==null?'--':Math.round(v).toLocaleString('zh-TW');
  const signedMoney=(v:number|undefined)=>v==null?'--':`${v>=0?'+':''}${Math.round(v).toLocaleString('zh-TW')}`;
  const signed2=(v:number|null|undefined,suffix='')=>v==null?'--':`${v>=0?'+':''}${v.toFixed(2)}${suffix}`;
  switch(field){
    case 'appName':return {text:'TF Asset',profit:false};
    case 'totalAssets':return {text:`總資產 NT$ ${money(asset?.totalAssets)}`,profit:false};
    case 'marketValue':return {text:`總市值 NT$ ${money(asset?.marketValue)}`,profit:false};
    case 'cash':return {text:`現金 NT$ ${money(asset?.cash)}`,profit:false};
    case 'unrealizedPnl':return {text:`未實現 ${signedMoney(asset?.unrealizedPnl)}`,profit:true};
    case 'realizedPnl':return {text:`已實現 ${signedMoney(asset?.realizedPnl)}`,profit:true};
    case 'dividendIncome':return {text:`股息 ${money(asset?.dividendIncome)}`,profit:false};
    case 'totalReturn':return {text:`總報酬 ${signedMoney(asset?.totalReturn)}`,profit:true};
    case 'symbol':return {text:holding?.symbol??'--',profit:false};
    case 'name':return {text:holding?.name??'--',profit:false};
    case 'price':return {text:`價格 ${holding?.price==null?'--':holding.price.toFixed(2)}`,profit:false};
    case 'change':return {text:`漲跌 ${signed2(holding?.change)}`,profit:true};
    case 'changePercent':return {text:`漲跌% ${signed2(holding?.changePercent,'%')}`,profit:true};
    case 'shares':return {text:`股數 ${holding?Math.round(holding.shares).toLocaleString('zh-TW'):'--'}`,profit:false};
    case 'avgCost':return {text:`成本均 ${holding?holding.avgCost.toFixed(2):'--'}`,profit:false};
    case 'holdingMarketValue':return {text:`單檔市值 ${money(holding?.marketValue)}`,profit:false};
    case 'pnl':return {text:`持股損益 ${signedMoney(holding?.pnl)}`,profit:true};
    case 'roi':return {text:`報酬% ${holding?signed2(holding.roi,'%'):'--'}`,profit:true};
    case 'comprehensivePnl':return {text:`含息損益 ${signedMoney(holding?.comprehensivePnl)}`,profit:true};
    case 'marketStatus':return {text:`狀態 ${holding?.marketStatus??'--'}`,profit:false};
    case 'updatedAt':return {text:`更新 ${holding?.updatedAt?new Date(holding.updatedAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}):'--'}`,profit:false};
    case 'dailyPnl':return {text:`當日損益 ${signed2(holding?.change)}`,profit:true};
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
