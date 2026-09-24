import {DEFAULT_ITEM_EFFECT,ITEM_EFFECT_INTENSITIES,ITEM_EFFECT_KINDS,ITEM_EFFECT_SPEEDS,ITEM_EFFECT_TRIGGERS,type ItemEffectConfig} from './displayItemContract';
import type {HoldingQuote} from './uiModels';

/** Display-only fields reading canonical holding values without recalculating core finance. */
export type PortfolioColumnKey='shares'|'price'|'changePct'|'tradeAvg'|'costAvg'|'marketValue'|'pnl'|'roi'|'cumulativeDividend'|'weight'|'realizedPnl'|'comprehensivePnl';
export type PortfolioColumnConfig=Readonly<{
  key:PortfolioColumnKey;label:string;enabled:boolean;width:number;fontScale:number;
  textColor:string|null;backgroundColor:string|null;align:'left'|'center'|'right';effect:ItemEffectConfig;
}>;
export type PortfolioListConfig=Readonly<{fixedWidth:number;rowHeight:number;showName:boolean;columns:readonly PortfolioColumnConfig[]}>;
const field=(key:PortfolioColumnKey,label:string,width:number,enabled:boolean):PortfolioColumnConfig=>({
  key,label,width,enabled,fontScale:1,textColor:null,backgroundColor:null,align:'right',effect:{...DEFAULT_ITEM_EFFECT},
});
export const DEFAULT_PORTFOLIO_LIST:PortfolioListConfig={
  fixedWidth:192,rowHeight:64,showName:true,
  columns:[
    field('shares','股數',65,true),field('price','即時',76,true),field('tradeAvg','純均價',80,true),
    field('costAvg','含費均價',86,true),field('pnl','損益',100,true),field('roi','報酬率',82,true),
    field('changePct','今日漲跌%',88,false),field('marketValue','目前市值',98,false),
    field('cumulativeDividend','累計股息',98,false),field('weight','持股占比',83,false),
    field('realizedPnl','已實現損益',98,false),field('comprehensivePnl','含息損益',100,false),
  ],
};
const color=(v:unknown,fallback:string|null)=>v===null?null:typeof v==='string'&&/^#[a-f\d]{6}$/i.test(v)?v:fallback;
const clamp=(v:unknown,min:number,max:number,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;
export function normalizePortfolioList(raw:unknown):PortfolioListConfig{
  const value=raw&&typeof raw==='object'?raw as Partial<PortfolioListConfig>:{};
  const provided=Array.isArray(value.columns)?value.columns:[];
  const map=new Map(provided.map(x=>[x.key,x]));
  const order=[...new Set([...provided.map(x=>x.key),...DEFAULT_PORTFOLIO_LIST.columns.map(x=>x.key)])];
  const columns:PortfolioColumnConfig[]=order.flatMap(key=>{
    const fallback=DEFAULT_PORTFOLIO_LIST.columns.find(x=>x.key===key);
    if(!fallback)return [];
    const next=map.get(key)??fallback,e=next.effect??fallback.effect;
    return [{
      key:fallback.key,label:typeof next.label==='string'&&next.label.trim()?next.label.trim().slice(0,16):fallback.label,
      enabled:next.enabled!==false,width:clamp(next.width,54,150,fallback.width),fontScale:clamp(next.fontScale,.7,1.5,1),
      textColor:color(next.textColor,null),backgroundColor:color(next.backgroundColor,null),
      align:next.align==='left'||next.align==='center'?'left'===next.align?'left':'center':'right',
      effect:{
        kind:ITEM_EFFECT_KINDS.includes(e.kind)?e.kind:fallback.effect.kind,
        trigger:ITEM_EFFECT_TRIGGERS.includes(e.trigger)?e.trigger:fallback.effect.trigger,
        speed:ITEM_EFFECT_SPEEDS.includes(e.speed)?e.speed:fallback.effect.speed,
        intensity:ITEM_EFFECT_INTENSITIES.includes(e.intensity)?e.intensity:fallback.effect.intensity,
      },
    }];
  });
  return {
    fixedWidth:clamp(value.fixedWidth,160,270,DEFAULT_PORTFOLIO_LIST.fixedWidth),
    rowHeight:clamp(value.rowHeight,52,96,DEFAULT_PORTFOLIO_LIST.rowHeight),
    showName:value.showName!==false,
    columns,
  };
}
const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');
export function portfolioColumnValue(row:HoldingQuote,key:PortfolioColumnKey):{value:string;tone:'gain'|'loss'|'flat'|'default';numeric:number}{
  const change=row.price-row.previousClose;
  const percent=row.previousClose>0?change/row.previousClose*100:0;
  if(key==='shares')return {value:money(row.shares),tone:'default',numeric:row.shares};
  if(key==='price')return {value:row.price.toFixed(2),tone:change>0?'gain':change<0?'loss':'flat',numeric:row.price};
  if(key==='changePct')return {value:(percent>=0?'+':'')+percent.toFixed(2)+'%',tone:percent>0?'gain':percent<0?'loss':'flat',numeric:percent};
  if(key==='tradeAvg')return {value:row.tradeAvg.toFixed(2),tone:'default',numeric:row.tradeAvg};
  if(key==='costAvg')return {value:row.costAvg.toFixed(2),tone:'default',numeric:row.costAvg};
  if(key==='marketValue')return {value:'NT$ '+money(row.marketValue),tone:'default',numeric:row.marketValue};
  if(key==='pnl')return {value:'NT$ '+money(row.pnl),tone:row.pnl>=0?'gain':'loss',numeric:row.pnl};
  if(key==='roi')return {value:(row.roi>=0?'+':'')+row.roi.toFixed(2)+'%',tone:row.roi>=0?'gain':'loss',numeric:row.roi};
  if(key==='cumulativeDividend')return {value:'NT$ '+money(row.cumulativeDividend),tone:'default',numeric:row.cumulativeDividend};
  if(key==='weight')return {value:row.weight.toFixed(1)+'%',tone:'default',numeric:row.weight};
  if(key==='realizedPnl')return {value:'NT$ '+money(row.realizedPnl),tone:row.realizedPnl>=0?'gain':'loss',numeric:row.realizedPnl};
  return {value:'NT$ '+money(row.comprehensivePnl),tone:row.comprehensivePnl>=0?'gain':'loss',numeric:row.comprehensivePnl};
}
