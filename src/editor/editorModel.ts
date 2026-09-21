import { PAGE_FRAMES } from '../domain/frameRegistry';
import type { MainPageKey } from '../domain/pageRegistry';
import { DEFAULT_HOLDING_WALL_CONFIG, type HoldingSortKey, type HoldingWallConfig, type HoldingWallFieldConfig, type HoldingWallFieldKey, type QuoteModuleStyle } from '../domain/uiModels';

export type FrameLayout = 'standard' | 'compact' | 'dense';
export type FrameAppearance = 'theme' | 'soft' | 'outline';
export type FrameBehavior = 'manual' | 'auto' | 'locked';
export type PortfolioViewMode = 'list' | 'wall';
export type HoldingLayoutMode = 'list' | 'grid2' | 'grid3' | 'horizontal' | 'paged2';

export type FrameEditorConfig = Readonly<{
  visible: boolean;
  order: number;
  layout: FrameLayout;
  appearance: FrameAppearance;
  behavior: FrameBehavior;
}>;

export type PageEditorState = Readonly<Record<MainPageKey, Readonly<Record<string, FrameEditorConfig>>>>;

export type PageDisplayConfig = Readonly<{
  quoteStyle?: QuoteModuleStyle;
  sortKey?: HoldingSortKey;
  portfolioViewMode?: PortfolioViewMode;
  holdingLayoutMode?: HoldingLayoutMode;
  holdingWall?: HoldingWallConfig;
}>;

export type PageDisplayState = Readonly<Record<MainPageKey, PageDisplayConfig>>;

export const makePageConfig = (page: MainPageKey): Record<string, FrameEditorConfig> =>
  Object.fromEntries(PAGE_FRAMES[page].map((frame, index) => [
    frame.key,
    { visible: true, order: index, layout: 'standard', appearance: 'theme', behavior: 'manual' } satisfies FrameEditorConfig,
  ]));

export function createInitialEditorState(): PageEditorState {
  return {
    home: makePageConfig('home'),
    ledger: makePageConfig('ledger'),
    portfolio: makePageConfig('portfolio'),
    dividend: makePageConfig('dividend'),
    settings: makePageConfig('settings'),
  };
}

export function createInitialDisplayState(): PageDisplayState {
  return {
    home: { quoteStyle:'quote', sortKey:'pnl', holdingLayoutMode:'list', holdingWall:DEFAULT_HOLDING_WALL_CONFIG },
    ledger: {},
    portfolio: { quoteStyle:'chart', sortKey:'manual', portfolioViewMode:'list', holdingLayoutMode:'list' },
    dividend: {},
    settings: {},
  };
}

const isFrameLayout=(v:unknown):v is FrameLayout=>v==='standard'||v==='compact'||v==='dense';
const isFrameAppearance=(v:unknown):v is FrameAppearance=>v==='theme'||v==='soft'||v==='outline';
const isFrameBehavior=(v:unknown):v is FrameBehavior=>v==='manual'||v==='auto'||v==='locked';

