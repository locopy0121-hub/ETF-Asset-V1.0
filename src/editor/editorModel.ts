import { PAGE_FRAMES } from '../domain/frameRegistry';
import type { MainPageKey } from '../domain/pageRegistry';
import type { HoldingSortKey, QuoteModuleStyle } from '../domain/uiModels';

export type FrameLayout = 'standard' | 'compact' | 'dense';
export type FrameAppearance = 'theme' | 'soft' | 'outline';
export type FrameBehavior = 'manual' | 'auto' | 'locked';
export type PortfolioViewMode = 'list' | 'wall';

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
    home: { quoteStyle:'quote', sortKey:'pnl' },
    ledger: {},
    portfolio: { quoteStyle:'chart', sortKey:'manual', portfolioViewMode:'list' },
    dividend: {},
    settings: {},
  };
}

const isFrameLayout=(v:unknown):v is FrameLayout=>v==='standard'||v==='compact'||v==='dense';
const isFrameAppearance=(v:unknown):v is FrameAppearance=>v==='theme'||v==='soft'||v==='outline';
const isFrameBehavior=(v:unknown):v is FrameBehavior=>v==='manual'||v==='auto'||v==='locked';

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
  return {home:merge('home'),ledger:merge('ledger'),portfolio:merge('portfolio'),dividend:merge('dividend'),settings:merge('settings')};
}
