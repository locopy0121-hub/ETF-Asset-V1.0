import { cloneElement, type ReactElement } from 'react';
import { View } from 'react-native';

import type { FrameCardProps } from './FrameCard';
import type { MainPageKey } from '../domain/pageRegistry';
import { usePageEditor } from '../editor/pageEditor';

type EditorFrameItem = {
  key: string;
  element: ReactElement<FrameCardProps>;
};

export function PageEditorStack({ pageKey, frames }: { pageKey: MainPageKey; frames: readonly EditorFrameItem[] }) {
  const { config } = usePageEditor(pageKey);

  const ordered = [...frames]
    .filter(item => config[item.key]?.visible !== false)
    .sort((a, b) => (config[a.key]?.order ?? 0) - (config[b.key]?.order ?? 0));

  return <View style={{ gap: 12 }}>
    {ordered.map(item => {
      const frameConfig = config[item.key];
      return cloneElement(item.element, {
        key: item.key,
        layout: frameConfig?.layout ?? 'standard',
        appearance: frameConfig?.appearance ?? 'theme',
        ...(frameConfig?{editorStyle:frameConfig}:{}),
      });
    })}
  </View>;
}
