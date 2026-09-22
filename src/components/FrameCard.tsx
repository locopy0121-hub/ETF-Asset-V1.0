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
  editorStyle?:Partial<Pick<FrameEditorConfig,'titleFontSize'|'titleColor'|'titleAlign'|'backgroundColor'|'backgroundOpacity'|'backgroundBlend'|'borderColor'|'borderWidth'|'borderRadius'|'shadowEnabled'|'shadowOpacity'>>;
}>;

const backgroundLayerColor=(hex:string,opacity:number):string=>{
  const match=/^#([0-9a-f]{6})$/i.exec(hex);
  if(!match)return hex;
  const n=match[1]!;
  const alpha=Math.max(0,Math.min(1,opacity));
  return `rgba(${parseInt(n.slice(0,2),16)},${parseInt(n.slice(2,4),16)},${parseInt(n.slice(4,6),16)},${alpha})`;
};

export function FrameCard({ title, action, children, layout = 'standard', appearance = 'theme', editorStyle }: FrameCardProps) {
  const theme=useThemeRuntime();
  const blend=editorStyle?.backgroundBlend??true;
  const configured=editorStyle?.backgroundColor;
  const baseColor=blend&&(!configured||configured.toUpperCase()==='#FFFFFF')
    ?(appearance==='soft'?theme.palette.surfaceMuted:theme.palette.surface)
    :(configured??(appearance==='soft'?theme.palette.surfaceMuted:theme.palette.surface));
  // Only the paint is translucent: opacity on the root would fade all user-configured children.
  const backgroundColor=backgroundLayerColor(baseColor,blend?Math.min(editorStyle?.backgroundOpacity??1,.86):(editorStyle?.backgroundOpacity??1));
  return (
    <View style={[
      styles.card,
      {backgroundColor,borderColor:theme.palette.border},
      layout === 'compact' && styles.cardCompact,
      layout === 'dense' && styles.cardDense,
      
      appearance === 'outline' && {borderWidth:2,borderColor:theme.palette.primary},
      editorStyle&&{
        borderColor:editorStyle.borderColor,
        borderWidth:editorStyle.borderWidth,
        borderRadius:editorStyle.borderRadius,
        ...(editorStyle.shadowEnabled?{elevation:4,shadowOpacity:editorStyle.shadowOpacity,shadowRadius:8,shadowOffset:{width:0,height:2}}:{}),
      },
    ]}>
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
