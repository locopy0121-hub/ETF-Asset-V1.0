import type {LayoutSelectionKind} from './LayoutSelectionContext';
import {dividendTargetId} from './dividendPageLayout';

export type DividendEditorItem=Readonly<{id:string;label:string;kind:LayoutSelectionKind}>;
const node=(name:string,label:string,kind:LayoutSelectionKind='value'):DividendEditorItem=>
  ({id:dividendTargetId('native:DividendScreen:'+name),label,kind});
const metric=(label:string):DividendEditorItem=>({id:dividendTargetId('metric:'+label),label,kind:'card'});

/** Stable targets match live DividendScreen editorId markers; no financial values are stored here. */
export const DIVIDEND_EDITOR_CATALOG:Readonly<Record<string,readonly DividendEditorItem[]>>={
  'dividend-summary':[
    metric('本月淨入帳'),metric('年度淨股息'),metric('月平均股息'),
  ],
  'dividend-calendar':[
    node('calendarCount:3','本月事件計數'),
    node('arrowButton:4','上個月按鈕','card'),
    node('arrowButton:8','下個月按鈕','card'),
    node('month:6','年月標題'),
    node('monthCaption:7','月份說明'),
    node('weekday:10','星期欄','text'),
    node('day:11','日期格','card'),
    // Dates are computed read-only but their typography is a text target, not the cell card.
    node('dayText:12','日期數字','text'),
    node('moreEvents:13','更多事件提示'),
    node('holidayRemark:96','休市／節日備註'),
    node('eventDetailDate:14','選取日期'),
    node('eventDetailTitle:15','日期事件標題'),
    node('eventDetailCount:16','事件數量'),
    node('eventType:17','事件類型'),
    node('eventSymbol:18','股息標的'),
    node('eventText:19','事件狀態與日期'),
    node('legendText:95','月曆事件圖例','text'),
    node('noEventText:20','無事件提示','text'),
  ],
  'dividend-list':[
    node('formWarning:21','股息資料警示'),
    node('stockName:22','預告標的'),
    node('eventText:23','預告狀態'),
    node('eventText:24','預告股息與股數'),
    node('formHint:25','預告日期資訊'),
    node('planButton:26','編輯預告按鈕','card'),
    node('planButton:28','確認預告按鈕','card'),
    node('planButton:30','實際入帳按鈕','card'),
    node('planButton:32','刪除預告按鈕','card'),
    node('dividendRow:34','正式入帳列','card'),
    node('dateBadgeText:35','入帳日期'),
    node('stockName:36','ETF 名稱'),
    node('symbol:37','代號／股數／每股股息'),
    node('symbol:38','明細展開提示'),
    node('dividendAmount:47','淨入帳金額'),
    node('status:48','入帳狀態'),
    node('empty:49','清單空白提示'),
  ],
  'annual-trend':[
    node('barCol:50','每月趨勢柱','card'),
    node('barLabel:51','月份標籤'),
  ],
};

/** Resolves a component-type button to an actual visible dividend target.
 * The calendar's primary text entry is the day number, not a dashboard placeholder.
 */
export function dividendTargetForKind(frameKey:string,kind:'card'|'text'|'value'):DividendEditorItem|undefined {
  const items=DIVIDEND_EDITOR_CATALOG[frameKey]??[];
  const preferred=frameKey==='dividend-calendar'
    ?kind==='text'?'dayText:12':kind==='card'?'day:11':'calendarCount:3'
    :undefined;
  if(preferred){
    const match=items.find(item=>item.id===dividendTargetId('native:DividendScreen:'+preferred));
    if(match)return match;
  }
  return items.find(item=>item.kind===kind)
    ??(kind==='text'?items.find(item=>item.kind==='value'):undefined);
}

/** Match a tapped real node against its catalog; do not infer semantics from its value. */
export function dividendCatalogTarget(id:string):DividendEditorItem|undefined {
  for(const items of Object.values(DIVIDEND_EDITOR_CATALOG)){
    const target=items.find(item=>item.id===id);
    if(target)return target;
  }
  return undefined;
}
