import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ITEM_EFFECT_INTENSITIES,ITEM_EFFECT_KINDS,ITEM_EFFECT_SPEEDS,ITEM_EFFECT_TRIGGERS,
  type ItemEffectConfig,type ItemEffectIntensity,type ItemEffectKind,type ItemEffectSpeed,type ItemEffectTrigger,type ItemVisualOverride,
} from '../../domain/displayItemContract';
import {
  MONITOR_FIELDS,MONITOR_FIELD_LABELS,activeMonitorLayout,activeMonitorStyle,enabledMiniColumns,enabledMiniStatusItems,monitorItem,moveMiniColumn,moveMiniStatusItem,restoreNormalMonitor,setMonitorMode,sortMonitorHoldings,
  updateActiveMonitorLayout,updateActiveMonitorStyle,updateMiniColumn,updateMiniHeader,updateMiniStatusBar,updateMiniStatusItem,updateMonitorFields,updateMonitorWall,updateMonitorWallLayout,updateNormalItem,
  type MiniColumnConfig,type MiniStatusItemConfig,type MonitorConfig,type MonitorEffect,type MonitorField,type MonitorMode,type MonitorSortKey,type MonitorTemplate,
} from '../../monitor/monitorDomain';
import type { SharedSnapshot } from '../../domain/snapshot';
import { ColorPalettePicker } from '../ColorPalettePicker';
import { colors, radius, spacing } from '../../theme/tokens';

type Props={value:MonitorConfig;onChange:(value:MonitorConfig)=>void;availableSymbols?:readonly {symbol:string;name?:string}[];previewSnapshot?:SharedSnapshot|null};
const effects:readonly MonitorEffect[]=['none','fade','pulse','flash-on-change'];
const effectLabels:Record<MonitorEffect,string>={none:'無',fade:'淡入',pulse:'脈衝','flash-on-change':'變動閃爍'};
const itemEffectLabels:Record<ItemEffectKind,string>={none:'無',fade:'淡入',pulse:'脈衝','flash-on-change':'變動閃爍',bounce:'跳動'};
const triggerLabels:Record<ItemEffectTrigger,string>={always:'常駐',refresh:'刷新',change:'數值變動',gain:'上漲',loss:'下跌',alert:'警報'};
const speedLabels:Record<ItemEffectSpeed,string>={slow:'慢',normal:'正常',fast:'快'};
const intensityLabels:Record<ItemEffectIntensity,string>={soft:'弱',medium:'中',strong:'強'};
const sorts:readonly MonitorSortKey[]=['manual','symbol','price','changePercent'];
const sortLabels:Record<MonitorSortKey,string>={manual:'手動',symbol:'代號',price:'價格',changePercent:'漲跌%'};

