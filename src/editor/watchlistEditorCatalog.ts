import type {LayoutSelectionTarget} from './LayoutSelectionContext';
export const watchlistEditorCatalog:readonly LayoutSelectionTarget[]=[
  {id:'market:watchlist:content',kind:'card',label:'自選清單內容'},
  {id:'market:watchlist:mode:list',kind:'card',label:'模式：清單'},
  {id:'market:watchlist:mode:compact',kind:'card',label:'模式：精簡卡片'},
  {id:'market:watchlist:mode:wall',kind:'card',label:'模式：行情牆'},
  {id:'market:watchlist:mode:chart',kind:'card',label:'模式：走勢圖卡'},
  {id:'market:watchlist:sort:symbol',kind:'card',label:'排序：代號'},
  {id:'market:watchlist:sort:price',kind:'card',label:'排序：現價'},
  {id:'market:watchlist:sort:changePercent',kind:'card',label:'排序：漲跌幅'},
  {id:'market:watchlist:sort:volume',kind:'card',label:'排序：成交量'},
  {id:'market:watchlist:direction',kind:'card',label:'排序方向'},
  {id:'market:watchlist:style',kind:'card',label:'沿用行情牆樣式'},
  {id:'market:watchlist:card:compact',kind:'card',label:'精簡卡片本體'},
  {id:'market:watchlist:card:wall',kind:'card',label:'行情牆卡片本體'},
  {id:'market:watchlist:card:chart',kind:'card',label:'走勢圖卡本體'},
  {id:'market:watchlist:item:symbol',kind:'text',label:'證券代號'},
  {id:'market:watchlist:item:name',kind:'text',label:'證券名稱'},
  {id:'market:watchlist:item:price',kind:'value',label:'即時現價'},
  {id:'market:watchlist:item:change',kind:'value',label:'漲跌金額'},
  {id:'market:watchlist:item:changePercent',kind:'value',label:'漲跌幅'},
  {id:'market:watchlist:item:previousClose',kind:'value',label:'昨日收盤'},
  {id:'market:watchlist:item:volume',kind:'value',label:'成交量'},
  {id:'market:watchlist:item:source',kind:'text',label:'行情來源／時間'},
  {id:'market:watchlist:item:chart',kind:'card',label:'實際分時圖'},
  {id:'market:watchlist:item:remove',kind:'card',label:'移除自選按鈕'},
] as const;
export function watchlistTargetByKind(kind:'card'|'text'|'value'):LayoutSelectionTarget{
  return watchlistEditorCatalog.find(item=>item.kind===kind)??watchlistEditorCatalog[0]!;
}
export function watchlistTarget(id:string){return watchlistEditorCatalog.find(item=>item.id===id);}
