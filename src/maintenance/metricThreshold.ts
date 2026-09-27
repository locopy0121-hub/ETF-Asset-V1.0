/** Read-only visual comparisons for existing native metric text. */
export type MetricThresholdOperator='gte'|'lte';
export function metricThresholdMatches(raw:string,enabled:boolean,limit:number,operator:MetricThresholdOperator):boolean {
 if(!enabled||!Number.isFinite(limit)||Math.abs(limit)>1000000000000)return false;
 const match=/^\s*(?:NT\$\s*)?([+\-−]?)(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d+))?\s*$/.exec(raw);
 if(!match)return false;
 const [,sign='',integer='',fraction='']=match;
 if(/^0\d{3,}$/.test(integer))return false;
 const n=Number(sign.replace('−','-')+integer.replace(/,/g,'')+(fraction?'.'+fraction:''));
 if(!Number.isFinite(n))return false;
 return operator==='gte'?n>=limit:n<=limit;
}
