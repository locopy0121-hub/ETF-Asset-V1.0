import {calculateCanonicalLedgerSnapshot} from '../finance/canonicalLedger';
import {ensureLedgerQuoteCoverage} from '../finance/runtimeQuoteCoverage';
import type {CanonicalLedgerEntry,DividendLedgerEntry} from '../finance/canonicalLedger';

/** Plans never enter the canonical ledger until an explicit confirmed receipt. */
export type DividendPlan={id:string;symbol:string;name:string;status:'forecast'|'confirmed';paymentDate:string;lastBuyDate:string;exDate:string;recordDate:string;perShareAmount:number|null;sharesHeld:number|null;note:string};
export type DividendPlanState={entries:CanonicalLedgerEntry[];dividendPlans:DividendPlan[]};
export type DividendPlanAction={type:'save';plan:DividendPlan}|{type:'import';plan:DividendPlan}|{type:'confirm'|'post'|'delete';id:string};
export function isIsoCalendarDate(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T12:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function validateDividendDates(plan:Pick<DividendPlan,'paymentDate'|'lastBuyDate'|'exDate'|'recordDate'>):string|undefined{
  const dates=[['最後購買日',plan.lastBuyDate],['除息日',plan.exDate],['收益分配基準日',plan.recordDate],['配發日',plan.paymentDate]] as const;
  for(const [label,date] of dates)if(date&&!isIsoCalendarDate(date))return label+'不是有效的日曆日期';
  const known=dates.filter(([,date])=>Boolean(date));
  for(let i=1;i<known.length;i++)if(known[i-1]![1]>known[i]![1])return '股息日期順序應為最後購買日、除息日、基準日、配發日';
  if(plan.lastBuyDate&&plan.exDate&&plan.lastBuyDate===plan.exDate)return '最後購買日必須早於除息日';
  return undefined;
}
export function dividendAutofill(symbol:string,holdings:readonly {symbol:string;name:string;shares:number}[]){
  const holding=holdings.find(row=>row.symbol===symbol);
  return {name:holding?.name??'',shares:holding?String(holding.shares):''};
}
export function validateDividendPlan(plan:DividendPlan,confirm=false):string|undefined{
  if(!plan||typeof plan!=='object')return '股息事件格式錯誤';
  if(typeof plan.id!=='string'||!/^[-\w]{1,100}$/.test(plan.id)||typeof plan.symbol!=='string'||!/^\d{4,6}[A-Z]?$/.test(plan.symbol)||typeof plan.name!=='string'||!plan.name.trim())return '請確認事件代號、證券代號與名稱';
  if(!['forecast','confirmed'].includes(plan.status)||typeof plan.note!=='string')return '股息狀態格式錯誤';
  for(const field of ['paymentDate','lastBuyDate','exDate','recordDate'] as const)if(typeof plan[field]!=='string')return '股息日期格式錯誤';
  const dateError=validateDividendDates(plan);if(dateError)return dateError;
  if(![plan.paymentDate,plan.lastBuyDate,plan.exDate,plan.recordDate].some(Boolean))return '請至少填寫一個公告日期';
  if(plan.perShareAmount!==null&&(!Number.isFinite(plan.perShareAmount)||plan.perShareAmount<=0))return '每股股息需為正數或留空待公告';
  if(plan.sharesHeld!==null&&(!Number.isSafeInteger(plan.sharesHeld)||plan.sharesHeld<=0))return '符合配息股數需為正整數或留空待核對';
  if(confirm||plan.status==='confirmed'){
    if(!plan.paymentDate||plan.perShareAmount===null||plan.sharesHeld===null)return '確認前需填寫配發日、每股股息與符合配息股數';
  }
  return undefined;
}
const receiptId=(id:string)=>'dividend-plan-'+id;
export const dividendPlanStatus=(plan:DividendPlan,entries:readonly CanonicalLedgerEntry[]):'forecast'|'confirmed'|'paid'=>
  entries.some(row=>row.id===receiptId(plan.id)&&row.kind==='dividend')?'paid':plan.status;
export function restoreDividendPlans(value:unknown):DividendPlan[]{
  if(value===undefined)return [];
  if(!Array.isArray(value))throw new Error('股息預告清單格式錯誤');
  const seen=new Set<string>();
  return value.map(row=>{
    const plan=row as DividendPlan;
    const error=validateDividendPlan(plan);
    if(error||seen.has(plan.id))throw new Error(error??'股息事件 ID 重複');
    seen.add(plan.id);return {...plan};
  });
}
export function dividendPlanToLedger(plan:DividendPlan):DividendLedgerEntry{
  return {id:receiptId(plan.id),kind:'dividend',symbol:plan.symbol,name:plan.name,date:plan.paymentDate,
    perShareAmount:plan.perShareAmount!,sharesHeld:plan.sharesHeld!,
    note:['手動股息事件確認入帳',plan.lastBuyDate?'最後購買日 '+plan.lastBuyDate:'',plan.exDate?'除息日 '+plan.exDate:'',plan.recordDate?'收益分配基準日 '+plan.recordDate:'','配發日 '+plan.paymentDate,plan.note].filter(Boolean).join('；')};
}
export function hasDividendReceipt(entries:readonly CanonicalLedgerEntry[],entry:DividendLedgerEntry){
  return entries.some(row=>row.id===entry.id||(row.kind==='dividend'&&row.symbol===entry.symbol&&row.date===entry.date));
}
export function validDividendReceipt(entry:DividendLedgerEntry,today:string){
  return Boolean(entry.id&&entry.symbol&&entry.name&&isIsoCalendarDate(entry.date)&&entry.date<=today&&Number.isFinite(entry.perShareAmount)&&entry.perShareAmount>0&&Number.isSafeInteger(entry.sharesHeld)&&entry.sharesHeld>0);
}
export function reduceDividendPlans(state:DividendPlanState,action:DividendPlanAction,today:string):{state:DividendPlanState;error?:string}{
  const fail=(error:string)=>({state,error});
  if(action.type==='save'||action.type==='import'){
    const error=validateDividendPlan({...action.plan,status:'forecast'});if(error)return fail(error);
    const existing=state.dividendPlans.find(row=>row.id===action.plan.id);
    if(action.type==='import'&&existing)return fail('股息預告已存在，請到股息頁編輯，匯入不覆寫已核對資料');
    if(existing&&dividendPlanStatus(existing,state.entries)==='paid')return fail('已入帳事件不可修改，請在交易紀錄處理正式帳務');
    const plan={...action.plan,status:'forecast' as const};
    if(state.dividendPlans.some(row=>row.id!==plan.id&&row.symbol===plan.symbol&&((row.paymentDate&&row.paymentDate===plan.paymentDate)||(row.exDate&&plan.exDate&&row.exDate===plan.exDate))))return fail('相同股息事件已存在，請編輯既有預告');
    return {state:{...state,dividendPlans:[...state.dividendPlans.filter(row=>row.id!==plan.id),plan]}};
  }
  const plan=state.dividendPlans.find(row=>row.id===action.id);if(!plan)return fail('找不到股息事件');
  const paid=dividendPlanStatus(plan,state.entries)==='paid';
  if(action.type==='post'&&paid)return {state}; // Safe replay, including after restart.
  if(paid)return fail('已入帳事件不可刪除或重新確認，請在交易紀錄處理正式帳務');
  if(action.type==='delete')return {state:{...state,dividendPlans:state.dividendPlans.filter(row=>row.id!==action.id)}};
  const error=validateDividendPlan(plan,true);if(error)return fail(error);
  if(action.type==='confirm')return {state:{...state,dividendPlans:state.dividendPlans.map(row=>row.id===action.id?{...row,status:'confirmed'}:row)}};
  if(plan.status!=='confirmed')return fail('請先確認股息事件');
  if(!isIsoCalendarDate(today)||plan.paymentDate>today)return fail('尚未到配發日，不能提前寫入現金帳務');
  const receipt=dividendPlanToLedger(plan);
  if(hasDividendReceipt(state.entries,receipt))return fail('正式帳務已有相同股息，請核對既有紀錄');
  return {state:{...state,entries:[...state.entries,receipt]}};
}

/** Read the unchanged core's share balance at the announced eligibility boundary. */
export function dividendEligibleShares(entries:readonly CanonicalLedgerEntry[],symbol:string,lastBuyDate:string,exDate:string,today:string):number|null{
  const cutoff=lastBuyDate||exDate;
  if(!isIsoCalendarDate(cutoff)||cutoff>today||validateDividendDates({lastBuyDate,exDate,recordDate:'',paymentDate:''}))return null;
  const eligible=entries.filter(row=>lastBuyDate?row.date<=lastBuyDate:row.date<exDate);
  const snapshot=calculateCanonicalLedgerSnapshot({initialCash:0,entries:eligible,quotes:ensureLedgerQuoteCoverage(eligible,[])});
  return snapshot.holdings.find(row=>row.etfCode===symbol)?.totalShares??0;
}
