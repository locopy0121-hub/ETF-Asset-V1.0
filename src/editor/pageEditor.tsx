import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

import { PAGE_FRAMES } from '../domain/frameRegistry';
import type { MainPageKey } from '../domain/pageRegistry';

export type FrameLayout = 'standard' | 'compact' | 'dense';
export type FrameAppearance = 'theme' | 'soft' | 'outline';
export type FrameBehavior = 'manual' | 'auto' | 'locked';

export type FrameEditorConfig = Readonly<{
  visible: boolean;
  order: number;
  layout: FrameLayout;
  appearance: FrameAppearance;
  behavior: FrameBehavior;
}>;

export type PageEditorState = Readonly<Record<MainPageKey, Readonly<Record<string, FrameEditorConfig>>>>;

type EditorContextValue = {
  state: PageEditorState;
  getPageConfig: (page: MainPageKey) => Readonly<Record<string, FrameEditorConfig>>;
  replacePageConfig: (page: MainPageKey, config: Record<string, FrameEditorConfig>) => void;
  resetPage: (page: MainPageKey) => void;
};

const makePageConfig = (page: MainPageKey): Record<string, FrameEditorConfig> =>
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

const EditorContext = createContext<EditorContextValue | null>(null);

export function PageEditorProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<PageEditorState>(() => createInitialEditorState());

  const value = useMemo<EditorContextValue>(() => ({
    state,
    getPageConfig: page => state[page],
    replacePageConfig: (page, config) => setState(current => ({ ...current, [page]: config })),
    resetPage: page => setState(current => ({ ...current, [page]: makePageConfig(page) })),
  }), [state]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function usePageEditor(page: MainPageKey) {
  const context = useContext(EditorContext);
  if (!context) throw new Error('usePageEditor must be used inside PageEditorProvider');

  return {
    config: context.getPageConfig(page),
    replacePageConfig: (config: Record<string, FrameEditorConfig>) => context.replacePageConfig(page, config),
    resetPage: () => context.resetPage(page),
  };
}

export function normalizeEditorConfig(
  page: MainPageKey,
  draft: Record<string, FrameEditorConfig>,
): Record<string, FrameEditorConfig> {
  const defaults = makePageConfig(page);
  const normalized: Record<string, FrameEditorConfig> = {};
  PAGE_FRAMES[page].forEach((frame, index) => {
    const candidate = draft[frame.key] ?? defaults[frame.key];
    if (!candidate) return;
    normalized[frame.key] = {
      ...candidate,
      order: candidate.behavior === 'auto' ? index : candidate.order,
    };
  });

  const ordered = Object.entries(normalized).sort((a, b) => a[1].order - b[1].order);
  ordered.forEach(([key, value], index) => {
    normalized[key] = { ...value, order: index };
  });
  return normalized;
}
