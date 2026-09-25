import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FrameAppearance, FrameEditorConfig, FrameLayout } from '../editor/pageEditor';
import { colors, radius, spacing } from '../theme/tokens';
import { useThemeRuntime } from '../theme/ThemeRuntime';

export type FrameCardProps = PropsWithChildren<{
  title: string;
  action?: ReactNode;
  layout?: FrameLayout;
  appearance?: FrameAppearance;
  editorStyle?:Partial<Pick<FrameEditorConfig,'titleFontSize'|'titleColor'|'titleAlign'|'backgroundColor'|'backgroundOpacity'|'borderColor'|'borderWidth'|'borderRadius'|'shadowEnabled'|'shadowOpacity'|'padding'|'minHeight'>>;
  workActive?:boolean;
  workHidden?:boolean;
}>;

export function FrameCard({ title, action, children, layout = 'standard', appearance = 'theme', editorStyle,workActive=false,workHidden=false }: FrameCardProps) {
  const theme=useThemeRuntime();
  return (
    <View style={[
      styles.card,
      {backgroundColor:theme.palette.surface,borderColor:theme.palette.border},
      layout === 'compact' && styles.cardCompact,
      layout === 'dense' && styles.cardDense,
      appearance === 'soft' && {backgroundColor:theme.palette.surfaceMuted},
      appearance === 'outline' && {borderWidth:2,borderColor:theme.palette.primary},
      editorStyle&&{
        backgroundColor:editorStyle.backgroundColor,
        opacity:editorStyle.backgroundOpacity,
        borderColor:editorStyle.borderColor,
        borderWidth:editorStyle.borderWidth,
        borderRadius:editorStyle.borderRadius,
        ...(editorStyle.padding!==undefined?{padding:editorStyle.padding}:{}),
        ...(editorStyle.minHeight!==undefined?{minHeight:editorStyle.minHeight}:{}),
        ...(editorStyle.shadowEnabled?{elevation:4,shadowOpacity:editorStyle.shadowOpacity,shadowRadius:8,shadowOffset:{width:0,height:2}}:{}),
      },
      workHidden&&{opacity:.5},
    ]}>
      {workActive?<View pointerEvents="none" style={[StyleSheet.absoluteFill,{
        borderStyle:'dashed',borderWidth:2,borderColor:theme.palette.primary,
        borderRadius:editorStyle?.borderRadius??radius.lg,
      }]}/>:null}
      <View style={styles.header}>
        <Text style={[styles.title,{color:theme.palette.text}, layout === 'dense' && styles.titleDense,editorStyle&&{fontSize:editorStyle.titleFontSize,color:editorStyle.titleColor,textAlign:editorStyle.titleAlign,flex:1}]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
  cardSoft: {
    backgroundColor: colors.surfaceMuted,
  },
  cardOutline: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  titleDense: { fontSize: 15 },
});
