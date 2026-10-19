import {MAX_MONITOR_COLUMNS,parseMonitorColumns,monitorWallGeometry} from '../../monitor/monitorWallGeometry';
import {normalizeMonitorAutoFit} from '../../monitor/monitorAutoFit';
import {MonitorFitText,useMonitorFit,type MonitorFitController} from './MonitorFitText';
import {MONITOR_WEIGHTS,monitorTypography,monitorBoundColor,monitorSourceClock} from '../../monitor/monitorFormatting';
import {DEFAULT_MONITOR_CLOCK,type MonitorFormat,type MonitorFormatted,type MonitorVisual} from '../../monitor/monitorDomain';
import {MONITOR_MODELS,applyMonitorModel,monitorMarketFieldText} from '../../monitor/monitorModels';
import { useEffect,useState } from 'react';
import { PixelRatio, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import {
  type ItemEffectConfig,
} from '../../domain/displayItemContract';
import {
  MONITOR_FIELDS,MONITOR_FIELD_LABELS,activeMonitorLayout,activeMonitorStyle,enabledMiniColumns,enabledMiniStatusItems,monitorItem,moveMiniColumn,moveMiniStatusItem,restoreNormalMonitor,setMonitorMode,sortMonitorHoldings,
  updateActiveMonitorLayout,updateActiveMonitorStyle,updateMiniColumn,updateMiniHeader,updateMiniStatusBar,updateMiniStatusItem,updateMonitorFields,updateMonitorWall,updateMonitorWallLayout,updateNormalItem,
  type MiniColumnConfig,type MiniStatusItemConfig,type MonitorConfig,type MonitorEffect,type MonitorField,type MonitorMode,type MonitorSortKey,type MonitorTemplate,
} from '../../monitor/monitorDomain';
import type { SharedSnapshot } from '../../domain/snapshot';
import { ColorPalettePicker } from '../ColorPalettePicker';
import {MotionControls} from '../MotionControls';
import { colors, radius, spacing } from '../../theme/tokens';

type Props={value:MonitorConfig;onChange:(value:MonitorConfig)=>void;availableSymbols?:readonly {symbol:string;name?:string}[];previewSnapshot?:SharedSnapshot|null};
const effects:readonly MonitorEffect[]=['none','fade','pulse','flash-on-change'];
const effectLabels:Record<MonitorEffect,string>={none:'無',fade:'淡入',pulse:'脈衝','flash-on-change':'變動閃爍'};
const sorts:readonly MonitorSortKey[]=['manual','symbol','price','changePercent','pnl','marketValue','volume','roi'];
const sortLabels:Record<MonitorSortKey,string>={manual:'手動',symbol:'代號',price:'價格',changePercent:'漲跌%',pnl:'持股損益',marketValue:'持股市值',volume:'成交總量',roi:'報酬率'};

export function MonitorControlPanel({value,onChange,availableSymbols=[],previewSnapshot=null}:Props){
  const [editingKey,setEditingKey]=useState<string|null>(null);
  const layout=activeMonitorLayout(value),style=activeMonitorStyle(value);
  const autoFit=normalizeMonitorAutoFit(style.autoFit);
  const patchAutoFit=(p:Partial<typeof autoFit>)=>patchStyle({autoFit:normalizeMonitorAutoFit({...autoFit,...p})});
  const previewRows=sortMonitorHoldings(previewSnapshot,value);
  const wall=value.normalWall;
  const clock=value.mode==='mini'?(value.miniClock??DEFAULT_MONITOR_CLOCK):(value.normalClock??DEFAULT_MONITOR_CLOCK);
  const patchClock=(p:Partial<typeof clock>)=>patch(value.mode==='mini'?{miniClock:{...clock,...p}}:{normalClock:{...clock,...p}});
  const wallLayout=value.normalWallLayout;
  const patch=(p:Partial<MonitorConfig>)=>onChange({...value,...p});
  const patchLayout=(p:Partial<typeof layout>)=>onChange(updateActiveMonitorLayout(value,p));
  const patchStyle=(p:Partial<typeof style>)=>onChange(updateActiveMonitorStyle(value,p));
  const patchEffects=(p:Partial<MonitorConfig['effects']>)=>patch({effects:{...value.effects,...p}});
  const patchSort=(p:Partial<MonitorConfig['sort']>)=>patch({sort:{...value.sort,...p}});
  const toggleNormalField=(field:MonitorField)=>onChange(updateMonitorFields(value,value.fields.includes(field)?value.fields.filter(x=>x!==field):[...value.fields,field]));
  const moveNormalField=(field:MonitorField,d:number)=>{const a=[...value.fields],i=a.indexOf(field),j=i+d;if(i<0||j<0||j>=a.length)return;const t=a[i]!;a[i]=a[j]!;a[j]=t;onChange(updateMonitorFields(value,a));};
  const patchNormalVisual=(field:MonitorField,p:Partial<MonitorVisual>)=>{const item=monitorItem(value,field);onChange(updateNormalItem(value,field,{visual:{...item.visual,...p}}));};
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
    <View style={styles.header}><View style={{flex:1}}><Text style={styles.title}>即時監控器編輯器</Text><Text style={styles.sub}>選擇模式與版型，再點項目編輯；每次展開一項，設定即時預覽。</Text></View><Pressable onPress={()=>patch({enabled:!value.enabled})} style={[styles.pill,value.enabled&&styles.pillActive]}><Text style={[styles.pillText,value.enabled&&styles.pillTextActive]}>{value.enabled?'已啟用':'未啟用'}</Text></Pressable></View>

    <Section title="行情來源"><Choice choices={['holdings','watchlist','all'] as const} value={value.quoteListSource??'holdings'} label={source=>source==='holdings'?'持股':source==='watchlist'?'自選':'持股＋自選'} onChange={quoteListSource=>patch({quoteListSource,selectedSymbols:[]})}/><Text style={styles.note}>自選只顯示行情，不計入持股資產與損益。</Text></Section>
    <Section title="模式與即時預覽">
      <Choice choices={['normal','mini'] as const} value={value.mode} label={x=>x==='normal'?'Normal':'Mini'} onChange={(mode:MonitorMode)=>onChange(setMonitorMode(value,mode))}/>
      {value.mode==='normal'?<Choice choices={(['market-wall','portfolio','heatmap','ticker','terminal',...(!['market-wall','portfolio','heatmap','ticker','terminal'].includes(value.template)?[value.template]:[])] as readonly MonitorTemplate[])} value={value.template} label={(x:MonitorTemplate)=>x==='portfolio'?'投資組合':x==='quotes'?'行情列':x==='compact'?'極簡':x==='single'?'單檔大行情':x==='dual'?'雙檔行情':x==='advanced'?'進階資訊':x==='market-wall'?'行情牆':x==='heatmap'?'漲跌熱圖':x==='pnl-wall'?'損益牆':x==='weight-wall'?'資產權重牆':x==='ticker'?'跑馬行情':'純文字終端'} onChange={template=>patch({template})}/>:null}
      {value.mode==='mini'?<Pressable onPress={()=>onChange(restoreNormalMonitor(value))} style={styles.action}><Text style={styles.actionText}>模擬雙擊還原 Normal</Text></Pressable>:null}
      {value.mode==='normal'&&value.template==='market-wall'?<View>
        <Text style={styles.label}>持股行情牆模型（10 種）</Text>
        <Choice choices={MONITOR_MODELS.map(model=>model.id)} value={value.template==='market-wall'?value.model:undefined} label={id=>MONITOR_MODELS.find(model=>model.id===id)!.label} onChange={id=>onChange(applyMonitorModel(value,id))}/>
        <Text style={styles.note}>{value.template==='market-wall'&&value.model?MONITOR_MODELS.find(model=>model.id===value.model)?.description:'套用模型會調整主視窗版面與顯示欄位；套用後仍可自行編輯。'}</Text>
        <Text style={styles.note}>成交總量直接顯示行情來源數值；未提供的資料顯示 --。</Text>
      </View>:null}
      <MonitorPreview value={value} snapshot={previewSnapshot} rows={previewRows} wallRows={wallRows}/>
    </Section>

    {value.mode==='normal'&&value.template!=='market-wall'?<Section title="Normal A 顯示項目（母） → B 單項細部">
      <Text style={styles.note}>所有 Normal 模板都有 A/B；A 控制顯示與順序，點 A 才展開該欄位的 B。</Text>
      {MONITOR_FIELDS.map(field=>{
        const item=monitorItem(value,field),active=value.fields.includes(field),selected=editingKey==='normal:'+field;
        return <View key={field} style={styles.miniColumnCard}>
          <View style={styles.orderRow}>
            <Pressable onPress={()=>setEditingKey(selected?null:'normal:'+field)} style={[styles.choice,selected&&styles.choiceActive]}><Text style={[styles.choiceText,selected&&styles.choiceTextActive]}>{field==='updatedAt'?'單檔行情時間':item.label}</Text></Pressable>
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
      <ColorPalettePicker label="項目列背景" value={value.miniHeader.backgroundColor} profitColorEnabled={bound(value.miniHeader,'backgroundColor')} onProfitColorChange={enabled=>onChange(updateMiniHeader(value,{format:bind(value.miniHeader,'backgroundColor',enabled)}))} onChange={backgroundColor=>onChange(updateMiniHeader(value,{backgroundColor}))}/>
      <ColorPalettePicker label="項目列文字" value={value.miniHeader.textColor} profitColorEnabled={bound(value.miniHeader,'textColor')} onProfitColorChange={enabled=>onChange(updateMiniHeader(value,{format:bind(value.miniHeader,'textColor',enabled)}))} onChange={textColor=>onChange(updateMiniHeader(value,{textColor}))}/>
      <ColorPalettePicker label="項目列分隔線" value={value.miniHeader.borderColor} profitColorEnabled={bound(value.miniHeader,'borderColor')} onProfitColorChange={enabled=>onChange(updateMiniHeader(value,{format:bind(value.miniHeader,'borderColor',enabled)}))} onChange={borderColor=>onChange(updateMiniHeader(value,{borderColor}))}/>
      <Step label="項目列分隔線" value={value.miniHeader.borderWidth} min={0} max={4} step={1} suffix=" px" onChange={borderWidth=>onChange(updateMiniHeader(value,{borderWidth}))}/>
      <FormatEditor target={value.miniHeader} onChange={format=>onChange(updateMiniHeader(value,{format}))}/>
      <EffectEditor value={value.miniHeader.effect} onChange={p=>onChange(updateMiniHeader(value,{effect:{...value.miniHeader.effect,...p}}))}/>
    </Section>:null}

    {value.mode==='mini'?<Section title="Mini B 欄位（子）">
      <Text style={styles.note}>一次只展開一個 B；資料列共用同一套 B 結構。</Text>
      <Text style={styles.note}>Mini 列數不設限；超出固定高度時以捲動顯示，不截斷持股。</Text>
      {value.miniColumns.map((column,index)=>{
        const selected=editingKey==='mini:'+column.field;
        return <View key={column.field} style={styles.miniColumnCard}>
          <View style={styles.orderRow}>
            <Pressable onPress={()=>setEditingKey(selected?null:'mini:'+column.field)} style={[styles.choice,selected&&styles.choiceActive]}><Text style={[styles.choiceText,selected&&styles.choiceTextActive]}>{column.field==='updatedAt'?'單檔行情時間':column.label}</Text></Pressable>
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
            <NullableColor label="單項文字顏色" value={column.textColor} profitColorEnabled={column.useProfitColor} onProfitColorChange={enabled=>onChange(updateMiniColumn(value,column.field,{useProfitColor:enabled}))} fallback={value.miniStyle.textColor} onChange={textColor=>onChange(updateMiniColumn(value,column.field,{textColor}))}/>
            <NullableColor label="單項背景" value={column.backgroundColor} profitColorEnabled={bound(column,'backgroundColor')} onProfitColorChange={enabled=>onChange(updateMiniColumn(value,column.field,{format:bind(column,'backgroundColor',enabled)}))} fallback={value.miniStyle.backgroundColor} onChange={backgroundColor=>onChange(updateMiniColumn(value,column.field,{backgroundColor}))}/>
            <NullableGap value={column.lineGap} fallback={value.miniStyle.rowGap} onChange={lineGap=>onChange(updateMiniColumn(value,column.field,{lineGap}))}/>
            <Step label="上下內距" value={column.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>onChange(updateMiniColumn(value,column.field,{paddingY}))}/>
            <FormatEditor target={column} onChange={format=>onChange(updateMiniColumn(value,column.field,{format}))}/>
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
      <ColorPalettePicker label="狀態列背景" value={value.miniStatusBar.backgroundColor} profitColorEnabled={bound(value.miniStatusBar,'backgroundColor')} onProfitColorChange={enabled=>onChange(updateMiniStatusBar(value,{format:bind(value.miniStatusBar,'backgroundColor',enabled)}))} onChange={backgroundColor=>onChange(updateMiniStatusBar(value,{backgroundColor}))}/>
      <ColorPalettePicker label="狀態列文字" value={value.miniStatusBar.textColor} profitColorEnabled={bound(value.miniStatusBar,'textColor')} onProfitColorChange={enabled=>onChange(updateMiniStatusBar(value,{format:bind(value.miniStatusBar,'textColor',enabled)}))} onChange={textColor=>onChange(updateMiniStatusBar(value,{textColor}))}/>
      <FormatEditor target={value.miniStatusBar} onChange={format=>onChange(updateMiniStatusBar(value,{format}))}/>
      <ColorPalettePicker label="狀態列邊框" value={value.miniStatusBar.borderColor} profitColorEnabled={bound(value.miniStatusBar,'borderColor')} onProfitColorChange={enabled=>onChange(updateMiniStatusBar(value,{format:bind(value.miniStatusBar,'borderColor',enabled)}))} onChange={borderColor=>onChange(updateMiniStatusBar(value,{borderColor}))}/>
      {value.miniStatusItems.filter(item=>!(clock.visible&&item.field==='updatedAt')).map((item,index)=>{
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
            <NullableColor label="單項文字顏色" value={item.textColor} profitColorEnabled={item.useProfitColor} onProfitColorChange={enabled=>onChange(updateMiniStatusItem(value,item.field,{useProfitColor:enabled}))} fallback={value.miniStatusBar.textColor} onChange={textColor=>onChange(updateMiniStatusItem(value,item.field,{textColor}))}/>
            <NullableColor label="單項背景" value={item.backgroundColor} profitColorEnabled={bound(item,'backgroundColor')} onProfitColorChange={enabled=>onChange(updateMiniStatusItem(value,item.field,{format:bind(item,'backgroundColor',enabled)}))} fallback={value.miniStatusBar.backgroundColor} onChange={backgroundColor=>onChange(updateMiniStatusItem(value,item.field,{backgroundColor}))}/>
            <NullableGap value={item.lineGap} fallback={value.miniStyle.rowGap} onChange={lineGap=>onChange(updateMiniStatusItem(value,item.field,{lineGap}))}/>
            <Step label="上下內距" value={item.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>onChange(updateMiniStatusItem(value,item.field,{paddingY}))}/>
            <FormatEditor target={item} onChange={format=>onChange(updateMiniStatusItem(value,item.field,{format}))}/>
      <EffectEditor value={item.effect} onChange={p=>onChange(updateMiniStatusItem(value,item.field,{effect:{...item.effect,...p}}))}/>
          </View>:null}
        </View>;
      })}
    </Section>:null}

    {value.mode==='normal'&&value.template==='market-wall'?<Section title="主體行情牆框架">
      <Text style={styles.note}>框架只控制行情卡排列；卡片內 A/B 由下一區獨立編輯。</Text>
      <FormatEditor target={wall.style} onChange={format=>patchWall({...wall,style:{...wall.style,format}})}/>
      {(['backgroundColor','textColor','secondaryTextColor','borderColor'] as const).map(key=><ColorPalettePicker key={key} label={{backgroundColor:'卡片背景',textColor:'卡片文字',secondaryTextColor:'卡片說明',borderColor:'卡片邊框'}[key]} value={wall.style[key]} profitColorEnabled={bound(wall.style,key)} onProfitColorChange={enabled=>patchWall({...wall,style:{...wall.style,format:bind(wall.style,key,enabled)}})} onChange={color=>patchWall({...wall,style:{...wall.style,[key]:color}})}/>)}
      <ColumnCountInput value={wallLayout.columns} onChange={columns=>onChange(updateMonitorWallLayout(value,{columns}))}/>
      <Step label="水平間距" value={wallLayout.columnGap} min={0} max={32} step={2} suffix=" px" onChange={columnGap=>onChange(updateMonitorWallLayout(value,{columnGap}))}/>
      <Step label="垂直間距" value={wallLayout.rowGap} min={0} max={32} step={2} suffix=" px" onChange={rowGap=>onChange(updateMonitorWallLayout(value,{rowGap}))}/>
    </Section>:null}

    {value.mode==='normal'&&value.template==='market-wall'?<Section title="主體行情牆 A/B 編輯">
      <Text style={styles.note}>A 控制標題列；B 每個欄位有自己的字體、顏色、背景、對齊、行距與特效。</Text>
      <Toggle label="A 標題列顯示" value={wall.header.visible} onChange={visible=>patchWallHeader({visible})}/>
      <Step label="A 標題列字體" value={Math.round(wall.header.fontScale*100)} min={70} max={180} step={5} suffix="%" onChange={n=>patchWallHeader({fontScale:n/100})}/>
      <ColorPalettePicker label="A 標題列背景" value={wall.header.backgroundColor} profitColorEnabled={bound(wall.header,'backgroundColor')} onProfitColorChange={enabled=>patchWallHeader({format:bind(wall.header,'backgroundColor',enabled)})} onChange={backgroundColor=>patchWallHeader({backgroundColor})}/>
      <ColorPalettePicker label="A 標題列文字" value={wall.header.textColor} profitColorEnabled={bound(wall.header,'textColor')} onProfitColorChange={enabled=>patchWallHeader({format:bind(wall.header,'textColor',enabled)})} onChange={textColor=>patchWallHeader({textColor})}/>
      <FormatEditor target={wall.header} onChange={format=>patchWallHeader({format})}/>
      <ColorPalettePicker label="A 標題列邊框" value={wall.header.borderColor} profitColorEnabled={bound(wall.header,'borderColor')} onProfitColorChange={enabled=>patchWallHeader({format:bind(wall.header,'borderColor',enabled)})} onChange={borderColor=>patchWallHeader({borderColor})}/>
      <EffectEditor value={wall.header.effect} onChange={patchWallHeaderEffect}/>
      {wall.fields.map((field,index)=>{
        const selected=editingKey==='wall:'+field.field;
        return <View key={field.field} style={styles.miniColumnCard}>
          <View style={styles.orderRow}>
            <Pressable onPress={()=>setEditingKey(selected?null:'wall:'+field.field)} style={[styles.choice,selected&&styles.choiceActive]}><Text style={[styles.choiceText,selected&&styles.choiceTextActive]}>{field.field==='updatedAt'?'單檔行情時間':field.label}</Text></Pressable>
            <Visibility active={field.enabled} onPress={()=>patchWallField(field.field,{enabled:!field.enabled})}/>
            <Mini label="↑" onPress={()=>moveWallField(field.field,-1)}/><Mini label="↓" onPress={()=>moveWallField(field.field,1)}/>
          </View>
          <Text style={styles.positionHint}>B 第 {index+1} 欄</Text>
          {selected?<View style={styles.bPanel}>
            <TextInput value={field.label} onChangeText={label=>patchWallField(field.field,{label:label.slice(0,12)})} style={styles.input}/>
            <Step label="字體" value={Math.round(field.fontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>patchWallField(field.field,{fontScale:n/100})}/>
            <Choice choices={['left','center','right'] as const} value={field.align} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={align=>patchWallField(field.field,{align})}/>
            <NullableColor label="單項文字顏色" value={field.textColor} profitColorEnabled={field.useProfitColor} onProfitColorChange={enabled=>patchWallField(field.field,{useProfitColor:enabled})} fallback={wall.style.textColor} onChange={textColor=>patchWallField(field.field,{textColor})}/>
            <NullableColor label="單項背景" value={field.backgroundColor} profitColorEnabled={bound(field,'backgroundColor')} onProfitColorChange={enabled=>patchWallField(field.field,{format:bind(field,'backgroundColor',enabled)})} fallback={wall.style.backgroundColor} onChange={backgroundColor=>patchWallField(field.field,{backgroundColor})}/>
            <NullableGap value={field.lineGap} fallback={wall.style.rowGap} onChange={lineGap=>patchWallField(field.field,{lineGap})}/>
            <Step label="上下內距" value={field.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>patchWallField(field.field,{paddingY})}/>
            <FormatEditor target={field} onChange={format=>patchWallField(field.field,{format})}/>
      <EffectEditor value={field.effect} onChange={p=>patchWallFieldEffect(field.field,p)}/>
          </View>:null}
        </View>;
      })}
    </Section>:null}

    <Section title="時間顯示與編輯">
      <Text style={styles.note}>顯示所選持股最新行情來源時間（台北 HH:mm:ss）；無有效時間顯示 --:--:--。</Text>
      <Toggle label="顯示行情時間" value={clock.visible} onChange={visible=>patchClock({visible})}/>
      <Step label="時間字級" value={Math.round(clock.fontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>patchClock({fontScale:n/100})}/>
      <FormatEditor target={clock} onChange={format=>patchClock({format})}/>
      <Choice choices={['left','center','right'] as const} value={clock.align} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={align=>patchClock({align})}/>
      <NullableColor label="時間文字" value={clock.textColor} fallback={style.secondaryTextColor} profitColorEnabled={bound(clock,'textColor')} onProfitColorChange={enabled=>patchClock({format:bind(clock,'textColor',enabled)})} onChange={textColor=>patchClock({textColor})}/>
      <NullableColor label="時間背景" value={clock.backgroundColor} fallback={style.backgroundColor} profitColorEnabled={bound(clock,'backgroundColor')} onProfitColorChange={enabled=>patchClock({format:bind(clock,'backgroundColor',enabled)})} onChange={backgroundColor=>patchClock({backgroundColor})}/>
      <Step label="時間上下內距" value={clock.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>patchClock({paddingY})}/>
    </Section>

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
      <Toggle label="字體自動適配（同列一致）" value={autoFit.enabled} onChange={enabled=>patchAutoFit({enabled})}/>
      {autoFit.enabled?<>
        <Step label="最小字級" value={autoFit.minFontSize} min={6} max={autoFit.maxFontSize} step={1} suffix="" onChange={minFontSize=>patchAutoFit({minFontSize})}/>
        <Step label="最大字級" value={autoFit.maxFontSize} min={autoFit.minFontSize} max={72} step={1} suffix="" onChange={maxFontSize=>patchAutoFit({maxFontSize})}/>
        <Step label="文字列高" value={autoFit.rowHeight} min={16} max={160} step={1} suffix=" px" onChange={rowHeight=>patchAutoFit({rowHeight})}/>
        <Text style={styles.note}>依實際文字、欄寬、列高、內距與行距，同列採用可共同容納的字級。達最小字級仍過長時顯示省略；關閉後恢復手動字級。</Text>
      </>:null}
      <FormatEditor target={style} onChange={format=>patchStyle({format})}/>
      <Step label="全局字體" value={Math.round(style.fontScale*100)} min={70} max={180} step={5} suffix="%" onChange={n=>patchStyle({fontScale:n/100})}/>
      <Step label="標題字體" value={Math.round(style.titleFontScale*100)} min={70} max={180} step={5} suffix="%" onChange={n=>patchStyle({titleFontScale:n/100})}/>
      <Step label="數值字體" value={Math.round(style.valueFontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>patchStyle({valueFontScale:n/100})}/>
      <Step label="內距" value={style.padding} min={0} max={32} step={2} suffix=" px" onChange={padding=>patchStyle({padding})}/>
      <Step label="全域行距" value={style.rowGap} min={0} max={32} step={1} suffix=" px" onChange={rowGap=>patchStyle({rowGap})}/>
      <Choice choices={['left','center','right'] as const} value={style.textAlign} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={textAlign=>patchStyle({textAlign})}/>
    </Section>

    <Section title="全域顏色、透明度與外觀">
      <Text style={styles.note}>B 未覆寫時繼承這裡；顏色全部使用調色盤。</Text>
      <ColorPalettePicker label="背景" value={style.backgroundColor} profitColorEnabled={bound(style,'backgroundColor')} onProfitColorChange={enabled=>patchStyle({format:bind(style,'backgroundColor',enabled)})} onChange={backgroundColor=>patchStyle({backgroundColor})}/>
      <ColorPalettePicker label="文字" value={style.textColor} profitColorEnabled={bound(style,'textColor')} onProfitColorChange={enabled=>patchStyle({format:bind(style,'textColor',enabled)})} onChange={textColor=>patchStyle({textColor})}/>
      <ColorPalettePicker label="次要文字" value={style.secondaryTextColor} profitColorEnabled={bound(style,'secondaryTextColor')} onProfitColorChange={enabled=>patchStyle({format:bind(style,'secondaryTextColor',enabled)})} onChange={secondaryTextColor=>patchStyle({secondaryTextColor})}/>
      <ColorPalettePicker label="上漲 / 獲利" value={style.gainColor} onChange={gainColor=>patchStyle({gainColor})}/>
      <ColorPalettePicker label="持平 / 資料不足" value={style.neutralColor} onChange={neutralColor=>patchStyle({neutralColor})}/>
      <ColorPalettePicker label="下跌 / 虧損" value={style.lossColor} onChange={lossColor=>patchStyle({lossColor})}/>
      <ColorPalettePicker label="邊框" value={style.borderColor} profitColorEnabled={bound(style,'borderColor')} onProfitColorChange={enabled=>patchStyle({format:bind(style,'borderColor',enabled)})} onChange={borderColor=>patchStyle({borderColor})}/>
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

    <Text style={styles.note}>Normal 與 Mini 分別保存；未自訂的文字格式繼承全域設定。</Text>
  </View>;
}

function MonitorPreview(props:Parameters<typeof MonitorPreviewContent>[0]){
  const [height,setHeight]=useState(0),[width,setWidth]=useState(0);
  const enabled=normalizeMonitorAutoFit(activeMonitorStyle(props.value).autoFit).enabled;
  const screen=useWindowDimensions(),density=PixelRatio.get();
  const baseWidth=activeMonitorLayout(props.value).width;
  const wall=props.value.mode==='normal'&&props.value.template==='market-wall';
  const desiredWidth=wall?monitorWallGeometry(baseWidth,props.value.normalStyle.padding,props.value.normalWallLayout.columns,props.value.normalWallLayout.columnGap,screen.width*density,props.rows.length).windowWidth:baseWidth;
  if(!enabled)return <MonitorPreviewContent {...props} {...(wall?{viewportWidth:desiredWidth}:{})}/>;
  const scale=Math.min(1/density,width>0?width/baseWidth:1/density);
  const targetWidth=Math.min(desiredWidth,width>0?width/scale:desiredWidth);
  return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{alignSelf:'stretch',...(height>0?{height:height*scale}:{})}}><View onLayout={e=>setHeight(e.nativeEvent.layout.height)} style={{width:targetWidth,transform:[{scale}],transformOrigin:'top left'}}><MonitorPreviewContent {...props} metricScale={density} viewportWidth={targetWidth}/></View></View>;
}
function MonitorPreviewContent({value,snapshot,rows,wallRows,metricScale=1,viewportWidth}:{value:MonitorConfig;snapshot:SharedSnapshot|null;rows:SharedSnapshot['holdings'][number][];wallRows:SharedSnapshot['holdings'][number][][];metricScale?:number;viewportWidth?:number}){
  const rawStyle=activeMonitorStyle(value);
  const options=normalizeMonitorAutoFit(rawStyle.autoFit);
  // Native window/layout dimensions are physical px; fit this virtual canvas in the same units.
  const fit=useMonitorFit({...options,minFontSize:options.minFontSize*metricScale,maxFontSize:options.maxFontSize*metricScale},JSON.stringify([value.mode,value.template,value.normalLayout,value.miniLayout,rawStyle,value.normalWallLayout,metricScale]));
  const aggregate=snapshot?.asset.totalReturn??null;
  const style={...rawStyle,...previewColors(rawStyle,aggregate,rawStyle)};
  const clock=value.mode==='mini'?(value.miniClock??DEFAULT_MONITOR_CLOCK):(value.normalClock??DEFAULT_MONITOR_CLOCK);
  const time=clock.visible?<MonitorFitText fit={fit} group="clock" cellKey="clock" style={{fontSize:10*clock.fontScale,color:clock.textColor??style.secondaryTextColor,backgroundColor:clock.backgroundColor??'transparent',textAlign:clock.align,paddingVertical:clock.paddingY,...previewFormat(clock,style,10*clock.fontScale,aggregate,style)}}>{monitorSourceClock(rows)}</MonitorFitText>:null;
  const totalMarketValue=(snapshot?.asset.marketValue??0)>0?(snapshot?.asset.marketValue??0):rows.reduce((sum,row)=>sum+(Number.isFinite(row.marketValue)?row.marketValue:0),0);
  if(value.mode==='mini'){
    const cols=enabledMiniColumns(value),statusItems=enabledMiniStatusItems(value).filter(item=>!(clock.visible&&item.field==='updatedAt'));
    return <View onLayout={fit.rootLayout} style={[styles.preview,{backgroundColor:style.backgroundColor,opacity:style.backgroundOpacity,borderRadius:style.cornerRadius,borderWidth:style.borderWidth,borderColor:style.borderColor,padding:style.padding}]}>{time}
      {value.miniHeader.visible?<View style={[styles.miniTableRow,{minHeight:value.miniHeader.height,backgroundColor:value.miniHeader.backgroundColor,borderBottomColor:value.miniHeader.borderColor,borderBottomWidth:value.miniHeader.borderWidth,...previewColors(value.miniHeader,aggregate,style)}]}>
        {cols.map(column=><View key={column.field} style={{flex:column.widthPercent}}><MonitorFitText fit={fit} group="mini-header" cellKey={column.field} style={{color:value.miniHeader.textColor,fontSize:11*value.miniHeader.fontScale,fontWeight:'900',textAlign:column.align,...previewFormat(value.miniHeader,style,11*value.miniHeader.fontScale,aggregate,style)}}>{column.label}</MonitorFitText></View>)}
      </View>:null}
      {rows.map(row=><View key={row.symbol} style={styles.miniTableRow}>{cols.map(column=><View key={column.field} style={{flex:column.widthPercent,backgroundColor:column.backgroundColor??'transparent',paddingVertical:fit.options.enabled?0:column.paddingY,marginTop:fit.options.enabled?0:(column.lineGap??style.rowGap),...previewColors(column,fieldNumeric(row,column.field,totalMarketValue),style)}}><MonitorFitText fit={fit} group={"mini:"+row.symbol} cellKey={column.field} numberOfLines={1} style={{color:column.useProfitColor?profitTone(fieldNumeric(row,column.field,totalMarketValue),style):(column.textColor??style.textColor),fontSize:11*style.fontScale*column.fontScale,fontWeight:'800',textAlign:column.align,...(fit.options.enabled?{paddingTop:(column.lineGap??style.rowGap)+column.paddingY,paddingBottom:column.paddingY}:{}),...previewFormat(column,style,11*style.fontScale*column.fontScale,fieldNumeric(row,column.field,totalMarketValue),style)}}>{miniCellText(row,column.field,totalMarketValue)}</MonitorFitText></View>)}</View>)}
      {!rows.length?<Text style={styles.note}>尚無持股資料</Text>:null}
      {value.miniStatusBar.visible&&statusItems.length?<View style={[styles.miniStatusPreview,{minHeight:value.miniStatusBar.height,backgroundColor:value.miniStatusBar.backgroundColor,borderTopColor:value.miniStatusBar.borderColor,borderTopWidth:value.miniStatusBar.borderWidth,...previewColors(value.miniStatusBar,aggregate,style)}]}>
        {chunk(statusItems,value.miniStatusBar.columns).map((statusRow,rowIndex)=><View key={'status-'+rowIndex} style={styles.miniStatusRow}>{statusRow.map(item=><MonitorFitText key={item.field} fit={fit} group={"status:"+rowIndex} cellKey={item.field} numberOfLines={1} style={{flex:1,color:item.useProfitColor?profitTone(miniStatusNumeric(snapshot,item),style):(item.textColor??(bound(value.miniStatusBar,'textColor')?profitTone(aggregate,style):value.miniStatusBar.textColor)),backgroundColor:item.backgroundColor??'transparent',fontSize:9*value.miniStatusBar.fontScale*item.fontScale,fontWeight:'800',textAlign:item.align,paddingVertical:item.paddingY,marginTop:item.lineGap??0,...previewFormat(item,{format:{...style.format,...value.miniStatusBar.format}},9*value.miniStatusBar.fontScale*item.fontScale,miniStatusNumeric(snapshot,item),style)}}>{item.label} {miniStatusPreviewText(snapshot,item.field,rows.length)}</MonitorFitText>)}</View>)}
      </View>:null}
    </View>;
  }
  if(value.template==='market-wall'){
    const wall=value.normalWall;

    return <View testID="monitor-wall-viewport" onLayout={fit.rootLayout} style={[styles.preview,{width:viewportWidth??monitorWallGeometry(value.normalLayout.width,style.padding,value.normalWallLayout.columns,value.normalWallLayout.columnGap,Number.MAX_SAFE_INTEGER,rows.length).windowWidth,maxWidth:'100%',backgroundColor:style.backgroundColor,opacity:style.backgroundOpacity,borderRadius:style.cornerRadius,borderWidth:style.borderWidth,borderColor:style.borderColor,padding:style.padding,gap:value.normalWallLayout.rowGap}]}>{time}
      <ScrollView horizontal nestedScrollEnabled testID="monitor-wall-horizontal"><View style={{width:monitorWallGeometry(value.normalLayout.width,style.padding,value.normalWallLayout.columns,value.normalWallLayout.columnGap,Number.MAX_SAFE_INTEGER,rows.length).contentWidth,gap:value.normalWallLayout.rowGap}}>
      {wallRows.map((row,rowIndex)=><View key={'wall-row-'+rowIndex} style={{flexDirection:'row',gap:value.normalWallLayout.columnGap}}>
        {row.map(holding=><MonitorWallPreviewCard key={holding.symbol} holding={holding} value={value} totalMarketValue={totalMarketValue} fit={fit}/>)}
      </View>)}
      {!rows.length?<Text style={styles.note}>尚無持股資料</Text>:null}
      </View></ScrollView>
    </View>;
  }
  const holding=rows[0];
  return <View onLayout={fit.rootLayout} style={[styles.preview,{backgroundColor:style.backgroundColor,opacity:style.backgroundOpacity,borderRadius:style.cornerRadius,borderWidth:style.borderWidth,borderColor:style.borderColor,padding:style.padding}]}>{time}
    {holding?value.fields.map((field,index)=>{const item=monitorItem(value,field);const numeric=fieldNumeric(holding,field,totalMarketValue);return <MonitorFitText key={field} fit={fit} group={"normal:"+index} cellKey={field} numberOfLines={1} style={{fontSize:11*style.fontScale*item.visual.fontScale,fontWeight:'800',color:item.visual.useProfitColor?profitTone(numeric,style):(item.visual.textColor??style.textColor),backgroundColor:item.visual.backgroundColor??'transparent',textAlign:item.visual.textAlign??style.textAlign,marginTop:index===0?0:(item.visual.lineGap??style.rowGap),paddingVertical:item.visual.paddingY,...previewFormat(item.visual,style,11*style.fontScale*item.visual.fontScale,numeric,style)}}>{monitorFieldText(holding,field,item.label,totalMarketValue)}</MonitorFitText>;}) : <Text style={styles.note}>尚無持股資料</Text>}
  </View>;
}

function MonitorWallPreviewCard({holding,value,totalMarketValue,fit}:{holding:SharedSnapshot['holdings'][number];value:MonitorConfig;totalMarketValue:number;fit:MonitorFitController}){
  const base=value.normalWall,style=value.normalStyle;
  const numeric=holding.changePercent;
  const resolved=<T extends MonitorFormatted>(target:T):T=>{const c=previewColors(target,numeric,style);return {...target,...c,...(c.color?{textColor:c.color}:{})};};
  const wall={...base,style:resolved(base.style),header:resolved(base.header)};
  const enabled=wall.fields.filter(field=>field.enabled);
  const header=enabled.filter(field=>['name','symbol'].includes(field.field));
  const quote=enabled.filter(field=>['price','change','changePercent'].includes(field.field));
  const detail=enabled.filter(field=>!['name','symbol','price','change','changePercent'].includes(field.field));
  const fieldStyle=(field:typeof enabled[number],base:number)=>({fontSize:base*style.fontScale*field.fontScale,fontWeight:'800' as const,color:field.useProfitColor?wallProfitTone(fieldNumeric(holding,field.field,totalMarketValue),wall.style):(field.textColor??wall.style.textColor),backgroundColor:field.backgroundColor??'transparent',textAlign:field.align,paddingVertical:field.paddingY,marginTop:field.lineGap??0,...previewFormat(field,{format:{...style.format,...wall.style.format,...(['name','symbol'].includes(field.field)?wall.header.format:{})}},base*style.fontScale*field.fontScale,fieldNumeric(holding,field.field,totalMarketValue),style)});
  const raw=(field:typeof enabled[number])=>['name','symbol'].includes(field.field)?holding[field.field as 'name'|'symbol']:monitorFieldText(holding,field.field as MonitorField,field.label,totalMarketValue).slice(field.label.length+1);
  return <View testID={'monitor-wall-card-'+holding.symbol} style={{width:Math.max(1,value.normalLayout.width-2*style.padding),flexShrink:0,backgroundColor:wall.style.backgroundColor,borderColor:wall.style.borderColor,borderWidth:wall.style.borderWidth,borderRadius:wall.style.cornerRadius,padding:wall.style.padding,...previewColors(wall.style,holding.changePercent,style)}}>
    {wall.header.visible&&header.length?<View style={{flexDirection:'row',alignItems:'center',backgroundColor:wall.header.backgroundColor,borderColor:wall.header.borderColor,borderWidth:wall.header.borderWidth,...previewColors(wall.header,holding.changePercent,style)}}>{header.map((field,index)=><MonitorFitText key={field.field} fit={fit} group={"header:"+holding.symbol} cellKey={field.field} reserveWidth={field.field==='symbol'} numberOfLines={1} style={[fieldStyle(field,(field.field==='name'?15:11)*wall.header.fontScale),{flex:field.field==='name'?1:undefined,color:field.textColor??wall.header.textColor,marginTop:field.lineGap??(index===0?0:2),...previewFormat(field,wall.header,(field.field==='name'?15:11)*wall.header.fontScale*style.fontScale*field.fontScale,fieldNumeric(holding,field.field,totalMarketValue),style)}]}>{raw(field)}</MonitorFitText>)}</View>:null}
    {quote.length?<View style={{flexDirection:'row',alignItems:'flex-end',marginTop:wall.style.rowGap}}><MonitorFitText fit={fit} group={"quote:"+holding.symbol} cellKey={quote[0]!.field} numberOfLines={1} style={[fieldStyle(quote[0]!,36),{flex:1}]}>{raw(quote[0]!)}</MonitorFitText><View>{quote.slice(1).map(field=><MonitorFitText key={field.field} fit={fit} group={"quote:"+holding.symbol} cellKey={field.field} numberOfLines={1} style={[fieldStyle(field,11),{marginTop:field.lineGap??wall.style.rowGap}]}>{raw(field)}</MonitorFitText>)}</View></View>:null}
    {chunk(detail,3).map((line,index)=><View key={index} style={{flexDirection:'row',marginTop:wall.style.rowGap}}>{line.map(field=><View key={field.field} style={{flex:1,backgroundColor:field.backgroundColor??'transparent',paddingTop:(field.lineGap??0)+field.paddingY,paddingBottom:field.paddingY,...previewColors(field,fieldNumeric(holding,field.field,totalMarketValue),style)}}><MonitorFitText fit={fit} group={"detail:"+holding.symbol+":"+index} reservedHeight={((field.lineGap??0)+2*field.paddingY)/2} cellKey={field.field} numberOfLines={1} style={{fontSize:10*style.fontScale,color:wall.style.secondaryTextColor,textAlign:field.align,...monitorTypography(wall.style,style,10*style.fontScale)}}>{field.label}</MonitorFitText><MonitorFitText fit={fit} group={"detail:"+holding.symbol+":"+index} reservedHeight={((field.lineGap??0)+2*field.paddingY)/2} cellKey={field.field} numberOfLines={1} style={[fieldStyle(field,12),{marginTop:0,paddingVertical:0}]}>{raw(field)}</MonitorFitText></View>)}</View>)}
  </View>;
}

function previewColors(target:MonitorFormatted,n:number|null|undefined,palette:MonitorConfig['normalStyle']){const result:{color?:string;backgroundColor?:string;borderColor?:string;borderBottomColor?:string;borderTopColor?:string;secondaryTextColor?:string;textColor?:string}={};for(const key of target.format?.profitColors??[]){const tone=monitorBoundColor(target,key,palette.neutralColor,n,palette);if(key==='textColor'){result.color=tone;result.textColor=tone;}if(key==='backgroundColor')result.backgroundColor=tone;if(key==='borderColor'){result.borderColor=tone;result.borderBottomColor=tone;result.borderTopColor=tone;}if(key==='secondaryTextColor')result.secondaryTextColor=tone;}return result;}
function previewFormat(target:MonitorFormatted,base:MonitorFormatted,size:number,n:number|null|undefined,palette:MonitorConfig['normalStyle']){return {...monitorTypography(target,base,size),...previewColors(target,n,palette)};}

function ItemVisualEditor({visual,baseStyle,onChange,onEffect}:{visual:MonitorVisual;baseStyle:MonitorConfig['normalStyle'];onChange:(p:Partial<MonitorVisual>)=>void;onEffect:(p:Partial<ItemEffectConfig>)=>void}){
  return <>
    <Step label="單項字體" value={Math.round(visual.fontScale*100)} min={70} max={200} step={5} suffix="%" onChange={n=>onChange({fontScale:n/100})}/>
    <NullableColor label="單項文字顏色" value={visual.textColor} profitColorEnabled={visual.useProfitColor} onProfitColorChange={enabled=>onChange({useProfitColor:enabled})} fallback={baseStyle.textColor} onChange={textColor=>onChange({textColor})}/>
    <NullableColor label="單項背景" value={visual.backgroundColor} profitColorEnabled={bound(visual,'backgroundColor')} onProfitColorChange={enabled=>onChange({format:bind(visual,'backgroundColor',enabled)})} fallback={baseStyle.backgroundColor} onChange={backgroundColor=>onChange({backgroundColor})}/>
    <Choice choices={['left','center','right'] as const} value={visual.textAlign??baseStyle.textAlign} label={x=>x==='left'?'靠左':x==='center'?'置中':'靠右'} onChange={textAlign=>onChange({textAlign})}/>
    <NullableGap value={visual.lineGap} fallback={baseStyle.rowGap} onChange={lineGap=>onChange({lineGap})}/>
    <Step label="上下內距" value={visual.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>onChange({paddingY})}/>
    <FormatEditor target={visual} onChange={format=>onChange({format})}/>
      <EffectEditor value={visual.effect} onChange={onEffect}/>
  </>;
}
function NullableColor({label,value,fallback,onChange,profitColorEnabled=false,onProfitColorChange}:{label:string;value:string|null;fallback:string;onChange:(value:string|null)=>void;profitColorEnabled?:boolean;onProfitColorChange?:(value:boolean)=>void}){return <View style={{gap:6}}><Toggle label={'自訂'+label} value={value!=null} onChange={enabled=>onChange(enabled?fallback:null)}/><ColorPalettePicker label={label} value={value??fallback} onChange={onChange} profitColorEnabled={profitColorEnabled} {...(onProfitColorChange?{onProfitColorChange}:{})}/></View>;}
function bound(target:MonitorFormatted,key:string){return target.format?.profitColors?.includes(key)??false;}
function bind(target:MonitorFormatted,key:string,enabled:boolean):MonitorFormat{return {...target.format,profitColors:enabled?[...new Set([...(target.format?.profitColors??[]),key])]:(target.format?.profitColors??[]).filter(x=>x!==key)};}
function FormatEditor({target,onChange}:{target:MonitorFormatted;onChange:(format:MonitorFormat)=>void}){return <View style={{gap:6}}><Text style={styles.label}>字體粗細</Text><Choice choices={['inherit',...MONITOR_WEIGHTS] as const} value={target.format?.fontWeight??'inherit'} label={x=>x==='inherit'?'繼承':x} onChange={fontWeight=>{const {fontWeight:old,...rest}=target.format??{};onChange(fontWeight==='inherit'?rest:{...rest,fontWeight});}}/><Toggle label="自訂行高（與列間距分開）" value={target.format?.lineHeight!=null} onChange={enabled=>{const {lineHeight:old,...rest}=target.format??{};onChange(enabled?{...rest,lineHeight:1.2}:rest);}}/>{target.format?.lineHeight!=null?<Step label="行高" value={Math.round(target.format.lineHeight*100)} min={100} max={300} step={5} suffix="%" onChange={n=>onChange({...target.format,lineHeight:n/100})}/>:null}</View>;}

function NullableGap({value,fallback,onChange}:{value:number|null;fallback:number;onChange:(value:number|null)=>void}){return <View style={{gap:6}}><Toggle label="自訂行距" value={value!=null} onChange={enabled=>onChange(enabled?fallback:null)}/>{value!=null?<Step label="單項行距" value={value} min={0} max={32} step={1} suffix=" px" onChange={onChange}/>:null}</View>;}
function EffectEditor({value,onChange}:{value:ItemEffectConfig;onChange:(p:Partial<ItemEffectConfig>)=>void}){return <MotionControls value={value} onChange={onChange}/>;}
function Visibility({active,onPress}:{active:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={[styles.visibility,active&&styles.visibilityOn]}><Text style={[styles.visibilityText,active&&styles.visibilityTextOn]}>{active?'顯示':'隱藏'}</Text></Pressable>;}
function Section({title,children}:{title:string;children:React.ReactNode}){return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;}
function Choice<T extends string>({choices,value,label,onChange}:{choices:readonly T[];value:T|undefined;label:(x:T)=>string;onChange:(x:T)=>void}){return <View style={styles.row}>{choices.map(x=><Pressable key={x} onPress={()=>onChange(x)} style={[styles.choice,value===x&&styles.choiceActive]}><Text style={[styles.choiceText,value===x&&styles.choiceTextActive]}>{label(x)}</Text></Pressable>)}</View>;}
function Mini({label,onPress}:{label:string;onPress:()=>void}){return <Pressable onPress={onPress} style={styles.mini}><Text style={styles.miniText}>{label}</Text></Pressable>;}
function ColumnCountInput({value,onChange}:{value:number;onChange:(n:number)=>void}){
  const [draft,setDraft]=useState(String(value));
  const [error,setError]=useState(false);
  useEffect(()=>{setDraft(String(value));setError(false);},[value]);
  const commit=()=>{const n=parseMonitorColumns(draft);if(n==null){setError(true);return;}setError(false);onChange(n);};
  const step=(delta:number)=>{const n=Math.max(1,Math.min(MAX_MONITOR_COLUMNS,(parseMonitorColumns(draft)??value)+delta));setDraft(String(n));setError(false);onChange(n);};
  return <View><View style={styles.step}><Text style={styles.stepLabel}>並排欄數</Text><Pressable accessibilityLabel="減少並排欄數" onPress={()=>step(-1)} style={styles.mini}><Text>−</Text></Pressable><TextInput accessibilityLabel="自訂並排欄數" value={draft} onChangeText={s=>{setDraft(s);setError(false);}} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={commit} onEndEditing={commit} style={[styles.input,{width:88,textAlign:'center'}]}/><Pressable accessibilityLabel="增加並排欄數" onPress={()=>step(1)} style={styles.mini}><Text>＋</Text></Pressable></View><Text style={styles.note}>{error?'請輸入有效的正整數欄數。':'輸入正整數後完成；每張卡片維持單欄大小，超出螢幕可橫向捲動。'}</Text></View>;
}
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
function wallProfitTone(value:number|null,style:MonitorConfig['normalWall']['style']){return value==null?style.secondaryTextColor:value>0?style.gainColor:value<0?style.lossColor:style.secondaryTextColor;}
function fieldNumeric(row:SharedSnapshot['holdings'][number],field:string,totalMarketValue=0):number|null{const v=field==='price'?row.change:field==='change'?row.change:field==='changePercent'?row.changePercent:field==='pnl'?row.pnl:field==='roi'?row.roi:field==='comprehensivePnl'?row.comprehensivePnl:field==='marketValue'?row.marketValue:field==='weight'&&totalMarketValue>0?(row.marketValue/totalMarketValue)*100:row.changePercent;return typeof v==='number'&&Number.isFinite(v)?v:null;}
function monitorFieldText(row:SharedSnapshot['holdings'][number],field:MonitorField,label:string,totalMarketValue=0){
  if(row.watchOnly&&['shares','avgCost','marketValue','weight','pnl','roi','comprehensivePnl'].includes(field))return `${label} --`;
  const marketText=monitorMarketFieldText(row,field);if(marketText!==null)return `${label} ${marketText}`;
  switch(field){case 'symbol':return row.symbol;case 'name':return row.name;case 'price':return `${label} ${row.price==null?'--':row.price.toFixed(2)}`;case 'change':return `${label} ${signed2(row.change)}`;case 'changePercent':return `${label} ${signed2(row.changePercent,'%')}`;case 'shares':return `${label} ${Math.round(row.shares).toLocaleString('zh-TW')}`;case 'avgCost':return `${label} ${row.avgCost.toFixed(2)}`;case 'marketValue':return `${label} ${Math.round(row.marketValue).toLocaleString('zh-TW')}`;case 'weight':{const weight=totalMarketValue>0?(row.marketValue/totalMarketValue)*100:null;return `${label} ${weight==null?'--':weight.toFixed(2)+'%'}`;}case 'pnl':return `${label} ${signed0(row.pnl)}`;case 'roi':return `${label} ${signed2(row.roi,'%')}`;case 'comprehensivePnl':return `${label} ${signed0(row.comprehensivePnl)}`;case 'marketStatus':return `${label} ${row.marketStatus}`;case 'updatedAt':return `${label} ${row.updatedAt?monitorSourceClock([row]):'--'}`;default:return `${label} --`;}}
function wallFieldText(row:SharedSnapshot['holdings'][number],field:string,label:string){return monitorFieldText(row,field as MonitorField,label);}
function miniCellText(row:SharedSnapshot['holdings'][number],field:MonitorField,totalMarketValue=0){return monitorFieldText(row,field,MONITOR_FIELD_LABELS[field],totalMarketValue);}
function signed2(v:number|null|undefined,suffix=''){return v==null?'--':`${v>=0?'+':''}${v.toFixed(2)}${suffix}`;}
function signed0(v:number|null|undefined){return v==null?'--':`${v>=0?'+':''}${Math.round(v).toLocaleString('zh-TW')}`;}
function chunk<T>(items:readonly T[],size:number):T[][]{const safe=Math.max(1,Math.round(size));const rows:T[][]=[];for(let i=0;i<items.length;i+=safe)rows.push(items.slice(i,i+safe));return rows;}
function miniStatusNumeric(snapshot:SharedSnapshot|null,item:MiniStatusItemConfig){const asset=snapshot?.asset;if(!asset)return null;const v=item.field==='totalReturn'?asset.totalReturn:item.field==='unrealizedPnl'?asset.unrealizedPnl:item.field==='realizedPnl'?asset.realizedPnl:asset.totalReturn;return typeof v==='number'&&Number.isFinite(v)?v:null;}
function miniStatusPreviewText(snapshot:SharedSnapshot|null,field:MiniStatusItemConfig['field'],holdingCount:number){if(field==='holdingCount')return String(holdingCount);if(field==='updatedAt')return monitorSourceClock(snapshot?.holdings??[]);const asset=snapshot?.asset;if(!asset)return '--';const value=asset[field as keyof typeof asset];return typeof value==='number'?Math.round(value).toLocaleString('zh-TW'):'--';}
