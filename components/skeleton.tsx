import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

/**
 * A single pulsing placeholder block — the building piece for skeleton
 * loaders. Plain RN `Animated` (no shimmer library), per docs/UX_EXPERIENCE.md's
 * "Shop list skeleton loaders" note: keep the bundle light for the 8 GB dev
 * machine, but a soft opacity pulse (not a static grey box) is what actually
 * reads as "loading" instead of "broken."
 */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, { backgroundColor: surfaceBorder, opacity }, style]} />;
}

/** Shaped like a real shop row (`(customer)/index.tsx`'s `Card`) so the swap-in feels seamless. */
export function ShopCardSkeleton() {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'surfaceBorder');

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      <Skeleton style={styles.avatar} />
      <View style={styles.info}>
        <Skeleton style={styles.titleLine} />
        <Skeleton style={styles.subtitleLine} />
        <Skeleton style={styles.metaLine} />
      </View>
    </View>
  );
}

export function CardSkeleton() {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'surfaceBorder');

  return (
    <View style={[styles.fullCard, { backgroundColor: surface, borderColor: border }]}>
      <Skeleton style={{ height: 20, width: '40%' }} />
      <Skeleton style={{ height: 14, width: '90%' }} />
      <Skeleton style={{ height: 44, width: '100%', borderRadius: Radius.md }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: Radius.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
  avatar: { width: 44, height: 44, borderRadius: Radius.md },
  info: { flex: 1, gap: Spacing.sm },
  titleLine: { height: 16, width: '60%' },
  subtitleLine: { height: 12, width: '85%' },
  metaLine: { height: 12, width: '40%' },
  fullCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
});
