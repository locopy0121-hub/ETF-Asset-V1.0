import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FrameAppearance, FrameLayout } from '../editor/pageEditor';
import { colors, radius, spacing } from '../theme/tokens';

export type FrameCardProps = PropsWithChildren<{
  title: string;
  action?: ReactNode;
  layout?: FrameLayout;
  appearance?: FrameAppearance;
}>;

export function FrameCard({ title, action, children, layout = 'standard', appearance = 'theme' }: FrameCardProps) {
  return (
    <View style={[
      styles.card,
      layout === 'compact' && styles.cardCompact,
      layout === 'dense' && styles.cardDense,
      appearance === 'soft' && styles.cardSoft,
      appearance === 'outline' && styles.cardOutline,
    ]}>
      <View style={styles.header}>
        <Text style={[styles.title, layout === 'dense' && styles.titleDense]}>{title}</Text>
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
