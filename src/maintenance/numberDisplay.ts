/**
 * Read-only display formatting for the currently selected native metric/value A.
 * Does not mutate money sources, ledger values or any persisted trading fields.
 * Unrecognised, provisional and non-numeric strings are returned byte-for-byte.
 */
export type DisplayUnit='original'|'yuan'|'thousand'|'ten-thousand'|'million';
export const DISPLAY_UNITS:readonly Readonly<{id:DisplayUnit;label:string;scale:number;suffix:string}>[]=[
 {id:'original',label:'原始顯示',scale:1,suffix:''},
 {id:'yuan',label:'元',scale:1,suffix:'元'},
 {id:'thousand',label:'千',scale:1000,suffix:'千'},
 {id:'ten-thousand',label:'萬',scale:10000,suffix:'萬'},
 {id:'million',label:'百萬',scale:1000000,suffix:'百萬'},
];
export function formatDisplayNumber(raw:string,unit:DisplayUnit,digits:number):string {
 if(unit==='original')return raw;
 const option=DISPLAY_UNITS.find(item=>item.id===unit);
 if(!option)return raw;
 // Only complete number strings or explicitly prefixed NT$ amounts qualify.
 // A stock code, %, loading text, dates and compound numbers stay unchanged.
 const match=/^(\s*)(NT\$\s*)?([+\-−]?)(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d+))?(\s*)$/.exec(raw);
 if(!match)return raw;
 const [,leading,currency='',sign='',integer,decimal='',trailing]=match;
 const n=Number(integer.replace(/,/g,'')+(decimal?'.'+decimal:''));
 if(!Number.isFinite(n)||!Number.isSafeInteger(Number(integer.replace(/,/g,''))))return raw;
 const places=Math.min(4,Math.max(0,Number.isFinite(digits)?Math.round(digits):0));
 const scaled=n/option.scale;
 const fixed=scaled.toFixed(places);
 const [whole,fraction]=fixed.split('.');
 const grouped=whole.replace(/\B(?=(\d{3})+(?!\d))/g,',');
 const rendered=grouped+(fraction!==undefined?'.'+fraction:'');
 return leading+currency+sign+rendered+(option.id==='yuan'&&currency?'':option.suffix)+trailing;
}
