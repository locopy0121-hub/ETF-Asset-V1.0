// Conditional styling is visual-only. Rules use the ACTUAL mounted target's
// gain/loss/neutral presentation tone, never compute or rewrite financial values.
export type ConditionalTone='gain'|'loss'|'neutral';
export type ConditionalRule=Readonly<{
 enabled:boolean;
 textColor?:string;
 backgroundColor?:string;
 borderColor?:string;
 backgroundOpacity?:number;
}>;
export type ConditionalStyleMap=Readonly<Partial<Record<ConditionalTone,ConditionalRule>>>;
export const CONDITIONAL_TONES=['gain','loss','neutral'] as const;
const COLORS=['textColor','backgroundColor','borderColor'] as const;
const hex=(value:unknown):value is string=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);
export function normalizeConditionalStyles(input:unknown):ConditionalStyleMap {
 if(!input||typeof input!=='object'||Array.isArray(input))return {};
 const source=input as Record<string,unknown>,rules:Partial<Record<ConditionalTone,ConditionalRule>>={};
 for(const tone of CONDITIONAL_TONES){
   const original=source[tone];
   if(!original||typeof original!=='object'||Array.isArray(original))continue;
   const raw=original as Record<string,unknown>;
   const rule:Record<string,unknown>={enabled:raw.enabled===true};
   for(const key of COLORS)if(hex(raw[key]))rule[key]=raw[key].toUpperCase();
   if(typeof raw.backgroundOpacity==='number'&&Number.isFinite(raw.backgroundOpacity))
     rule.backgroundOpacity=Math.min(1,Math.max(0,raw.backgroundOpacity));
   rules[tone]=rule as ConditionalRule;
 }
 return rules;
}
export function activeConditionalRule(styles:ConditionalStyleMap|undefined,tone:ConditionalTone):ConditionalRule|null {
 const selected=styles?.[tone];
 return selected?.enabled?selected:null;
}
type ConditionalAppearance={
 conditionalStyles?:ConditionalStyleMap|undefined;
 textColor?:string|undefined;backgroundColor?:string|undefined;borderColor?:string|undefined;
 backgroundOpacity?:number|undefined;
 textProfitColor?:boolean|undefined;backgroundProfitColor?:boolean|undefined;
 borderProfitColor?:boolean|undefined;useProfitColor?:boolean|undefined;
};
export function applyConditionalAppearance<T extends ConditionalAppearance>(base:T,tone:ConditionalTone):T {
 const rule=activeConditionalRule(base.conditionalStyles,tone);
 if(!rule)return base;
 const patch:Record<string,unknown>={};
 for(const key of COLORS)if(rule[key]!==undefined)patch[key]=rule[key];
 if(rule.backgroundOpacity!==undefined)patch.backgroundOpacity=rule.backgroundOpacity;
 // An explicit conditional palette must remain visible even when legacy profit
 // linked colors are enabled on the original element.
 if(rule.textColor!==undefined){patch.textProfitColor=false;patch.useProfitColor=false;}
 if(rule.backgroundColor!==undefined)patch.backgroundProfitColor=false;
 if(rule.borderColor!==undefined)patch.borderProfitColor=false;
 return {...base,...patch};
}
export const CONDITIONAL_RULE_FIELDS=['enabled','textColor','backgroundColor','borderColor','backgroundOpacity'] as const;
