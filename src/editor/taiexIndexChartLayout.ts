import type {LayoutSelectionTarget} from './LayoutSelectionContext';

/** The production chart and settings preview use the same coordinate geometry. */
export const TAIEX_AXIS_DEFAULT=93;
export const taiexAxisWidth=(v:number|undefined):number=>
  v!==undefined&&Number.isFinite(v)?Math.max(56,Math.min(150,Math.round(v))):TAIEX_AXIS_DEFAULT;
export const taiexPlotLeftInset=(v:number|undefined):number=>
  v!==undefined&&Number.isFinite(v)?Math.max(0,Math.min(40,Math.round(v))):0;
export const taiexTimeAxisLeft=(axis:number,inset:number):number=>
  taiexAxisWidth(axis)+taiexPlotLeftInset(inset)+2;

/** Named persisted targets implemented by the real index component, not fake JSX previews. */
const item=(id:string,kind:LayoutSelectionTarget['kind'],label:string):LayoutSelectionTarget=>
  ({id:'market:index:'+id,kind,label});
export const TAIEX_INDEX_EDITOR_ITEMS:readonly LayoutSelectionTarget[]=[
  item('axis:left','card','圖表左側數值欄'),item('plot:left-inset','card','繪圖區左內距'),
  item('chart','card','三關價走勢繪圖區'),item('time-axis','card','時間軸'),
  item('title','text','加權指數標題'),item('subtitle','text','加權指數副標題'),
  item('value','value','加權指數數值'),item('change','value','指數漲跌'),
  item('status','text','指數行情狀態'),item('source-list','text','行情來源總覽'),
  item('refresh:button','button','更新指數按鈕'),item('refresh:button:label','text','更新指數文字'),
  ...(['d1','d5','m1','m6','ytd','y1'] as const).flatMap((key,i)=>[
    item('range:'+key+':button','button',['1日','5日','1月','6月','今年','1年'][i]+'區間按鈕'),
    item('range:'+key+':button:label','text',['1日','5日','1月','6月','今年','1年'][i]+'區間文字')]),
  item('three-gates:button','button','三關價切換按鈕'),
  item('three-gates:button:label','text','三關價按鈕文字'),
  item('gates:title','text','三關價標題'),
  ...(['upper2','upper1','middle','lower1','lower2'] as const).flatMap((key,i)=>[
    item('gates:'+key+':left','value',['上關2','上關1','中關','下關1','下關2'][i]+'左側數值'),
    item('gates:'+key+':label','text',['上關2','上關1','中關','下關1','下關2'][i]+'摘要標籤'),
    item('gates:'+key+':value','value',['上關2','上關1','中關','下關1','下關2'][i]+'摘要數值')]),
  item('gates:reference','text','基準交易日'),
  item('note:tape','text','當日走勢範圍'),item('note:gates','text','三關價說明'),
  item('note:live','text','盤中走勢說明'),item('note:history','text','歷史走勢說明'),
  item('note:source','text','來源資料說明'),item('note:loading','text','讀取提示'),
  item('note:error','text','錯誤提示'),
  ...(['open','previous','high','low','year-high','year-low'] as const).flatMap(key=>[
    item(key+':label','text',key+'摘要標題'),item(key+':value','value',key+'摘要數值')]),
];
