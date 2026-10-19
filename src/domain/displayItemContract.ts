// Shared animation catalog for the page editor and live quote renderer.
// Keep IDs stable: saved wall layouts persist these values.
export const ITEM_EFFECT_CATALOG = [
  {id:'none',label:'無',group:'basic'},
  {id:'fade',label:'淡入',group:'basic'},
  {id:'pulse',label:'脈衝',group:'basic'},
  {id:'flash-on-change',label:'變動閃爍',group:'basic'},
  {id:'bounce',label:'跳動',group:'basic'},
  {id:'slide-in',label:'滑入',group:'entrance'},
  {id:'zoom-in',label:'縮放進場',group:'entrance'},
  {id:'spring-in',label:'彈性進場',group:'entrance'},
  {id:'flip-in',label:'翻轉進場',group:'entrance'},
  {id:'expand',label:'展開',group:'entrance'},
  {id:'slide-out',label:'滑出',group:'exit'},
  {id:'shrink-out',label:'縮小消失',group:'exit'},
  {id:'flip-out',label:'翻轉退場',group:'exit'},
  {id:'collapse',label:'收合',group:'exit'},
  {id:'breathe',label:'呼吸',group:'emphasis'},
  {id:'shake',label:'微震動',group:'emphasis'},
  {id:'sway',label:'搖擺',group:'emphasis'},
  {id:'elastic',label:'彈性回彈',group:'emphasis'},
  {id:'halo-pulse',label:'光暈脈衝',group:'emphasis'},
  {id:'number-roll',label:'數字滾動',group:'numeric'},
  {id:'count-up',label:'數字遞增',group:'numeric'},
  {id:'count-down',label:'數字遞減',group:'numeric'},
  {id:'numeric-tween',label:'漸變過渡',group:'numeric'},
  {id:'flip-number',label:'翻牌更新',group:'numeric'},
  {id:'digit-slide',label:'位數滑動',group:'numeric'},
  {id:'shimmer',label:'流光掃過',group:'visual'},
  {id:'border-flow',label:'邊框流動',group:'visual'},
  {id:'gradient-flow',label:'漸層流動',group:'visual'},
  {id:'sparkle',label:'光點閃耀',group:'visual'},
  {id:'ripple',label:'波紋擴散',group:'visual'},
  {id:'bg-pulse',label:'底色脈衝',group:'visual'},
  {id:'press-scale',label:'點擊縮放',group:'interaction'},
  {id:'long-press',label:'長按回饋',group:'interaction'},
  {id:'drag-snap',label:'拖曳吸附',group:'interaction'},
  {id:'toggle-slide',label:'切換滑塊',group:'interaction'},
  {id:'card-flip',label:'卡片翻面',group:'interaction'},
  {id:'price-pop',label:'價格跳動',group:'market'},
  {id:'change-flash',label:'漲跌色閃現',group:'market'},
  {id:'quote-flip',label:'數字翻牌',group:'market'},
  {id:'pnl-glow',label:'損益呼吸光暈',group:'market'},
  {id:'volume-pulse',label:'成交量脈衝',group:'market'},
  {id:'trend-draw',label:'趨勢線動態繪製',group:'market'},
] as const;

// Legacy editor labels are hash-locked: retain its five-element key type.
export type ItemEffectKind=string; // Frozen legacy editors use an open label dictionary.
export type ItemEffectExtendedKind = typeof ITEM_EFFECT_CATALOG[number]['id'];
export type ItemEffectGroup = typeof ITEM_EFFECT_CATALOG[number]['group'];
export type ItemEffectTrigger=string; // Frozen legacy editors use an open label dictionary.
export type ItemEffectExtendedTrigger='always'|'refresh'|'change'|'gain'|'loss'|'alert'|'mount'|'press'|'longPress';
export type ItemEffectSpeed='slow'|'normal'|'fast';
export type ItemEffectIntensity='soft'|'medium'|'strong';
export type ItemTextAlign='left'|'center'|'right';
export type ItemEffectConfig=Readonly<{
  kind:ItemEffectExtendedKind;
  trigger:ItemEffectExtendedTrigger;
  speed:ItemEffectSpeed;
  intensity:ItemEffectIntensity;
  durationMs?:number;
  strengthPercent?:number;
  loop?:boolean;
}>;

export type ItemVisualOverride=Readonly<{
  fontScale:number;
  textColor:string|null;
  backgroundColor:string|null;
  textAlign:ItemTextAlign|null;
  lineGap:number|null;
  paddingY:number;
  useProfitColor:boolean;
  effect:ItemEffectConfig;
}>;

export const DEFAULT_ITEM_EFFECT:ItemEffectConfig={
  kind:'none',trigger:'change',speed:'normal',intensity:'medium',
};
export const DEFAULT_ITEM_VISUAL:ItemVisualOverride={
  fontScale:1,textColor:null,backgroundColor:null,textAlign:null,
  lineGap:null,paddingY:0,useProfitColor:false,effect:DEFAULT_ITEM_EFFECT,
};
export const ITEM_EFFECT_KINDS:readonly ItemEffectKind[]=['none','fade','pulse','flash-on-change','bounce'];
export const ITEM_ALL_EFFECT_KINDS:readonly ItemEffectExtendedKind[]=ITEM_EFFECT_CATALOG.map(item=>item.id);
export const ITEM_EFFECT_TRIGGERS:readonly ItemEffectTrigger[]=['always','refresh','change','gain','loss','alert'];
export const ITEM_ALL_EFFECT_TRIGGERS:readonly ItemEffectExtendedTrigger[]=[...ITEM_EFFECT_TRIGGERS,'mount','press','longPress'];
export const ITEM_EFFECT_SPEEDS:readonly ItemEffectSpeed[]=['slow','normal','fast'];
export const ITEM_EFFECT_INTENSITIES:readonly ItemEffectIntensity[]=['soft','medium','strong'];
export const ITEM_EFFECT_GROUPS=[
  {id:'basic',label:'基本'}, {id:'entrance',label:'進場'}, {id:'exit',label:'退場'},
  {id:'emphasis',label:'強調'}, {id:'numeric',label:'數值'}, {id:'visual',label:'視覺'},
  {id:'interaction',label:'互動'}, {id:'market',label:'行情'},
] as const;
export const itemEffectLabel=(kind:ItemEffectExtendedKind)=>ITEM_EFFECT_CATALOG.find(item=>item.id===kind)?.label??kind;
export const itemEffectGroup=(kind:ItemEffectExtendedKind)=>ITEM_EFFECT_CATALOG.find(item=>item.id===kind)?.group??'basic';
