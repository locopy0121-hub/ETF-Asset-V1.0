import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  activeMonitorFields,activeMonitorLayout,activeMonitorStyle,enabledMiniColumns,moveMiniColumn,restoreNormalMonitor,setMonitorMode,sortMonitorHoldings,
  updateActiveMonitorLayout,updateActiveMonitorStyle,updateMiniColumn,updateMiniHeader,updateMonitorFields,
  type MiniColumnConfig,type MonitorConfig,type MonitorEffect,type MonitorField,type MonitorMode,type MonitorSortKey,type MonitorTemplate,
} from '../../monitor/monitorDomain';
import type { SharedSnapshot } from '../../domain/snapshot';
import { DISPLAY_PALETTES } from '../../theme/displayPalettes';
import { colors, radius, spacing } from '../../theme/tokens';

type Props={value:MonitorConfig;onChange:(value:MonitorConfig)=>void;availableSymbols?:readonly {symbol:string;name?:string}[];previewSnapshot?:SharedSnapshot|null};
const fields:readonly MonitorField[]=['symbol','name','price','change','changePercent','shares','avgCost','marketValue','pnl','roi','comprehensivePnl','marketStatus','updatedAt'];
const labels:Record<MonitorField,string>={symbol:'代號',name:'名稱',price:'價格',change:'漲跌',changePercent:'漲跌%',shares:'股數',avgCost:'成本均',marketValue:'市值',pnl:'損益',roi:'報酬%',comprehensivePnl:'含息損益',marketStatus:'市場狀態',updatedAt:'更新時間'};
const effects:readonly MonitorEffect[]=['none','fade','pulse','flash-on-change'];
const effectLabels:Record<MonitorEffect,string>={none:'無',fade:'淡入',pulse:'脈衝','flash-on-change':'變動閃爍'};
const sorts:readonly MonitorSortKey[]=['manual','symbol','price','changePercent'];
const sortLabels:Record<MonitorSortKey,string>={manual:'手動',symbol:'代號',price:'價格',changePercent:'漲跌%'};
const palette=['#0F172A','#FFFFFF','#F8FAFC','#0066FF','#EF4444','#10B981','#64748B','#F59E0B'];

