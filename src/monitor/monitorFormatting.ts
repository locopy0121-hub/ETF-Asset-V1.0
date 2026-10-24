import type {MonitorFormat,MonitorFormatted,MonitorStyle} from './monitorDomain';
export const MONITOR_WEIGHTS=['100','200','300','400','500','600','700','800','900'] as const;
export const MONITOR_COLOR_KEYS=['textColor','backgroundColor','borderColor','secondaryTextColor'] as const;
export function normalizeMonitorFormat(raw:MonitorFormat|undefined):MonitorFormat{
  const weight=MONITOR_WEIGHTS.includes(raw?.fontWeight as typeof MONITOR_WEIGHTS[number])?raw!.fontWeight:undefined;
  const line=raw?.lineHeight;
  return {...(weight?{fontWeight:weight}:{}),...(typeof line==='number'&&Number.isFinite(line)?{lineHeight:Math.min(3,Math.max(1,line))}:{}),profitColors:Array.isArray(raw?.profitColors)?[...new Set(raw.profitColors.filter(x=>(MONITOR_COLOR_KEYS as readonly string[]).includes(x)))]:[]};
}
export function monitorTone(n:number|null|undefined,palette:Pick<MonitorStyle,'gainColor'|'lossColor'|'neutralColor'>){return typeof n==='number'&&Number.isFinite(n)&&n!==0?n>0?palette.gainColor:palette.lossColor:palette.neutralColor;}
export function monitorBoundColor(target:MonitorFormatted,key:string,fallback:string,n:number|null|undefined,palette:Pick<MonitorStyle,'gainColor'|'lossColor'|'neutralColor'>){return target.format?.profitColors?.includes(key)?monitorTone(n,palette):fallback;}
export function monitorTypography(target:MonitorFormatted,base:MonitorFormatted,size:number){const fontWeight=target.format?.fontWeight??base.format?.fontWeight;const line=target.format?.lineHeight??base.format?.lineHeight;return {...(fontWeight?{fontWeight}:{}),...(line?{lineHeight:Math.round(size*line)}:{})};}
export function monitorSourceClock(rows:readonly {updatedAt?:string|null}[]){const stamps=rows.map(x=>Date.parse(x.updatedAt??'')).filter(Number.isFinite);return stamps.length?new Date(Math.max(...stamps)).toLocaleTimeString('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}):'--:--:--';}
