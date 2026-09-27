/** One source of truth for the Widget preview's fixed-width native-style rows. */
export function wallGridRows<T>(items:readonly T[],requestedColumns:number,maxRows=4):(T|null)[][] {
  const columns=Math.min(4,Math.max(1,Math.floor(Number.isFinite(requestedColumns)?requestedColumns:4)));
  const limit=columns*Math.max(1,Math.min(4,Math.floor(maxRows)));
  const visible=items.slice(0,limit);
  const rows:(T|null)[][]=[];
  for(let start=0;start<visible.length;start+=columns){
    const row:(T|null)[]=visible.slice(start,start+columns);
    while(row.length<columns)row.push(null);
    rows.push(row);
  }
  return rows;
}
