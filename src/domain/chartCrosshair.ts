/** Deterministic coordinate to verified historical candle mapping. */
export const candleIndexAtX=(x:number,scrollX:number,length:number,step=18,leftPad=3):number=>
  length>0?Math.max(0,Math.min(length-1,Math.floor((x+scrollX-leftPad)/step))):-1;
