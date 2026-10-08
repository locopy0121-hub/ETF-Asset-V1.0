import {useSettingsRuntime} from './SettingsRuntime';
import {formatAmount,formatDate,formatPercent} from './displayFormat';
export function useDisplayFormat(){
  const {prefs}=useSettingsRuntime();
  return {
    money:(value:number)=>formatAmount(value,prefs.display),
    percent:(value:number)=>formatPercent(value,prefs.display),
    date:(value:string)=>formatDate(value,prefs.display),
  };
}
