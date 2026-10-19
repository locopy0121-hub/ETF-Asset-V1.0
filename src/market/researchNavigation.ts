/** A navigation request carries identity only, never holdings, prices or cost basis. */
export type ResearchSelection=Readonly<{symbol:string;name:string}>;
export function makeResearchSelection(symbol:string,name:string):ResearchSelection|null{
 const normalized=symbol.trim().toUpperCase();
 if(!/^[0-9A-Z]{4,10}$/.test(normalized))return null;
 return {symbol:normalized,name:name.trim()||normalized};
}