export function MonitorControlPanel({value,onChange,availableSymbols=[],previewSnapshot=null}:Props){
  const [editingKey,setEditingKey]=useState<string|null>(null);
  const layout=activeMonitorLayout(value),style=activeMonitorStyle(value);
  const previewRows=sortMonitorHoldings(previewSnapshot,value);
  const miniColumns=enabledMiniColumns(value);
  const miniStatusItems=enabledMiniStatusItems(value);
  const wall=value.normalWall;
  const wallLayout=value.normalWallLayout;
  const patch=(p:Partial<MonitorConfig>)=>onChange({...value,...p});
  const patchLayout=(p:Partial<typeof layout>)=>onChange(updateActiveMonitorLayout(value,p));
  const patchStyle=(p:Partial<typeof style>)=>onChange(updateActiveMonitorStyle(value,p));
  const patchEffects=(p:Partial<MonitorConfig['effects']>)=>patch({effects:{...value.effects,...p}});
  const patchSort=(p:Partial<MonitorConfig['sort']>)=>patch({sort:{...value.sort,...p}});
  const toggleNormalField=(field:MonitorField)=>onChange(updateMonitorFields(value,value.fields.includes(field)?value.fields.filter(x=>x!==field):[...value.fields,field]));
  const moveNormalField=(field:MonitorField,d:number)=>{const a=[...value.fields],i=a.indexOf(field),j=i+d;if(i<0||j<0||j>=a.length)return;const t=a[i]!;a[i]=a[j]!;a[j]=t;onChange(updateMonitorFields(value,a));};
  const patchNormalVisual=(field:MonitorField,p:Partial<ItemVisualOverride>)=>{const item=monitorItem(value,field);onChange(updateNormalItem(value,field,{visual:{...item.visual,...p}}));};
  const patchNormalEffect=(field:MonitorField,p:Partial<ItemEffectConfig>)=>{const item=monitorItem(value,field);patchNormalVisual(field,{effect:{...item.visual.effect,...p}});};
  const toggleSymbol=(symbol:string)=>{const selected=value.selectedSymbols.includes(symbol)?value.selectedSymbols.filter(x=>x!==symbol):[...value.selectedSymbols,symbol];patch({selectedSymbols:selected,sort:{...value.sort,manualSymbols:selected}});};
  const patchWall=(next:typeof wall)=>onChange(updateMonitorWall(value,next));
  const patchWallHeader=(p:Partial<typeof wall.header>)=>patchWall({...wall,header:{...wall.header,...p}});
  const patchWallHeaderEffect=(p:Partial<ItemEffectConfig>)=>patchWallHeader({effect:{...wall.header.effect,...p}});
  const patchWallField=(field:typeof wall.fields[number]['field'],p:Partial<typeof wall.fields[number]>)=>patchWall({...wall,fields:wall.fields.map(x=>x.field===field?{...x,...p}:x)});
  const patchWallFieldEffect=(field:typeof wall.fields[number]['field'],p:Partial<ItemEffectConfig>)=>{const current=wall.fields.find(x=>x.field===field);if(current)patchWallField(field,{effect:{...current.effect,...p}});};
  const moveWallField=(field:typeof wall.fields[number]['field'],d:number)=>{const a=[...wall.fields],i=a.findIndex(x=>x.field===field),j=i+d;if(i<0||j<0||j>=a.length)return;const t=a[i]!;a[i]=a[j]!;a[j]=t;patchWall({...wall,fields:a});};
  const wallRows=chunk(previewRows,wallLayout.columns);

  return <View style={styles.card}>
    <View style={styles.header}><View style={{flex:1}}><Text style={styles.title}>即時監控器編輯器</Text><Text style={styles.sub}>Normal / Mini 物理隔離；A 選項目，B 只編輯目前單項，上一個 B 自動收合。</Text></View><Pressable onPress={()=>patch({enabled:!value.enabled})} style={[styles.pill,value.enabled&&styles.pillActive]}><Text style={[styles.pillText,value.enabled&&styles.pillTextActive]}>{value.enabled?'已啟用':'未啟用'}</Text></Pressable></View>

    <Section title="模式與即時預覽">
      <Choice choices={['normal','mini'] as const} value={value.mode} label={x=>x==='normal'?'Normal':'Mini'} onChange={(mode:MonitorMode)=>onChange(setMonitorMode(value,mode))}/>
      {value.mode==='normal'?<Choice choices={['portfolio','quotes','compact','single','dual','advanced','market-wall','heatmap','pnl-wall','weight-wall','ticker','terminal'] as const} value={value.template} label={(x:MonitorTemplate)=>x==='portfolio'?'投資組合':x==='quotes'?'行情列':x==='compact'?'極簡':x==='single'?'單檔大行情':x==='dual'?'雙檔行情':x==='advanced'?'進階資訊':x==='market-wall'?'行情牆':x==='heatmap'?'漲跌熱圖':x==='pnl-wall'?'損益牆':x==='weight-wall'?'資產權重牆':x==='ticker'?'跑馬行情':'純文字終端'} onChange={template=>patch({template})}/>:null}
      {value.mode==='mini'?<Pressable onPress={()=>onChange(restoreNormalMonitor(value))} style={styles.action}><Text style={styles.actionText}>模擬雙擊還原 Normal</Text></Pressable>:null}
      <MonitorPreview value={value} snapshot={previewSnapshot} rows={previewRows} wallRows={wallRows}/>
    </Section>

    {value.mode==='normal'&&value.template!=='market-wall'?<Section title="Normal A 顯示項目（母） → B 單項細部">
      <Text style={styles.note}>所有 Normal 模板都有 A/B；A 控制顯示與順序，點 A 才展開該欄位的 B。</Text>
      {MONITOR_FIELDS.map(field=>{
        const item=monitorItem(value,field),active=value.fields.includes(field),selected=editingKey==='normal:'+field;
        return <View key={field} style={styles.miniColumnCard}>
          <View style={styles.orderRow}>
            <Pressable onPress={()=>setEditingKey(selected?null:'normal:'+field)} style={[styles.choice,selected&&styles.choiceActive]}><Text style={[styles.choiceText,selected&&styles.choiceTextActive]}>{item.label}</Text></Pressable>
            <Visibility active={active} onPress={()=>toggleNormalField(field)}/>
            {active?<><Mini label="↑" onPress={()=>moveNormalField(field,-1)}/><Mini label="↓" onPress={()=>moveNormalField(field,1)}/></>:null}
          </View>
          {selected?<View style={styles.bPanel}>
            <Text style={styles.bTitle}>B 單項細部：{MONITOR_FIELD_LABELS[field]}</Text>
            <TextInput value={item.label} onChangeText={label=>onChange(updateNormalItem(value,field,{label:label.slice(0,16)}))} style={styles.input}/>
            <ItemVisualEditor visual={item.visual} baseStyle={value.normalStyle} onChange={p=>patchNormalVisual(field,p)} onEffect={p=>patchNormalEffect(field,p)}/>
          </View>:null}
        </View>;
      })}
    </Section>:null}

    {value.mode==='mini'?<Section title="Mini A 項目列（母）">
      <Text style={styles.note}>A 只控制項目列本身，不直接修改 B 欄位。</Text>
      <Toggle label="顯示項目列" value={value.miniHeader.visible} onChange={visible=>onChange(updateMiniHeader(value,{visible}))}/>
      <Step label="項目列高度" value={value.miniHeader.height} min={22} max={56} step={2} suffix=" px" onChange={height=>onChange(updateMiniHeader(value,{height}))}/>
      <Step label="項目列字體" value={Math.round(value.miniHeader.fontScale*100)} min={70} max={160} step={5} suffix="%" onChange={n=>onChange(updateMiniHeader(value,{fontScale:n/100}))}/>
      <ColorPalettePicker label="項目列背景" value={value.miniHeader.backgroundColor} onChange={backgroundColor=>onChange(updateMiniHeader(value,{backgroundColor}))}/>
      <ColorPalettePicker label="項目列文字" value={value.miniHeader.textColor} onChange={textColor=>onChange(updateMiniHeader(value,{textColor}))}/>
      <ColorPalettePicker label="項目列分隔線" value={value.miniHeader.borderColor} onChange={borderColor=>onChange(updateMiniHeader(value,{borderColor}))}/>
      <Step label="項目列分隔線" value={value.miniHeader.borderWidth} min={0} max={4} step={1} suffix=" px" onChange={borderWidth=>onChange(updateMiniHeader(value,{borderWidth}))}/>
      <EffectEditor value={value.miniHeader.effect} onChange={p=>onChange(updateMiniHeader(value,{effect:{...value.miniHeader.effect,...p}}))}/>
    </Section>:null}

    {value.mode==='mini'?<Section title="Mini B 欄位（子）">
      <Text style={styles.note}>一次只展開一個 B；資料列共用同一套 B 結構。</Text>
      {value.miniColumns.map((column,index)=>{
        const selected=editingKey==='mini:'+column.field;
        return <View key={column.field} style={styles.miniColumnCard}>
          <View style={styles.orderRow}>
            <Pressable onPress={()=>setEditingKey(selected?null:'mini:'+column.field)} style={[styles.choice,selected&&styles.choiceActive]}><Text style={[styles.choiceText,selected&&styles.choiceTextActive]}>{column.label}</Text></Pressable>
            <Visibility active={column.enabled} onPress={()=>onChange(updateMiniColumn(value,column.field,{enabled:!column.enabled}))}/>
            <Mini label="↑" onPress={()=>onChange(moveMiniColumn(value,column.field,-1))}/><Mini label="↓" onPress={()=>onChange(moveMiniColumn(value,column.field,1))}/>
          </View>
          <Text style={styles.positionHint}>第 {index+1} 欄 · 寬度 {column.widthPercent}% · {column.align==='left'?'靠左':column.align==='center'?'置中':'靠右'}</Text>
          {selected?<View style={styles.bPanel}>
            <Text style={styles.bTitle}>B 單項細部</Text>
            <TextInput value={column.label} onChangeText={label=>onChange(updateMiniColumn(value,column.field,{label:label.slice(0,12)}))} style={styles.input}/>
            <Step label="欄寬" value={column.widthPercent} min={10} max={60} step={2} suffix="%" onChange={widthPercent=>onChange(updateMiniColumn(value,column.field,{widthPercent}))}/>
            <Step label="字體" value={Math.round(column.fontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>onChange(updateMiniColumn(value,column.field,{fontScale:n/100}))}/>
            <Choice choices={['left','center','right'] as const} value={column.align} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={align=>onChange(updateMiniColumn(value,column.field,{align}))}/>
            <Toggle label="套用損益色" value={column.useProfitColor} onChange={useProfitColor=>onChange(updateMiniColumn(value,column.field,{useProfitColor}))}/>
            <NullableColor label="單項文字顏色" value={column.textColor} fallback={value.miniStyle.textColor} onChange={textColor=>onChange(updateMiniColumn(value,column.field,{textColor}))}/>
            <NullableColor label="單項背景" value={column.backgroundColor} fallback={value.miniStyle.backgroundColor} onChange={backgroundColor=>onChange(updateMiniColumn(value,column.field,{backgroundColor}))}/>
            <NullableGap value={column.lineGap} fallback={value.miniStyle.rowGap} onChange={lineGap=>onChange(updateMiniColumn(value,column.field,{lineGap}))}/>
            <Step label="上下內距" value={column.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>onChange(updateMiniColumn(value,column.field,{paddingY}))}/>
            <EffectEditor value={column.effect} onChange={p=>onChange(updateMiniColumn(value,column.field,{effect:{...column.effect,...p}}))}/>
          </View>:null}
        </View>;
      })}
    </Section>:null}

    {value.mode==='mini'?<Section title="Mini 下方狀態列 A/B">
      <Toggle label="顯示下方狀態列" value={value.miniStatusBar.visible} onChange={visible=>onChange(updateMiniStatusBar(value,{visible}))}/>
      <Step label="狀態列高度" value={value.miniStatusBar.height} min={24} max={96} step={2} suffix=" px" onChange={height=>onChange(updateMiniStatusBar(value,{height}))}/>
      <Step label="每列欄數" value={value.miniStatusBar.columns} min={1} max={4} step={1} suffix=" 欄" onChange={columns=>onChange(updateMiniStatusBar(value,{columns}))}/>
      <Step label="狀態列字體" value={Math.round(value.miniStatusBar.fontScale*100)} min={70} max={160} step={5} suffix="%" onChange={n=>onChange(updateMiniStatusBar(value,{fontScale:n/100}))}/>
      <ColorPalettePicker label="狀態列背景" value={value.miniStatusBar.backgroundColor} onChange={backgroundColor=>onChange(updateMiniStatusBar(value,{backgroundColor}))}/>
      <ColorPalettePicker label="狀態列文字" value={value.miniStatusBar.textColor} onChange={textColor=>onChange(updateMiniStatusBar(value,{textColor}))}/>
      {value.miniStatusItems.map((item,index)=>{
        const selected=editingKey==='status:'+item.field;
        return <View key={item.field} style={styles.miniColumnCard}>
          <View style={styles.orderRow}>
            <Pressable onPress={()=>setEditingKey(selected?null:'status:'+item.field)} style={[styles.choice,selected&&styles.choiceActive]}><Text style={[styles.choiceText,selected&&styles.choiceTextActive]}>{item.label}</Text></Pressable>
            <Visibility active={item.enabled} onPress={()=>onChange(updateMiniStatusItem(value,item.field,{enabled:!item.enabled}))}/>
            <Mini label="↑" onPress={()=>onChange(moveMiniStatusItem(value,item.field,-1))}/><Mini label="↓" onPress={()=>onChange(moveMiniStatusItem(value,item.field,1))}/>
          </View>
          <Text style={styles.positionHint}>第 {index+1} 項</Text>
          {selected?<View style={styles.bPanel}>
            <TextInput value={item.label} onChangeText={label=>onChange(updateMiniStatusItem(value,item.field,{label:label.slice(0,12)}))} style={styles.input}/>
            <Step label="單項字體" value={Math.round(item.fontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>onChange(updateMiniStatusItem(value,item.field,{fontScale:n/100}))}/>
            <Choice choices={['left','center','right'] as const} value={item.align} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={align=>onChange(updateMiniStatusItem(value,item.field,{align}))}/>
            <Toggle label="套用損益色" value={item.useProfitColor} onChange={useProfitColor=>onChange(updateMiniStatusItem(value,item.field,{useProfitColor}))}/>
            <NullableColor label="單項文字顏色" value={item.textColor} fallback={value.miniStatusBar.textColor} onChange={textColor=>onChange(updateMiniStatusItem(value,item.field,{textColor}))}/>
            <NullableColor label="單項背景" value={item.backgroundColor} fallback={value.miniStatusBar.backgroundColor} onChange={backgroundColor=>onChange(updateMiniStatusItem(value,item.field,{backgroundColor}))}/>
            <NullableGap value={item.lineGap} fallback={value.miniStyle.rowGap} onChange={lineGap=>onChange(updateMiniStatusItem(value,item.field,{lineGap}))}/>
            <Step label="上下內距" value={item.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>onChange(updateMiniStatusItem(value,item.field,{paddingY}))}/>
            <EffectEditor value={item.effect} onChange={p=>onChange(updateMiniStatusItem(value,item.field,{effect:{...item.effect,...p}}))}/>
          </View>:null}
        </View>;
      })}
    </Section>:null}

    {value.mode==='normal'&&value.template==='market-wall'?<Section title="主體行情牆框架">
      <Text style={styles.note}>框架只控制行情卡排列；卡片內 A/B 由下一區獨立編輯。</Text>
      <Step label="並排欄數" value={wallLayout.columns} min={1} max={4} step={1} suffix=" 欄" onChange={columns=>onChange(updateMonitorWallLayout(value,{columns}))}/>
      <Step label="水平間距" value={wallLayout.columnGap} min={0} max={32} step={2} suffix=" px" onChange={columnGap=>onChange(updateMonitorWallLayout(value,{columnGap}))}/>
      <Step label="垂直間距" value={wallLayout.rowGap} min={0} max={32} step={2} suffix=" px" onChange={rowGap=>onChange(updateMonitorWallLayout(value,{rowGap}))}/>
    </Section>:null}

    {value.mode==='normal'&&value.template==='market-wall'?<Section title="主體行情牆 A/B 編輯">
      <Text style={styles.note}>A 控制標題列；B 每個欄位有自己的字體、顏色、背景、對齊、行距與特效。</Text>
      <Toggle label="A 標題列顯示" value={wall.header.visible} onChange={visible=>patchWallHeader({visible})}/>
      <Step label="A 標題列字體" value={Math.round(wall.header.fontScale*100)} min={70} max={180} step={5} suffix="%" onChange={n=>patchWallHeader({fontScale:n/100})}/>
      <ColorPalettePicker label="A 標題列背景" value={wall.header.backgroundColor} onChange={backgroundColor=>patchWallHeader({backgroundColor})}/>
      <ColorPalettePicker label="A 標題列文字" value={wall.header.textColor} onChange={textColor=>patchWallHeader({textColor})}/>
      <EffectEditor value={wall.header.effect} onChange={patchWallHeaderEffect}/>
      {wall.fields.map((field,index)=>{
        const selected=editingKey==='wall:'+field.field;
        return <View key={field.field} style={styles.miniColumnCard}>
          <View style={styles.orderRow}>
            <Pressable onPress={()=>setEditingKey(selected?null:'wall:'+field.field)} style={[styles.choice,selected&&styles.choiceActive]}><Text style={[styles.choiceText,selected&&styles.choiceTextActive]}>{field.label}</Text></Pressable>
            <Visibility active={field.enabled} onPress={()=>patchWallField(field.field,{enabled:!field.enabled})}/>
            <Mini label="↑" onPress={()=>moveWallField(field.field,-1)}/><Mini label="↓" onPress={()=>moveWallField(field.field,1)}/>
          </View>
          <Text style={styles.positionHint}>B 第 {index+1} 欄</Text>
          {selected?<View style={styles.bPanel}>
            <TextInput value={field.label} onChangeText={label=>patchWallField(field.field,{label:label.slice(0,12)})} style={styles.input}/>
            <Step label="字體" value={Math.round(field.fontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>patchWallField(field.field,{fontScale:n/100})}/>
            <Choice choices={['left','center','right'] as const} value={field.align} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={align=>patchWallField(field.field,{align})}/>
            <Toggle label="套用損益色" value={field.useProfitColor} onChange={useProfitColor=>patchWallField(field.field,{useProfitColor})}/>
            <NullableColor label="單項文字顏色" value={field.textColor} fallback={wall.style.textColor} onChange={textColor=>patchWallField(field.field,{textColor})}/>
            <NullableColor label="單項背景" value={field.backgroundColor} fallback={wall.style.backgroundColor} onChange={backgroundColor=>patchWallField(field.field,{backgroundColor})}/>
            <NullableGap value={field.lineGap} fallback={wall.style.rowGap} onChange={lineGap=>patchWallField(field.field,{lineGap})}/>
            <Step label="上下內距" value={field.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>patchWallField(field.field,{paddingY})}/>
            <EffectEditor value={field.effect} onChange={p=>patchWallFieldEffect(field.field,p)}/>
          </View>:null}
        </View>;
      })}
    </Section>:null}

    <Section title="尺寸與位置">
      <Step label="寬度" value={layout.width} min={value.mode==='mini'?220:120} max={value.mode==='mini'?900:1200} step={10} suffix=" px" onChange={width=>patchLayout({width})}/>
      <Step label="高度" value={layout.height} min={value.mode==='mini'?120:56} max={value.mode==='mini'?800:1600} step={10} suffix=" px" onChange={height=>patchLayout({height})}/>
      <Step label="X" value={layout.x} min={-2000} max={2000} step={8} suffix="" onChange={x=>patchLayout({x})}/>
      <Step label="Y" value={layout.y} min={-2000} max={2000} step={8} suffix="" onChange={y=>patchLayout({y})}/>
      <Pressable onPress={()=>patchLayout({x:16,y:120})} style={styles.action}><Text style={styles.actionText}>重設目前模式位置</Text></Pressable>
    </Section>

    <Section title="ETF 排序">
      <Choice choices={sorts} value={value.sort.key} label={x=>sortLabels[x]} onChange={key=>patchSort({key})}/>
      {value.sort.key!=='manual'?<Choice choices={['asc','desc'] as const} value={value.sort.direction} label={x=>x==='asc'?'小→大':'大→小'} onChange={direction=>patchSort({direction})}/>:null}
      <View style={styles.row}>{availableSymbols.map(row=><Pressable key={row.symbol} onPress={()=>toggleSymbol(row.symbol)} style={[styles.choice,value.selectedSymbols.includes(row.symbol)&&styles.choiceActive]}><Text style={[styles.choiceText,value.selectedSymbols.includes(row.symbol)&&styles.choiceTextActive]}>{row.symbol}</Text></Pressable>)}</View>
    </Section>

    <Section title="全域字體與版面">
      <Step label="全局字體" value={Math.round(style.fontScale*100)} min={70} max={180} step={5} suffix="%" onChange={n=>patchStyle({fontScale:n/100})}/>
      <Step label="標題字體" value={Math.round(style.titleFontScale*100)} min={70} max={180} step={5} suffix="%" onChange={n=>patchStyle({titleFontScale:n/100})}/>
      <Step label="數值字體" value={Math.round(style.valueFontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>patchStyle({valueFontScale:n/100})}/>
      <Step label="內距" value={style.padding} min={0} max={32} step={2} suffix=" px" onChange={padding=>patchStyle({padding})}/>
      <Step label="全域行距" value={style.rowGap} min={0} max={32} step={1} suffix=" px" onChange={rowGap=>patchStyle({rowGap})}/>
      <Choice choices={['left','center','right'] as const} value={style.textAlign} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={textAlign=>patchStyle({textAlign})}/>
    </Section>

    <Section title="全域顏色、透明度與外觀">
      <Text style={styles.note}>B 未覆寫時繼承這裡；顏色全部使用調色盤。</Text>
      <ColorPalettePicker label="背景" value={style.backgroundColor} onChange={backgroundColor=>patchStyle({backgroundColor})}/>
      <ColorPalettePicker label="文字" value={style.textColor} onChange={textColor=>patchStyle({textColor})}/>
      <ColorPalettePicker label="次要文字" value={style.secondaryTextColor} onChange={secondaryTextColor=>patchStyle({secondaryTextColor})}/>
      <ColorPalettePicker label="上漲 / 獲利" value={style.gainColor} onChange={gainColor=>patchStyle({gainColor})}/>
      <ColorPalettePicker label="下跌 / 虧損" value={style.lossColor} onChange={lossColor=>patchStyle({lossColor})}/>
      <ColorPalettePicker label="邊框" value={style.borderColor} onChange={borderColor=>patchStyle({borderColor})}/>
      <Step label="背景透明度" value={Math.round(style.backgroundOpacity*100)} min={10} max={100} step={5} suffix="%" onChange={n=>patchStyle({backgroundOpacity:n/100})}/>
      <Step label="圓角" value={style.cornerRadius} min={0} max={40} step={2} suffix=" px" onChange={cornerRadius=>patchStyle({cornerRadius})}/>
      <Step label="邊框" value={style.borderWidth} min={0} max={6} step={1} suffix=" px" onChange={borderWidth=>patchStyle({borderWidth})}/>
      <Toggle label="陰影" value={style.shadowEnabled} onChange={shadowEnabled=>patchStyle({shadowEnabled})}/>
      <Toggle label="最上層顯示" value={value.alwaysOnTop} onChange={alwaysOnTop=>patch({alwaysOnTop})}/>
    </Section>

    <Section title="全域特效、呼吸燈與警報">
      <Toggle label="允許動畫" value={value.effects.animationsEnabled} onChange={animationsEnabled=>patchEffects({animationsEnabled})}/>
      <Toggle label="刷新呼吸燈" value={value.showBreathingLight} onChange={showBreathingLight=>patch({showBreathingLight})}/>
      <Effect label="刷新" value={value.effects.refresh} onChange={refresh=>patchEffects({refresh})}/>
      <Effect label="上漲" value={value.effects.gain} onChange={gain=>patchEffects({gain})}/>
      <Effect label="下跌" value={value.effects.loss} onChange={loss=>patchEffects({loss})}/>
      <Effect label="警報" value={value.effects.alert} onChange={alert=>patchEffects({alert})}/>
      <Text style={styles.label}>漲跌幅警報門檻（%）</Text>
      <TextInput keyboardType="decimal-pad" value={value.alertChangePct==null?'':String(value.alertChangePct)} onChangeText={t=>patch({alertChangePct:t.trim()===''?null:Math.max(0,Number(t)||0)})} style={styles.input}/>
    </Section>

    <Text style={styles.note}>Monitor 只讀 Shared Snapshot；A/B 只改顯示契約，Normal / Mini Layout 與設定資料互不覆寫。</Text>
  </View>;
}

function MonitorPreview({value,snapshot,rows,wallRows}:{value:MonitorConfig;snapshot:SharedSnapshot|null;rows:ReturnType<typeof sortMonitorHoldings>;wallRows:ReturnType<typeof chunk<ReturnType<typeof sortMonitorHoldings>[number]>>}){
  const style=activeMonitorStyle(value);
  if(value.mode==='mini'){
    const cols=enabledMiniColumns(value),statusItems=enabledMiniStatusItems(value);
    return <View style={[styles.preview,{backgroundColor:style.backgroundColor,opacity:style.backgroundOpacity,borderRadius:style.cornerRadius,borderWidth:style.borderWidth,borderColor:style.borderColor,padding:style.padding}]}>
      {value.miniHeader.visible?<View style={[styles.miniTableRow,{minHeight:value.miniHeader.height,backgroundColor:value.miniHeader.backgroundColor,borderBottomColor:value.miniHeader.borderColor,borderBottomWidth:value.miniHeader.borderWidth}]}>
        {cols.map(column=><View key={column.field} style={{flex:column.widthPercent}}><Text style={{color:value.miniHeader.textColor,fontSize:11*value.miniHeader.fontScale,fontWeight:'900',textAlign:column.align}}>{column.label}</Text></View>)}
      </View>:null}
      {rows.map(row=><View key={row.symbol} style={styles.miniTableRow}>{cols.map(column=><View key={column.field} style={{flex:column.widthPercent,backgroundColor:column.backgroundColor??'transparent',paddingVertical:column.paddingY,marginTop:column.lineGap??style.rowGap}}><Text numberOfLines={1} style={{color:column.useProfitColor?profitTone(fieldNumeric(row,column.field),style):(column.textColor??style.textColor),fontSize:11*style.fontScale*column.fontScale,fontWeight:'800',textAlign:column.align}}>{miniCellText(row,column.field)}</Text></View>)}</View>)}
      {!rows.length?<Text style={styles.note}>尚無持股資料</Text>:null}
      {value.miniStatusBar.visible&&statusItems.length?<View style={[styles.miniStatusPreview,{minHeight:value.miniStatusBar.height,backgroundColor:value.miniStatusBar.backgroundColor,borderTopColor:value.miniStatusBar.borderColor,borderTopWidth:value.miniStatusBar.borderWidth}]}>
        {chunk(statusItems,value.miniStatusBar.columns).map((statusRow,rowIndex)=><View key={'status-'+rowIndex} style={styles.miniStatusRow}>{statusRow.map(item=><Text key={item.field} numberOfLines={1} style={{flex:1,color:item.useProfitColor?profitTone(miniStatusNumeric(snapshot,item),style):(item.textColor??value.miniStatusBar.textColor),backgroundColor:item.backgroundColor??'transparent',fontSize:9*value.miniStatusBar.fontScale*item.fontScale,fontWeight:'800',textAlign:item.align,paddingVertical:item.paddingY,marginTop:item.lineGap??0}}>{item.label} {miniStatusPreviewText(snapshot,item.field,rows.length)}</Text>)}</View>)}
      </View>:null}
    </View>;
  }
  if(value.template==='market-wall'){
    const wall=value.normalWall;
    return <View style={[styles.preview,{backgroundColor:style.backgroundColor,opacity:style.backgroundOpacity,borderRadius:style.cornerRadius,borderWidth:style.borderWidth,borderColor:style.borderColor,padding:style.padding,gap:value.normalWallLayout.rowGap}]}>
      {wallRows.map((row,rowIndex)=><View key={'wall-row-'+rowIndex} style={{flexDirection:'row',gap:value.normalWallLayout.columnGap}}>
        {row.map(holding=><View key={holding.symbol} style={{flex:1,backgroundColor:wall.style.backgroundColor,borderColor:wall.style.borderColor,borderWidth:wall.style.borderWidth,borderRadius:wall.style.cornerRadius,padding:wall.style.padding}}>
          {wall.fields.filter(field=>field.enabled).map((field,index)=><Text key={field.field} numberOfLines={1} style={{fontSize:10*style.fontScale*field.fontScale,fontWeight:'800',color:field.useProfitColor?profitTone(fieldNumeric(holding,field.field),style):(field.textColor??wall.style.textColor),backgroundColor:field.backgroundColor??'transparent',textAlign:field.align,marginTop:index===0?0:(field.lineGap??wall.style.rowGap),paddingVertical:field.paddingY}}>{wallFieldText(holding,field.field,field.label)}</Text>)}
        </View>)}
      </View>)}
      {!rows.length?<Text style={styles.note}>尚無持股資料</Text>:null}
    </View>;
  }
  const holding=rows[0];
  return <View style={[styles.preview,{backgroundColor:style.backgroundColor,opacity:style.backgroundOpacity,borderRadius:style.cornerRadius,borderWidth:style.borderWidth,borderColor:style.borderColor,padding:style.padding}]}>
    {holding?value.fields.map((field,index)=>{const item=monitorItem(value,field);const numeric=fieldNumeric(holding,field);return <Text key={field} numberOfLines={1} style={{fontSize:11*style.fontScale*item.visual.fontScale,fontWeight:'800',color:item.visual.useProfitColor?profitTone(numeric,style):(item.visual.textColor??style.textColor),backgroundColor:item.visual.backgroundColor??'transparent',textAlign:item.visual.textAlign??style.textAlign,marginTop:index===0?0:(item.visual.lineGap??style.rowGap),paddingVertical:item.visual.paddingY}}>{monitorFieldText(holding,field,item.label)}</Text>;}) : <Text style={styles.note}>尚無持股資料</Text>}
  </View>;
}

function ItemVisualEditor({visual,baseStyle,onChange,onEffect}:{visual:ItemVisualOverride;baseStyle:MonitorConfig['normalStyle'];onChange:(p:Partial<ItemVisualOverride>)=>void;onEffect:(p:Partial<ItemEffectConfig>)=>void}){
  return <>
    <Step label="單項字體" value={Math.round(visual.fontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>onChange({fontScale:n/100})}/>
    <Toggle label="套用損益色" value={visual.useProfitColor} onChange={useProfitColor=>onChange({useProfitColor})}/>
    <NullableColor label="單項文字顏色" value={visual.textColor} fallback={baseStyle.textColor} onChange={textColor=>onChange({textColor})}/>
    <NullableColor label="單項背景" value={visual.backgroundColor} fallback={baseStyle.backgroundColor} onChange={backgroundColor=>onChange({backgroundColor})}/>
    <Choice choices={['left','center','right'] as const} value={visual.textAlign??baseStyle.textAlign} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={textAlign=>onChange({textAlign})}/>
    <NullableGap value={visual.lineGap} fallback={baseStyle.rowGap} onChange={lineGap=>onChange({lineGap})}/>
    <Step label="上下內距" value={visual.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>onChange({paddingY})}/>
    <EffectEditor value={visual.effect} onChange={onEffect}/>
  </>;
}
function NullableColor({label,value,fallback,onChange}:{label:string;value:string|null;fallback:string;onChange:(value:string|null)=>void}){return <View style={{gap:6}}><Toggle label={'自訂'+label} value={value!=null} onChange={enabled=>onChange(enabled?fallback:null)}/>{value?<ColorPalettePicker label={label} value={value} onChange={onChange}/>:null}</View>;}
function NullableGap({value,fallback,onChange}:{value:number|null;fallback:number;onChange:(value:number|null)=>void}){return <View style={{gap:6}}><Toggle label="自訂行距" value={value!=null} onChange={enabled=>onChange(enabled?fallback:null)}/>{value!=null?<Step label="單項行距" value={value} min={0} max={32} step={1} suffix=" px" onChange={onChange}/>:null}</View>;}
function EffectEditor({value,onChange}:{value:ItemEffectConfig;onChange:(p:Partial<ItemEffectConfig>)=>void}){return <View style={styles.effectBox}><Text style={styles.label}>單項特效</Text><Choice choices={ITEM_EFFECT_KINDS} value={value.kind} label={x=>itemEffectLabels[x]} onChange={kind=>onChange({kind})}/>{value.kind!=='none'?<><Text style={styles.label}>觸發條件</Text><Choice choices={ITEM_EFFECT_TRIGGERS} value={value.trigger} label={x=>triggerLabels[x]} onChange={trigger=>onChange({trigger})}/><Text style={styles.label}>速度</Text><Choice choices={ITEM_EFFECT_SPEEDS} value={value.speed} label={x=>speedLabels[x]} onChange={speed=>onChange({speed})}/><Text style={styles.label}>強度</Text><Choice choices={ITEM_EFFECT_INTENSITIES} value={value.intensity} label={x=>intensityLabels[x]} onChange={intensity=>onChange({intensity})}/></>:null}</View>;}
function Visibility({active,onPress}:{active:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={[styles.visibility,active&&styles.visibilityOn]}><Text style={[styles.visibilityText,active&&styles.visibilityTextOn]}>{active?'顯示':'隱藏'}</Text></Pressable>;}
function Section({title,children}:{title:string;children:React.ReactNode}){return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;}
function Choice<T extends string>({choices,value,label,onChange}:{choices:readonly T[];value:T;label:(x:T)=>string;onChange:(x:T)=>void}){return <View style={styles.row}>{choices.map(x=><Pressable key={x} onPress={()=>onChange(x)} style={[styles.choice,value===x&&styles.choiceActive]}><Text style={[styles.choiceText,value===x&&styles.choiceTextActive]}>{label(x)}</Text></Pressable>)}</View>;}
function Mini({label,onPress}:{label:string;onPress:()=>void}){return <Pressable onPress={onPress} style={styles.mini}><Text style={styles.miniText}>{label}</Text></Pressable>;}
function Step({label,value,min,max,step,suffix,onChange}:{label:string;value:number;min:number;max:number;step:number;suffix:string;onChange:(x:number)=>void}){return <View style={styles.step}><Text style={styles.stepLabel}>{label}</Text><Mini label="−" onPress={()=>onChange(Math.max(min,value-step))}/><Text style={styles.stepValue}>{value}{suffix}</Text><Mini label="＋" onPress={()=>onChange(Math.min(max,value+step))}/></View>;}
function Toggle({label,value,onChange}:{label:string;value:boolean;onChange:(x:boolean)=>void}){return <Pressable onPress={()=>onChange(!value)} style={styles.toggle}><Text style={styles.stepLabel}>{label}</Text><Text style={[styles.state,value&&styles.stateOn]}>{value?'開':'關'}</Text></Pressable>;}
function Effect({label,value,onChange}:{label:string;value:MonitorEffect;onChange:(x:MonitorEffect)=>void}){return <View><Text style={styles.label}>{label}</Text><Choice choices={effects} value={value} label={x=>effectLabels[x]} onChange={onChange}/></View>;}

const styles=StyleSheet.create({
 card:{backgroundColor:colors.surfaceMuted,borderRadius:radius.lg,padding:spacing.md,borderWidth:1,borderColor:colors.border,gap:10},
 header:{flexDirection:'row',alignItems:'center',gap:8},title:{fontSize:14,fontWeight:'900',color:colors.text},sub:{fontSize:10,lineHeight:15,color:colors.textSecondary,marginTop:2},
 pill:{paddingHorizontal:10,paddingVertical:7,borderRadius:999,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},pillActive:{backgroundColor:colors.primary,borderColor:colors.primary},pillText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},pillTextActive:{color:'#fff'},
 section:{gap:8,paddingTop:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},sectionTitle:{fontSize:11,fontWeight:'900',color:colors.text},
 row:{flexDirection:'row',gap:6,flexWrap:'wrap'},choice:{paddingHorizontal:9,paddingVertical:7,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},choiceActive:{borderColor:colors.primary,backgroundColor:'#EFF6FF'},choiceText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},choiceTextActive:{color:colors.primary},
 preview:{justifyContent:'center',minHeight:100},action:{minHeight:36,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},actionText:{fontSize:10,fontWeight:'900',color:'#fff'},
 orderRow:{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'},mini:{width:34,height:32,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},miniText:{fontSize:14,fontWeight:'900',color:colors.primary},
 step:{flexDirection:'row',alignItems:'center',gap:6},stepLabel:{fontSize:10,fontWeight:'800',color:colors.text,flex:1},stepValue:{minWidth:64,textAlign:'center',fontSize:10,fontWeight:'900',color:colors.text},
 toggle:{minHeight:36,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},state:{paddingHorizontal:10,paddingVertical:5,borderRadius:999,overflow:'hidden',backgroundColor:colors.surface,color:colors.textSecondary,fontSize:10,fontWeight:'900'},stateOn:{backgroundColor:'#EFF6FF',color:colors.primary},
 label:{fontSize:10,fontWeight:'900',color:colors.textSecondary},input:{height:36,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface,paddingHorizontal:9,color:colors.text,fontSize:10,fontWeight:'800'},
 note:{fontSize:9,lineHeight:14,color:colors.textSecondary},miniTableRow:{flexDirection:'row',alignItems:'center',gap:6,minHeight:28,paddingHorizontal:4},miniColumnCard:{gap:6,padding:8,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface},positionHint:{fontSize:9,fontWeight:'800',color:colors.primary},miniStatusPreview:{marginTop:6,paddingHorizontal:4,justifyContent:'center'},miniStatusRow:{flexDirection:'row',alignItems:'center',minHeight:20},
 bPanel:{gap:7,paddingTop:7,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},bTitle:{fontSize:10,fontWeight:'900',color:colors.primary},effectBox:{gap:6,paddingTop:4},
 visibility:{paddingHorizontal:8,paddingVertical:6,borderRadius:999,borderWidth:1,borderColor:colors.border},visibilityOn:{backgroundColor:'#EFF6FF',borderColor:colors.primary},visibilityText:{fontSize:9,fontWeight:'900',color:colors.textSecondary},visibilityTextOn:{color:colors.primary},
});

function profitTone(value:number|null,style:MonitorConfig['normalStyle']){return value==null?style.neutralColor:value>0?style.gainColor:value<0?style.lossColor:style.neutralColor;}
function fieldNumeric(row:SharedSnapshot['holdings'][number],field:string):number|null{const v=field==='change'?row.change:field==='changePercent'?row.changePercent:field==='pnl'?row.pnl:field==='roi'?row.roi:field==='comprehensivePnl'?row.comprehensivePnl:field==='marketValue'?row.marketValue:null;return typeof v==='number'&&Number.isFinite(v)?v:null;}
function monitorFieldText(row:SharedSnapshot['holdings'][number],field:MonitorField,label:string){
  switch(field){case 'symbol':return row.symbol;case 'name':return row.name;case 'price':return `${label} ${row.price==null?'--':row.price.toFixed(2)}`;case 'change':return `${label} ${signed2(row.change)}`;case 'changePercent':return `${label} ${signed2(row.changePercent,'%')}`;case 'shares':return `${label} ${Math.round(row.shares).toLocaleString('zh-TW')}`;case 'avgCost':return `${label} ${row.avgCost.toFixed(2)}`;case 'marketValue':return `${label} ${Math.round(row.marketValue).toLocaleString('zh-TW')}`;case 'pnl':return `${label} ${signed0(row.pnl)}`;case 'roi':return `${label} ${signed2(row.roi,'%')}`;case 'comprehensivePnl':return `${label} ${signed0(row.comprehensivePnl)}`;case 'marketStatus':return `${label} ${row.marketStatus}`;case 'updatedAt':return `${label} ${row.updatedAt?new Date(row.updatedAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}):'--'}`;}}
function wallFieldText(row:SharedSnapshot['holdings'][number],field:string,label:string){return monitorFieldText(row,field as MonitorField,label);}
function miniCellText(row:SharedSnapshot['holdings'][number],field:MonitorField){return monitorFieldText(row,field,MONITOR_FIELD_LABELS[field]);}
function signed2(v:number|null|undefined,suffix=''){return v==null?'--':`${v>=0?'+':''}${v.toFixed(2)}${suffix}`;}
function signed0(v:number|null|undefined){return v==null?'--':`${v>=0?'+':''}${Math.round(v).toLocaleString('zh-TW')}`;}
function chunk<T>(items:readonly T[],size:number):T[][]{const safe=Math.max(1,Math.round(size));const rows:T[][]=[];for(let i=0;i<items.length;i+=safe)rows.push(items.slice(i,i+safe));return rows;}
function miniStatusNumeric(snapshot:SharedSnapshot|null,item:MiniStatusItemConfig){const asset=snapshot?.asset;if(!asset)return null;const v=item.field==='totalReturn'?asset.totalReturn:item.field==='unrealizedPnl'?asset.unrealizedPnl:item.field==='realizedPnl'?asset.realizedPnl:null;return typeof v==='number'&&Number.isFinite(v)?v:null;}
function miniStatusPreviewText(snapshot:SharedSnapshot|null,field:MiniStatusItemConfig['field'],holdingCount:number){if(field==='holdingCount')return String(holdingCount);if(field==='updatedAt')return snapshot?.generatedAt?new Date(snapshot.generatedAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}):'--';const asset=snapshot?.asset;if(!asset)return '--';const value=asset[field as keyof typeof asset];return typeof value==='number'?Math.round(value).toLocaleString('zh-TW'):'--';}
