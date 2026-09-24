import {buildDividendCalendarEvents, deviceLocalCalendarDate, type DividendCalendarEventType} from '../dividend/dividendCalendar';
import type {DividendLedgerEntry} from '../finance/canonicalLedger';
import {DEFAULT_ITEM_EFFECT, ITEM_EFFECT_INTENSITIES, ITEM_EFFECT_KINDS, ITEM_EFFECT_SPEEDS, ITEM_EFFECT_TRIGGERS, type ItemEffectConfig} from './displayItemContract';

/** Presentation-only metadata. Never writes to a portfolio, quote or ledger. */
export type EtfBadgeKey='etfType'|'dividendType'|'reminder';
export type EtfReminderType=Extract<DividendCalendarEventType,'lastBuyDate'|'exDate'|'paymentDate'>;
export type EtfBadgeStyle=Readonly<{
  enabled:boolean;
  customText:string;
  fontScale:number;
  textColor:string;
  backgroundColor:string;
  borderColor:string;
  borderWidth:number;
  borderRadius:number;
  paddingX:number;
  paddingY:number;
  opacity:number;
  effect:ItemEffectConfig;
}>;
export type EtfBadgeConfig=Readonly<{
  order:readonly EtfBadgeKey[];
  badges:Readonly<Record<EtfBadgeKey,EtfBadgeStyle>>;
  reminderEvents:readonly EtfReminderType[];
}>;
const base=(textColor:string,backgroundColor:string,borderColor:string):EtfBadgeStyle=>({
  enabled:true,customText:'',fontScale:1,textColor,backgroundColor,borderColor,borderWidth:0,borderRadius:5,paddingX:3,paddingY:1,opacity:1,effect:{...DEFAULT_ITEM_EFFECT},
});
export const DEFAULT_ETF_BADGES:EtfBadgeConfig={
  order:['etfType','dividendType','reminder'],
  badges:{
    etfType:base('#184D91','#DCEAFE','#84B6F4'),
    dividendType:base('#166534','#DCFCE7','#86D49C'),
    reminder:{...base('#92400E','#FEF3C7','#FBBF24'),effect:{...DEFAULT_ITEM_EFFECT,kind:'pulse',trigger:'alert',speed:'slow',intensity:'soft'}},
  },
  reminderEvents:['lastBuyDate','exDate','paymentDate'],
};
const clamp=(value:unknown,lo:number,hi:number,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?Math.min(hi,Math.max(lo,value)):fallback;
const color=(v:unknown,fallback:string)=>typeof v==='string'&&/^#[a-f\d]{6}$/i.test(v)?v:fallback;
const KEYS:readonly EtfBadgeKey[]=['etfType','dividendType','reminder'];
const EVENTS:readonly EtfReminderType[]=['lastBuyDate','exDate','paymentDate'];
export function normalizeEtfBadges(raw:unknown):EtfBadgeConfig{
  const value=raw&&typeof raw==='object'?raw as Partial<EtfBadgeConfig>:{};
  const badges={} as Record<EtfBadgeKey,EtfBadgeStyle>;
  for(const key of KEYS){
    const fallback=DEFAULT_ETF_BADGES.badges[key];
    const candidate=value.badges?.[key]??fallback;
    const e=candidate.effect??fallback.effect;
    badges[key]={
      enabled:candidate.enabled!==false,
      customText:typeof candidate.customText==='string'?candidate.customText.trim().slice(0,16):'',
      fontScale:clamp(candidate.fontScale,.7,1.5,fallback.fontScale),
      textColor:color(candidate.textColor,fallback.textColor),
      backgroundColor:color(candidate.backgroundColor,fallback.backgroundColor),
      borderColor:color(candidate.borderColor,fallback.borderColor),
      borderWidth:clamp(candidate.borderWidth,0,3,fallback.borderWidth),
      borderRadius:clamp(candidate.borderRadius,0,16,fallback.borderRadius),
      paddingX:clamp(candidate.paddingX,0,12,fallback.paddingX),
      paddingY:clamp(candidate.paddingY,0,8,fallback.paddingY),
      opacity:clamp(candidate.opacity,.25,1,fallback.opacity),
      effect:{
        kind:ITEM_EFFECT_KINDS.includes(e.kind)?e.kind:fallback.effect.kind,
        trigger:ITEM_EFFECT_TRIGGERS.includes(e.trigger)?e.trigger:fallback.effect.trigger,
        speed:ITEM_EFFECT_SPEEDS.includes(e.speed)?e.speed:fallback.effect.speed,
        intensity:ITEM_EFFECT_INTENSITIES.includes(e.intensity)?e.intensity:fallback.effect.intensity,
      },
    };
  }
  const order=Array.isArray(value.order)?value.order.filter((key):key is EtfBadgeKey=>KEYS.includes(key as EtfBadgeKey)):[];
  const events=Array.isArray(value.reminderEvents)?value.reminderEvents.filter((event):event is EtfReminderType=>EVENTS.includes(event as EtfReminderType)):DEFAULT_ETF_BADGES.reminderEvents;
  return {badges,order:[...new Set([...order,...KEYS])],reminderEvents:events};
}
/** Only existing dated dividend entries; never infer a last buy day from an ex-date. */
export function todayEtfReminderMap(entries:readonly DividendLedgerEntry[],today=deviceLocalCalendarDate(),allowedEvents:readonly EtfReminderType[]=DEFAULT_ETF_BADGES.reminderEvents):Map<string,EtfReminderType>{
  const result=new Map<string,EtfReminderType>();
  const events=buildDividendCalendarEvents(entries,today);
  for(const type of EVENTS.filter(event=>allowedEvents.includes(event))){
    for(const event of events){
      if(event.date===today&&event.type===type&&!result.has(event.symbol))result.set(event.symbol,type);
    }
  }
  return result;
}
export function etfReminderLabel(type:EtfReminderType):string{
  if(type==='lastBuyDate')return '最後買進日';
  if(type==='exDate')return '今日除息';
  return '股息發放';
}
export function badgeDisplayText(key:EtfBadgeKey,etfType:string|null|undefined,dividendType:string|null|undefined,reminder?:EtfReminderType|null):string{
  if(key==='etfType')return etfType?.trim()||'待確認';
  if(key==='dividendType')return dividendType?.trim()||'待確認';
  return reminder?etfReminderLabel(reminder):'';
}

/** Visible fallback labels distinguish taxonomy from payout policy without inventing metadata. */
export function badgePresentationText(key:EtfBadgeKey,etfType:string|null|undefined,dividendType:string|null|undefined,reminder?:EtfReminderType|null):string{
  const source=badgeDisplayText(key,etfType,dividendType,reminder);
  const shown=source==='待確認'?(key==='etfType'?'類別待確認':'配息待確認'):source;
  return key==='etfType'&&shown.endsWith('型')?shown.slice(0,-1):shown;
}
