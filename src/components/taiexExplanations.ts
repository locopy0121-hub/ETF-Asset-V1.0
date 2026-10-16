/** Static market-index explanations are editable for presentation only.
 * Price/quote and formulas remain protected read-only data. */
export const TAIEX_EXPLANATIONS:Readonly<Record<string,string>>={
  'market:index:refresh:button:label':'更新',
  'market:index:three-gates:button:label':'三關價',
  'market:index:range:d1:button:label':'1日',
  'market:index:range:d5:button:label':'5日',
  'market:index:range:m1:button:label':'1月',
  'market:index:range:m6:button:label':'6月',
  'market:index:range:ytd:button:label':'今年',
  'market:index:range:y1:button:label':'1年',
  'market:index:note:live':'日內走勢優先顯示證交所 MI_5MINS_INDEX 09:00～13:30 每 5 秒歷史點位；官方報表尚未公布時只顯示 App 實際取得的 MIS 快照，不補造未取得時段。',
  'market:index:note:history':'5日、1月、6月、今年及1年的走勢使用 TWSE FMTQIK 公告之逐日收盤指數，不視為盤中逐筆行情。',
  'market:index:note:gates':'五線式三關價使用前一交易日最高／最低：上關價2＝昨低＋振幅×1.382；上關價1＝昨高；中關價＝(昨高＋昨低)÷2；下關價1＝昨低；下關價2＝昨高－振幅×1.382。五條線在圖表左側標註，只疊加於當日走勢；非保證支撐或壓力。',
  'market:index:note:source':'官方來源：TWSE MIS／FMTQIK／MI_5MINS_HIST／MI_5MINS_INDEX。休市顯示最後有效收盤，不以「待取得」代替。開高低僅顯示來源與同交易日核實的數據；52週極值是逐日收盤點位，定義不同。',
};
