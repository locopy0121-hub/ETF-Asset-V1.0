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
  'market:index:note:live':'日內走勢只顯示本機確實取得的 TWSE 指數快照；相隔超過 10 分鐘的點位不強行連線，也不補造未收集時段。',
  'market:index:note:history':'5日、1月、6月、今年及1年的走勢使用 TWSE FMTQIK 公告之逐日收盤指數，不視為盤中逐筆行情。',
  'market:index:note:gates':'三關價由上一交易日官方最高、最低指數計算：上關＝昨低＋振幅×1.382；中關＝(昨高＋昨低)÷2；下關＝昨高－振幅×1.382。僅作參考，非保證支撐或壓力；僅疊加於1日圖。',
  'market:index:note:source':'官方來源：TWSE MIS／FMTQIK／MI_5MINS_HIST。休市顯示最後有效收盤，不以「待取得」代替。開高低僅顯示來源與同交易日核實的數據；52週極值是逐日收盤點位，定義不同。',
};
