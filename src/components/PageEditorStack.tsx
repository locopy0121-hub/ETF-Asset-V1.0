import { cloneElement, type ReactElement } from 'react';
import { View } from 'react-native';

import type { FrameCardProps } from './FrameCard';
import type { MainPageKey } from '../domain/pageRegistry';
import { usePageEditor } from '../editor/pageEditor';
import { ItemMotionView } from './ItemMotion';

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
      const child=cloneElement(item.element, {
        key: item.key,
        layout: frameConfig?.layout ?? 'standard',
        appearance: frameConfig?.appearance ?? 'theme',
        ...(frameConfig?{editorStyle:frameConfig}:{}),
      });
      // No wrapper for unchanged frames: protect existing geometry and touch behavior.
      return pageKey!=='settings'&&frameConfig?.motion&&frameConfig.motion.kind!=='none'
        ? <ItemMotionView key={item.key} effect={frameConfig.motion} value={item.key} numeric={null}>{child}</ItemMotionView>
        : child;
    })}
  </View>;
}
