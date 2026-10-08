import type {DisplayPrefs} from './SettingsRuntime';

type FormatPrefs=Pick<DisplayPrefs,'fontScale'|'amountDecimals'|'percentDecimals'|'thousandsSeparator'|'dateFormat'>;
export function formatAmount(value:number,prefs:FormatPrefs):string{
  if(!Number.isFinite(value))return '待核對';
  return value.toLocaleString('zh-TW',{useGrouping:prefs.thousandsSeparator,
    minimumFractionDigits:prefs.amountDecimals,maximumFractionDigits:prefs.amountDecimals});
}
export function formatPercent(value:number,prefs:FormatPrefs):string{
  if(!Number.isFinite(value))return '待核對';
  return value.toFixed(prefs.percentDecimals)+'%';
}
export function formatDate(value:string,prefs:FormatPrefs):string{
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(!match)return value;
  const date=new Date(value+'T00:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)return value;
  return prefs.dateFormat==='YYYY/MM/DD'?value.replace(/-/g,'/'):value;
}
export function scaledFontSize(size:number,prefs:Pick<DisplayPrefs,'fontScale'>):number{
  const scale=Number.isFinite(prefs.fontScale)?Math.max(.8,Math.min(1.4,prefs.fontScale)):1;
  return size*scale;
}
