export type ItemEffectKind='none'|'fade'|'pulse'|'flash-on-change'|'bounce';
export type ItemEffectTrigger='always'|'refresh'|'change'|'gain'|'loss'|'alert';
export type ItemEffectSpeed='slow'|'normal'|'fast';
export type ItemEffectIntensity='soft'|'medium'|'strong';
export type ItemTextAlign='left'|'center'|'right';

export type ItemEffectConfig=Readonly<{
  kind:ItemEffectKind;
  trigger:ItemEffectTrigger;
  speed:ItemEffectSpeed;
  intensity:ItemEffectIntensity;
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
  kind:'none',
  trigger:'change',
  speed:'normal',
  intensity:'medium',
};

export const DEFAULT_ITEM_VISUAL:ItemVisualOverride={
  fontScale:1,
  textColor:null,
  backgroundColor:null,
  textAlign:null,
  lineGap:null,
  paddingY:0,
  useProfitColor:false,
  effect:DEFAULT_ITEM_EFFECT,
};

export const ITEM_EFFECT_KINDS:readonly ItemEffectKind[]=['none','fade','pulse','flash-on-change','bounce'];
export const ITEM_EFFECT_TRIGGERS:readonly ItemEffectTrigger[]=['always','refresh','change','gain','loss','alert'];
export const ITEM_EFFECT_SPEEDS:readonly ItemEffectSpeed[]=['slow','normal','fast'];
export const ITEM_EFFECT_INTENSITIES:readonly ItemEffectIntensity[]=['soft','medium','strong'];