export function MonitorControlPanel({value,onChange,availableSymbols=[],previewSnapshot=null}:Props){
  const layout=activeMonitorLayout(value),style=activeMonitorStyle(value),activeFields=activeMonitorFields(value);
  const previewRows=sortMonitorHoldings(previewSnapshot,value);
  const previewHolding=previewRows[0];
  const miniColumns=enabledMiniColumns(value);
  const previewSymbol=previewHolding?.symbol??'--';
  const previewName=previewHolding?.name??'等待資料';
  const previewPrice=previewHolding?.price;
  const previewPct=previewHolding?.changePercent;
  const previewTone=(previewPct??0)>=0?style.gainColor:style.lossColor;
  const patch=(p:Partial<MonitorConfig>)=>onChange({...value,...p});
  const patchLayout=(p:Partial<typeof layout>)=>onChange(updateActiveMonitorLayout(value,p));
  const patchStyle=(p:Partial<typeof style>)=>onChange(updateActiveMonitorStyle(value,p));
  const patchEffects=(p:Partial<MonitorConfig['effects']>)=>patch({effects:{...value.effects,...p}});
  const patchSort=(p:Partial<MonitorConfig['sort']>)=>patch({sort:{...value.sort,...p}});
  const toggleField=(field:MonitorField)=>onChange(updateMonitorFields(value,activeFields.includes(field)?activeFields.filter(x=>x!==field):[...activeFields,field]));
  const moveField=(field:MonitorField,d:number)=>{const a=[...activeFields],i=a.indexOf(field),j=i+d;if(i<0||j<0||j>=a.length)return;const left=a[i]!;const right=a[j]!;a[i]=right;a[j]=left;onChange(updateMonitorFields(value,a));};
  const toggleSymbol=(symbol:string)=>{const selected=value.selectedSymbols.includes(symbol)?value.selectedSymbols.filter(x=>x!==symbol):[...value.selectedSymbols,symbol];patch({selectedSymbols:selected,sort:{...value.sort,manualSymbols:selected}});};

  return <View style={styles.card}>
    <View style={styles.header}><View style={{flex:1}}><Text style={styles.title}>即時監控器編輯器</Text><Text style={styles.sub}>Normal / Mini 的尺寸與樣式完全分離；目前模式只修改目前模式。</Text></View><Pressable onPress={()=>patch({enabled:!value.enabled})} style={[styles.pill,value.enabled&&styles.pillActive]}><Text style={[styles.pillText,value.enabled&&styles.pillTextActive]}>{value.enabled?'已啟用':'未啟用'}</Text></Pressable></View>

    <Section title="模式與即時預覽">
      <Choice choices={['normal','mini'] as const} value={value.mode} label={x=>x==='normal'?'Normal':'Mini'} onChange={(mode:MonitorMode)=>onChange(setMonitorMode(value,mode))}/>
      {value.mode==='normal'?<Choice choices={['portfolio','quotes','compact','single','dual','advanced'] as const} value={value.template} label={(x:MonitorTemplate)=>x==='portfolio'?'投資組合':x==='quotes'?'行情列':x==='compact'?'極簡':x==='single'?'單檔大行情':x==='dual'?'雙檔行情':'進階資訊'} onChange={template=>patch({template})}/>:null}
      {value.mode==='mini'?<Pressable onPress={()=>onChange(restoreNormalMonitor(value))} style={styles.action}><Text style={styles.actionText}>模擬雙擊還原 Normal</Text></Pressable>:null}
      {value.mode==='mini'
        ?<View style={[styles.preview,{width:'100%',backgroundColor:style.backgroundColor,opacity:style.backgroundOpacity,borderRadius:style.cornerRadius,borderWidth:style.borderWidth,borderColor:style.borderColor,padding:style.padding}]}>
          {value.miniHeader.visible?<View style={[styles.miniTableRow,{minHeight:value.miniHeader.height,backgroundColor:value.miniHeader.backgroundColor,borderBottomColor:value.miniHeader.borderColor,borderBottomWidth:value.miniHeader.borderWidth}]}>
            {miniColumns.map((column,index)=><View key={column.field} style={{flex:column.widthPercent}}>
              <Text style={{color:value.miniHeader.textColor,fontSize:11*value.miniHeader.fontScale,fontWeight:'900',textAlign:column.align}}>{column.label}</Text>
            </View>)}
          </View>:null}
          {previewRows.map(row=><View key={row.symbol} style={styles.miniTableRow}>
            {miniColumns.map(column=><View key={column.field} style={{flex:column.widthPercent}}>
              <Text numberOfLines={1} style={{color:miniCellColor(row,column,style),fontSize:11*style.fontScale*column.fontScale,fontWeight:'800',textAlign:column.align}}>{miniCellText(row,column.field)}</Text>
            </View>)}
          </View>)}
          {!previewRows.length?<Text style={styles.note}>尚無持股資料</Text>:null}
        </View>
        :<View style={[styles.preview,{width:'100%',minHeight:130,backgroundColor:style.backgroundColor,opacity:style.backgroundOpacity,borderRadius:style.cornerRadius,borderWidth:style.borderWidth,borderColor:style.borderColor,padding:style.padding}]}>
          <Text style={{fontSize:13*style.titleFontScale,fontWeight:'900',color:style.textColor,textAlign:style.textAlign}}>{previewSymbol} {previewName}</Text>
          <Text style={{fontSize:18*style.valueFontScale,fontWeight:'900',color:style.textColor,textAlign:style.textAlign,marginTop:style.rowGap}}>{previewPrice==null?'等待資料':previewPrice.toFixed(2)}</Text>
          <Text style={{fontSize:11*style.fontScale,fontWeight:'800',color:previewTone,textAlign:style.textAlign,marginTop:style.rowGap}}>{previewPct==null?'':`${previewPct>=0?'+':''}${previewPct.toFixed(2)}%`}</Text>
        </View>}
    </Section>

    {value.mode==='mini'?<Section title="Mini A 項目列（母）">
      <Text style={styles.note}>A 只控制項目列本身；不直接修改 B 欄位內容。</Text>
      <Toggle label="顯示項目列" value={value.miniHeader.visible} onChange={visible=>onChange(updateMiniHeader(value,{visible}))}/>
      <Step label="項目列高度" value={value.miniHeader.height} min={22} max={56} step={2} suffix=" px" onChange={height=>onChange(updateMiniHeader(value,{height}))}/>
      <Step label="項目列字體" value={Math.round(value.miniHeader.fontScale*100)} min={70} max={160} step={5} suffix="%" onChange={n=>onChange(updateMiniHeader(value,{fontScale:n/100}))}/>
      <Color label="項目列背景" value={value.miniHeader.backgroundColor} onChange={backgroundColor=>onChange(updateMiniHeader(value,{backgroundColor}))}/>
      <Color label="項目列文字" value={value.miniHeader.textColor} onChange={textColor=>onChange(updateMiniHeader(value,{textColor}))}/>
      <Color label="項目列分隔線" value={value.miniHeader.borderColor} onChange={borderColor=>onChange(updateMiniHeader(value,{borderColor}))}/>
      <Step label="項目列分隔線" value={value.miniHeader.borderWidth} min={0} max={4} step={1} suffix=" px" onChange={borderWidth=>onChange(updateMiniHeader(value,{borderWidth}))}/>
    </Section>:null}

    {value.mode==='mini'?<Section title="Mini B 欄位（子）">
      <Text style={styles.note}>B 欄位只控制自己的顯示、順序、寬度、對齊、字體與損益色；資料列共用同一套 B 結構。</Text>
      {value.miniColumns.map((column,index)=><View key={column.field} style={styles.miniColumnCard}>
        <View style={styles.orderRow}>
          <Pressable onPress={()=>onChange(updateMiniColumn(value,column.field,{enabled:!column.enabled}))} style={[styles.choice,column.enabled&&styles.choiceActive]}>
            <Text style={[styles.choiceText,column.enabled&&styles.choiceTextActive]}>{column.label}</Text>
          </Pressable>
          <Mini label="↑" onPress={()=>onChange(moveMiniColumn(value,column.field,-1))}/>
          <Mini label="↓" onPress={()=>onChange(moveMiniColumn(value,column.field,1))}/>
        </View>
        <Text style={styles.positionHint}>第 {index+1} 欄 · 寬度 {column.widthPercent}% · {column.align==='left'?'靠左':column.align==='center'?'置中':'靠右'}</Text>
        {column.enabled?<View style={{gap:6}}>
          <TextInput value={column.label} onChangeText={label=>onChange(updateMiniColumn(value,column.field,{label}))} style={styles.input}/>
          <Step label="欄寬" value={column.widthPercent} min={10} max={60} step={2} suffix="%" onChange={widthPercent=>onChange(updateMiniColumn(value,column.field,{widthPercent}))}/>
          <Step label="字體" value={Math.round(column.fontScale*100)} min={70} max={160} step={5} suffix="%" onChange={n=>onChange(updateMiniColumn(value,column.field,{fontScale:n/100}))}/>
          <Choice choices={['left','center','right'] as const} value={column.align} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={align=>onChange(updateMiniColumn(value,column.field,{align}))}/>
          <Toggle label="套用損益色" value={column.useProfitColor} onChange={useProfitColor=>onChange(updateMiniColumn(value,column.field,{useProfitColor}))}/>
        </View>:null}
      </View>)}
    </Section>:null}

    <Section title="尺寸與位置">
      <Step label="寬度" value={layout.width} min={value.mode==='mini'?220:120} max={value.mode==='mini'?900:1200} step={10} suffix=" px" onChange={width=>patchLayout({width})}/>
      <Step label="高度" value={layout.height} min={value.mode==='mini'?120:56} max={value.mode==='mini'?800:1600} step={10} suffix=" px" onChange={height=>patchLayout({height})}/>
      <Step label="X" value={layout.x} min={-2000} max={2000} step={8} suffix="" onChange={x=>patchLayout({x})}/>
      <Step label="Y" value={layout.y} min={-2000} max={2000} step={8} suffix="" onChange={y=>patchLayout({y})}/>
      <Pressable onPress={()=>patchLayout({x:16,y:120})} style={styles.action}><Text style={styles.actionText}>重設目前模式位置</Text></Pressable>
    </Section>

    <Section title="欄位與 ETF 排序">
      {fields.map(field=>{const active=activeFields.includes(field);return <View key={field} style={styles.orderRow}><Pressable onPress={()=>toggleField(field)} style={[styles.choice,active&&styles.choiceActive]}><Text style={[styles.choiceText,active&&styles.choiceTextActive]}>{labels[field]}</Text></Pressable>{active?<><Mini label="↑" onPress={()=>moveField(field,-1)}/><Mini label="↓" onPress={()=>moveField(field,1)}/></>:null}</View>;})}
      <Choice choices={sorts} value={value.sort.key} label={x=>sortLabels[x]} onChange={key=>patchSort({key})}/>
      {value.sort.key!=='manual'?<Choice choices={['asc','desc'] as const} value={value.sort.direction} label={x=>x==='asc'?'小→大':'大→小'} onChange={direction=>patchSort({direction})}/>:null}
      <View style={styles.row}>{availableSymbols.map(row=><Pressable key={row.symbol} onPress={()=>toggleSymbol(row.symbol)} style={[styles.choice,value.selectedSymbols.includes(row.symbol)&&styles.choiceActive]}><Text style={[styles.choiceText,value.selectedSymbols.includes(row.symbol)&&styles.choiceTextActive]}>{row.symbol}</Text></Pressable>)}</View>
    </Section>

    <Section title="字體與版面">
      <Step label="全局字體" value={Math.round(style.fontScale*100)} min={70} max={180} step={5} suffix="%" onChange={n=>patchStyle({fontScale:n/100})}/>
      <Step label="標題字體" value={Math.round(style.titleFontScale*100)} min={70} max={180} step={5} suffix="%" onChange={n=>patchStyle({titleFontScale:n/100})}/>
      <Step label="數值字體" value={Math.round(style.valueFontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>patchStyle({valueFontScale:n/100})}/>
      <Step label="內距" value={style.padding} min={0} max={32} step={2} suffix=" px" onChange={padding=>patchStyle({padding})}/>
      <Step label="列間距" value={style.rowGap} min={0} max={24} step={2} suffix=" px" onChange={rowGap=>patchStyle({rowGap})}/>
      <Choice choices={['left','center','right'] as const} value={style.textAlign} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={textAlign=>patchStyle({textAlign})}/>
    </Section>

    <Section title="全局調色盤">
      <Text style={styles.note}>選一次套用 Normal、Mini 與 Mini 項目列的整套配色；B 欄位結構與位置不受影響。</Text>
      <View style={styles.row}>{DISPLAY_PALETTES.map(palette=><Pressable key={palette.key} onPress={()=>onChange({
        ...value,
        normalStyle:{...value.normalStyle,backgroundColor:palette.backgroundColor,textColor:palette.textColor,secondaryTextColor:palette.secondaryTextColor,gainColor:palette.gainColor,lossColor:palette.lossColor,neutralColor:palette.neutralColor,borderColor:palette.borderColor,backgroundOpacity:palette.backgroundOpacity},
        miniStyle:{...value.miniStyle,backgroundColor:palette.backgroundColor,textColor:palette.textColor,secondaryTextColor:palette.secondaryTextColor,gainColor:palette.gainColor,lossColor:palette.lossColor,neutralColor:palette.neutralColor,borderColor:palette.borderColor,backgroundOpacity:palette.backgroundOpacity},
        miniHeader:{...value.miniHeader,backgroundColor:palette.backgroundColor,textColor:palette.secondaryTextColor,borderColor:palette.borderColor,backgroundOpacity:Math.min(1,palette.backgroundOpacity+.04)},
      })} style={styles.paletteCard}>
        <View style={[styles.palettePreview,{backgroundColor:palette.backgroundColor,borderColor:palette.borderColor}]}>
          <View style={[styles.paletteDot,{backgroundColor:palette.textColor}]}/><View style={[styles.paletteDot,{backgroundColor:palette.gainColor}]}/><View style={[styles.paletteDot,{backgroundColor:palette.lossColor}]}/>
        </View>
        <Text style={styles.choiceText}>{palette.label}</Text>
      </Pressable>)}</View>
    </Section>

    <Section title="顏色、透明度與外觀">
      <Color label="背景" value={style.backgroundColor} onChange={backgroundColor=>patchStyle({backgroundColor})}/>
      <Color label="文字" value={style.textColor} onChange={textColor=>patchStyle({textColor})}/>
      <Color label="次要文字" value={style.secondaryTextColor} onChange={secondaryTextColor=>patchStyle({secondaryTextColor})}/>
      <Color label="上漲 / 獲利" value={style.gainColor} onChange={gainColor=>patchStyle({gainColor})}/>
      <Color label="下跌 / 虧損" value={style.lossColor} onChange={lossColor=>patchStyle({lossColor})}/>
      <Color label="邊框" value={style.borderColor} onChange={borderColor=>patchStyle({borderColor})}/>
      <Step label="背景透明度" value={Math.round(style.backgroundOpacity*100)} min={10} max={100} step={5} suffix="%" onChange={n=>patchStyle({backgroundOpacity:n/100})}/>
      <Step label="圓角" value={style.cornerRadius} min={0} max={40} step={2} suffix=" px" onChange={cornerRadius=>patchStyle({cornerRadius})}/>
      <Step label="邊框" value={style.borderWidth} min={0} max={6} step={1} suffix=" px" onChange={borderWidth=>patchStyle({borderWidth})}/>
      <Toggle label="陰影" value={style.shadowEnabled} onChange={shadowEnabled=>patchStyle({shadowEnabled})}/>
      <Toggle label="最上層顯示" value={value.alwaysOnTop} onChange={alwaysOnTop=>patch({alwaysOnTop})}/>
    </Section>

    <Section title="特效、呼吸燈與警報">
      <Toggle label="允許動畫" value={value.effects.animationsEnabled} onChange={animationsEnabled=>patchEffects({animationsEnabled})}/>
      <Toggle label="刷新呼吸燈" value={value.showBreathingLight} onChange={showBreathingLight=>patch({showBreathingLight})}/>
      <Effect label="刷新" value={value.effects.refresh} onChange={refresh=>patchEffects({refresh})}/>
      <Effect label="上漲" value={value.effects.gain} onChange={gain=>patchEffects({gain})}/>
      <Effect label="下跌" value={value.effects.loss} onChange={loss=>patchEffects({loss})}/>
      <Effect label="警報" value={value.effects.alert} onChange={alert=>patchEffects({alert})}/>
      <Text style={styles.label}>漲跌幅警報門檻（%）</Text>
      <TextInput keyboardType="decimal-pad" value={value.alertChangePct==null?'':String(value.alertChangePct)} onChangeText={t=>patch({alertChangePct:t.trim()===''?null:Math.max(0,Number(t)||0)})} style={styles.input}/>
    </Section>

    <Text style={styles.note}>Monitor 只讀 Shared Snapshot；拖曳/Resize 後只回寫目前模式 Layout，不會改另一模式。</Text>
  </View>;
}
function Section({title,children}:{title:string;children:React.ReactNode}){return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;}
function Choice<T extends string>({choices,value,label,onChange}:{choices:readonly T[];value:T;label:(x:T)=>string;onChange:(x:T)=>void}){return <View style={styles.row}>{choices.map(x=><Pressable key={x} onPress={()=>onChange(x)} style={[styles.choice,value===x&&styles.choiceActive]}><Text style={[styles.choiceText,value===x&&styles.choiceTextActive]}>{label(x)}</Text></Pressable>)}</View>;}
function Mini({label,onPress}:{label:string;onPress:()=>void}){return <Pressable onPress={onPress} style={styles.mini}><Text style={styles.miniText}>{label}</Text></Pressable>;}
function Step({label,value,min,max,step,suffix,onChange}:{label:string;value:number;min:number;max:number;step:number;suffix:string;onChange:(x:number)=>void}){return <View style={styles.step}><Text style={styles.stepLabel}>{label}</Text><Mini label="−" onPress={()=>onChange(Math.max(min,value-step))}/><Text style={styles.stepValue}>{value}{suffix}</Text><Mini label="＋" onPress={()=>onChange(Math.min(max,value+step))}/></View>;}
function Toggle({label,value,onChange}:{label:string;value:boolean;onChange:(x:boolean)=>void}){return <Pressable onPress={()=>onChange(!value)} style={styles.toggle}><Text style={styles.stepLabel}>{label}</Text><Text style={[styles.state,value&&styles.stateOn]}>{value?'開':'關'}</Text></Pressable>;}
function Effect({label,value,onChange}:{label:string;value:MonitorEffect;onChange:(x:MonitorEffect)=>void}){return <View><Text style={styles.label}>{label}</Text><Choice choices={effects} value={value} label={x=>effectLabels[x]} onChange={onChange}/></View>;}
function Color({label,value,onChange}:{label:string;value:string;onChange:(x:string)=>void}){return <View style={{gap:6}}><Text style={styles.label}>{label}</Text><View style={styles.row}>{palette.map(c=><Pressable key={c} onPress={()=>onChange(c)} style={[styles.dot,{backgroundColor:c},value.toUpperCase()===c&&styles.dotActive]}/>)}</View><TextInput autoCapitalize="characters" value={value} onChangeText={onChange} style={styles.input}/></View>;}

const styles=StyleSheet.create({
 card:{backgroundColor:colors.surfaceMuted,borderRadius:radius.lg,padding:spacing.md,borderWidth:1,borderColor:colors.border,gap:10},
 header:{flexDirection:'row',alignItems:'center',gap:8},title:{fontSize:14,fontWeight:'900',color:colors.text},sub:{fontSize:10,lineHeight:15,color:colors.textSecondary,marginTop:2},
 pill:{paddingHorizontal:10,paddingVertical:7,borderRadius:999,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},pillActive:{backgroundColor:colors.primary,borderColor:colors.primary},pillText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},pillTextActive:{color:'#fff'},
 section:{gap:8,paddingTop:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},sectionTitle:{fontSize:11,fontWeight:'900',color:colors.text},
 row:{flexDirection:'row',gap:6,flexWrap:'wrap'},choice:{paddingHorizontal:9,paddingVertical:7,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},choiceActive:{borderColor:colors.primary,backgroundColor:'#EFF6FF'},choiceText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},choiceTextActive:{color:colors.primary},
 preview:{justifyContent:'center'},action:{minHeight:36,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},actionText:{fontSize:10,fontWeight:'900',color:'#fff'},
 orderRow:{flexDirection:'row',alignItems:'center',gap:6},mini:{width:34,height:32,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},miniText:{fontSize:14,fontWeight:'900',color:colors.primary},
 step:{flexDirection:'row',alignItems:'center',gap:6},stepLabel:{fontSize:10,fontWeight:'800',color:colors.text,flex:1},stepValue:{minWidth:64,textAlign:'center',fontSize:10,fontWeight:'900',color:colors.text},
 toggle:{minHeight:36,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},state:{paddingHorizontal:10,paddingVertical:5,borderRadius:999,overflow:'hidden',backgroundColor:colors.surface,color:colors.textSecondary,fontSize:10,fontWeight:'900'},stateOn:{backgroundColor:'#EFF6FF',color:colors.primary},
 label:{fontSize:10,fontWeight:'900',color:colors.textSecondary},input:{height:36,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface,paddingHorizontal:9,color:colors.text,fontSize:10,fontWeight:'800'},
 dot:{width:28,height:28,borderRadius:14,borderWidth:1,borderColor:colors.border},dotActive:{borderWidth:3,borderColor:colors.primary},note:{fontSize:9,lineHeight:14,color:colors.textSecondary},miniTableRow:{flexDirection:'row',alignItems:'center',gap:6,minHeight:28,paddingHorizontal:4},miniColumnCard:{gap:6,padding:8,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface},positionHint:{fontSize:9,fontWeight:'800',color:colors.primary},
 paletteCard:{gap:4,alignItems:'center'},palettePreview:{width:64,height:38,borderRadius:10,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4},paletteDot:{width:10,height:10,borderRadius:5}
});