const HOLDING_WALL_FIELDS:readonly HoldingWallFieldKey[]=['name','symbol','price','change','changePercent','pnl','roi','marketValue'];
const clamp=(value:unknown,min:number,max:number,fallback:number)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
const wallColor=(value:unknown,fallback:string)=>typeof value==='string'&&/^#[0-9A-Fa-f]{6}$/.test(value)?value:fallback;
const normalizeHoldingWall=(raw:unknown):HoldingWallConfig=>{
  const source=(raw&&typeof raw==='object'?raw:{}) as Partial<HoldingWallConfig>;
  const header=(source.header??{}) as Partial<HoldingWallConfig['header']>;
  const style=(source.style??{}) as Partial<HoldingWallConfig['style']>;
  const rawFields=Array.isArray(source.fields)?source.fields:[];
  const fieldMap=new Map(rawFields.map(field=>[(field as Partial<HoldingWallFieldConfig>).field,field as Partial<HoldingWallFieldConfig>]));
  const fields=DEFAULT_HOLDING_WALL_CONFIG.fields.map(fallback=>{
    const candidate=fieldMap.get(fallback.field);
    return {
      field:fallback.field,
      enabled:candidate?.enabled??fallback.enabled,
      label:typeof candidate?.label==='string'&&candidate.label.trim()?candidate.label.trim().slice(0,12):fallback.label,
      fontScale:clamp(candidate?.fontScale,.7,1.8,fallback.fontScale),
      align:candidate?.align==='center'||candidate?.align==='right'?candidate.align:'left',
      useProfitColor:candidate?.useProfitColor??fallback.useProfitColor,
    };
  }).filter(field=>HOLDING_WALL_FIELDS.includes(field.field));
  return {
    header:{
      visible:header.visible??DEFAULT_HOLDING_WALL_CONFIG.header.visible,
      fontScale:clamp(header.fontScale,.7,1.8,DEFAULT_HOLDING_WALL_CONFIG.header.fontScale),
      backgroundColor:wallColor(header.backgroundColor,DEFAULT_HOLDING_WALL_CONFIG.header.backgroundColor),
      textColor:wallColor(header.textColor,DEFAULT_HOLDING_WALL_CONFIG.header.textColor),
      borderColor:wallColor(header.borderColor,DEFAULT_HOLDING_WALL_CONFIG.header.borderColor),
      borderWidth:clamp(header.borderWidth,0,4,DEFAULT_HOLDING_WALL_CONFIG.header.borderWidth),
    },
    fields,
    style:{
      backgroundColor:wallColor(style.backgroundColor,DEFAULT_HOLDING_WALL_CONFIG.style.backgroundColor),
      textColor:wallColor(style.textColor,DEFAULT_HOLDING_WALL_CONFIG.style.textColor),
      secondaryTextColor:wallColor(style.secondaryTextColor,DEFAULT_HOLDING_WALL_CONFIG.style.secondaryTextColor),
      gainColor:wallColor(style.gainColor,DEFAULT_HOLDING_WALL_CONFIG.style.gainColor),
      lossColor:wallColor(style.lossColor,DEFAULT_HOLDING_WALL_CONFIG.style.lossColor),
      borderColor:wallColor(style.borderColor,DEFAULT_HOLDING_WALL_CONFIG.style.borderColor),
      borderWidth:clamp(style.borderWidth,0,6,DEFAULT_HOLDING_WALL_CONFIG.style.borderWidth),
      cornerRadius:clamp(style.cornerRadius,0,40,DEFAULT_HOLDING_WALL_CONFIG.style.cornerRadius),
      padding:clamp(style.padding,0,32,DEFAULT_HOLDING_WALL_CONFIG.style.padding),
      rowGap:clamp(style.rowGap,0,24,DEFAULT_HOLDING_WALL_CONFIG.style.rowGap),
    },
  };
};


export function normalizeEditorConfig(
  page: MainPageKey,
  draft: Record<string, FrameEditorConfig>,
): Record<string, FrameEditorConfig> {
  const defaults = makePageConfig(page);
  const normalized: Record<string, FrameEditorConfig> = {};
  PAGE_FRAMES[page].forEach((frame, index) => {
    const fallback=defaults[frame.key]!;
    const candidate = draft[frame.key] ?? fallback;
    normalized[frame.key] = {
      visible: typeof candidate.visible==='boolean'?candidate.visible:fallback.visible,
      order: candidate.behavior === 'auto' ? index : (Number.isFinite(candidate.order)?candidate.order:fallback.order),
      layout: isFrameLayout(candidate.layout)?candidate.layout:fallback.layout,
      appearance: isFrameAppearance(candidate.appearance)?candidate.appearance:fallback.appearance,
      behavior: isFrameBehavior(candidate.behavior)?candidate.behavior:fallback.behavior,
    };
  });

  const ordered = Object.entries(normalized).sort((a, b) => a[1].order - b[1].order);
  ordered.forEach(([key, value], index) => {
    normalized[key] = { ...value, order: index };
  });
  return normalized;
}

export function mergeEditorState(raw:unknown):PageEditorState{
  const source=(raw&&typeof raw==='object'?raw:{}) as Partial<Record<MainPageKey,Record<string,FrameEditorConfig>>>;
  return {
    home:normalizeEditorConfig('home',source.home??{}),
    ledger:normalizeEditorConfig('ledger',source.ledger??{}),
    portfolio:normalizeEditorConfig('portfolio',source.portfolio??{}),
    dividend:normalizeEditorConfig('dividend',source.dividend??{}),
    settings:normalizeEditorConfig('settings',source.settings??{}),
  };
}

export function mergeDisplayState(raw:unknown):PageDisplayState{
  const defaults=createInitialDisplayState();
  const source=(raw&&typeof raw==='object'?raw:{}) as Partial<Record<MainPageKey,PageDisplayConfig>>;
  const merge=(page:MainPageKey):PageDisplayConfig=>({...defaults[page],...(source[page]??{})});
  const home={...merge('home'),holdingWall:normalizeHoldingWall(source.home?.holdingWall)};
  return {home,ledger:merge('ledger'),portfolio:merge('portfolio'),dividend:merge('dividend'),settings:merge('settings')};
}
