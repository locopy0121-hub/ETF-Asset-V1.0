import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FrameAppearance, FrameEditorConfig, FrameLayout } from '../editor/pageEditor';
import { radius, spacing } from '../theme/tokens';
import { useThemeRuntime } from '../theme/ThemeRuntime';

export type FrameCardProps = PropsWithChildren<{
  title: string;
  action?: ReactNode;
  layout?: FrameLayout;
  appearance?: FrameAppearance;
  editorStyle?:Partial<Pick<FrameEditorConfig,'titleFontSize'|'titleColor'|'titleAlign'|'backgroundColor'|'backgroundOpacity'|'borderColor'|'borderWidth'|'borderRadius'|'shadowEnabled'|'shadowOpacity'>>;
}>;

export function FrameCard({ title, action, children, layout = 'standard', appearance = 'theme', editorStyle }: FrameCardProps) {
  const theme=useThemeRuntime().state.palette;
  return (
    <View style={[
      styles.card,
      {backgroundColor:theme.surface,borderColor:theme.border},
      layout === 'compact' && styles.cardCompact,
      layout === 'dense' && styles.cardDense,
      appearance === 'soft' && {backgroundColor:theme.surfaceMuted},
      appearance === 'outline' && {borderWidth:2,borderColor:theme.primary},
      editorStyle&&{
        backgroundColor:editorStyle.backgroundColor,
        opacity:editorStyle.backgroundOpacity,
        borderColor:editorStyle.borderColor,
        borderWidth:editorStyle.borderWidth,
        borderRadius:editorStyle.borderRadius,
        ...(editorStyle.shadowEnabled?{elevation:4,shadowOpacity:editorStyle.shadowOpacity,shadowRadius:8,shadowOffset:{width:0,height:2}}:{}),
      },
    ]}>
      <View style={styles.header}>
        <Text style={[styles.title,{color:theme.text}, layout === 'dense' && styles.titleDense,editorStyle&&{fontSize:editorStyle.titleFontSize,color:editorStyle.titleColor,textAlign:editorStyle.titleAlign,flex:1}]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardCompact: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  cardDense: {
    padding: 10,
    gap: 6,
    borderRadius: radius.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '800' },
  titleDense: { fontSize: 15 },
});