function miniCellText(row:NonNullable<SharedSnapshot['holdings'][number]>,field:MonitorField){
  switch(field){
    case 'symbol':return row.symbol;
    case 'name':return row.name;
    case 'price':return row.price==null?'--':row.price.toFixed(2);
    case 'change':return row.change==null?'--':`${row.change>=0?'+':''}${row.change.toFixed(2)}`;
    case 'changePercent':return row.changePercent==null?'--':`${row.changePercent>=0?'+':''}${row.changePercent.toFixed(2)}%`;
    case 'shares':return Math.round(row.shares).toLocaleString('zh-TW');
    case 'avgCost':return row.avgCost.toFixed(2);
    case 'marketValue':return Math.round(row.marketValue).toLocaleString('zh-TW');
    case 'pnl':return `${row.pnl>=0?'+':''}${Math.round(row.pnl).toLocaleString('zh-TW')}`;
    case 'roi':return `${row.roi>=0?'+':''}${row.roi.toFixed(2)}%`;
    case 'comprehensivePnl':return `${row.comprehensivePnl>=0?'+':''}${Math.round(row.comprehensivePnl).toLocaleString('zh-TW')}`;
    case 'marketStatus':return row.marketStatus;
    case 'updatedAt':return row.updatedAt?new Date(row.updatedAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}):'--';
  }
}
function miniCellColor(row:SharedSnapshot['holdings'][number],column:MiniColumnConfig,style:MonitorConfig['miniStyle']){
  if(!column.useProfitColor)return style.textColor;
  const value=column.field==='change'?row.change:column.field==='changePercent'?row.changePercent:column.field==='roi'?row.roi:column.field==='comprehensivePnl'?row.comprehensivePnl:column.field==='pnl'?row.pnl:null;
  return value==null?style.neutralColor:value>0?style.gainColor:value<0?style.lossColor:style.neutralColor;
}
