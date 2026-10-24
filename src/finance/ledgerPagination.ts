export const LEDGER_PAGE_SIZES=[10,20,50] as const;
export type LedgerPageSize=typeof LEDGER_PAGE_SIZES[number];

export function ledgerPageCount(totalRows:number,pageSize:LedgerPageSize):number{
  const safeTotal=Number.isFinite(totalRows)?Math.max(0,Math.floor(totalRows)):0;
  return Math.max(1,Math.ceil(safeTotal/pageSize));
}

export function clampLedgerPage(page:number,totalRows:number,pageSize:LedgerPageSize):number{
  const totalPages=ledgerPageCount(totalRows,pageSize);
  const safePage=Number.isFinite(page)?Math.floor(page):1;
  return Math.max(1,Math.min(totalPages,safePage));
}

export function ledgerPageSlice<T>(rows:readonly T[],page:number,pageSize:LedgerPageSize):T[]{
  const current=clampLedgerPage(page,rows.length,pageSize);
  const start=(current-1)*pageSize;
  return rows.slice(start,start+pageSize);
}
