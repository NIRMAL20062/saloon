import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export function StorefrontIllustration({ size = 80 }: { size?: number }) {
  const scale = size / 80;

  return (
    <View style={[styles.container, { transform: [{ scale }] }]}>
      {/* Awning / Roof */}
      <View style={styles.awningContainer}>
        <View style={styles.awningTop}>
          <View style={[styles.stripe, styles.stripeDark]} />
          <View style={[styles.stripe, styles.stripeLight]} />
          <View style={[styles.stripe, styles.stripeDark]} />
          <View style={[styles.stripe, styles.stripeLight]} />
          <View style={[styles.stripe, styles.stripeDark]} />
          <View style={[styles.stripe, styles.stripeLight]} />
        </View>
        <View style={styles.scallopRow}>
          <View style={[styles.scallop, styles.scallopDark]} />
          <View style={[styles.scallop, styles.scallopLight]} />
          <View style={[styles.scallop, styles.scallopDark]} />
          <View style={[styles.scallop, styles.scallopLight]} />
          <View style={[styles.scallop, styles.scallopDark]} />
          <View style={[styles.scallop, styles.scallopLight]} />
        </View>
      </View>

      {/* Building Body */}
      <View style={styles.building}>
        {/* Left window / wall section */}
        <View style={styles.windowSection}>
          <View style={styles.windowFrame}>
            <View style={styles.windowGlass}>
              <View style={styles.windowReflection} />
            </View>
          </View>
        </View>

        {/* Door with OPEN sign */}
        <View style={styles.door}>
          <View style={styles.doorWindow}>
            <View style={styles.doorGlassReflection} />
          </View>

          {/* Hanging OPEN sign */}
          <View style={styles.hangingSignWrapper}>
            <View style={styles.chainsRow}>
              <View style={styles.chain} />
              <View style={styles.chain} />
            </View>
            <View style={styles.openBadge}>
              <ThemedText style={styles.openText}>OPEN</ThemedText>
            </View>
          </View>

          {/* Door Handle */}
          <View style={styles.doorHandle} />
        </View>
      </View>

      {/* Ground line */}
      <View style={styles.ground} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 84,
    height: 76,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  awningContainer: {
    width: 82,
    zIndex: 2,
  },
  awningTop: {
    flexDirection: 'row',
    height: 18,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    overflow: 'hidden',
  },
  stripe: {
    flex: 1,
    height: '100%',
  },
  stripeDark: {
    backgroundColor: '#0D7A53',
  },
  stripeLight: {
    backgroundColor: '#74C69D',
  },
  scallopRow: {
    flexDirection: 'row',
    height: 6,
  },
  scallop: {
    flex: 1,
    height: 6,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  scallopDark: {
    backgroundColor: '#0D7A53',
  },
  scallopLight: {
    backgroundColor: '#74C69D',
  },
  building: {
    width: 74,
    height: 48,
    backgroundColor: '#E2E8F0',
    flexDirection: 'row',
    paddingHorizontal: 5,
    paddingTop: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  windowSection: {
    width: 32,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  windowFrame: {
    width: 30,
    height: 30,
    backgroundColor: '#CBD5E1',
    borderRadius: 4,
    padding: 2,
  },
  windowGlass: {
    flex: 1,
    backgroundColor: '#A7F3D0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  windowReflection: {
    width: 6,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ rotate: '25deg' }, { translateX: 6 }, { translateY: -6 }],
  },
  door: {
    width: 28,
    height: 42,
    backgroundColor: '#064E3B',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: 'center',
    paddingTop: 4,
    position: 'relative',
  },
  doorWindow: {
    width: 20,
    height: 18,
    backgroundColor: '#6EE7B7',
    borderRadius: 2,
    overflow: 'hidden',
  },
  doorGlassReflection: {
    width: 4,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    transform: [{ rotate: '25deg' }, { translateX: 5 }, { translateY: -4 }],
  },
  hangingSignWrapper: {
    position: 'absolute',
    top: 14,
    alignItems: 'center',
  },
  chainsRow: {
    flexDirection: 'row',
    width: 20,
    justifyContent: 'space-between',
    paddingHorizontal: 3,
  },
  chain: {
    width: 1,
    height: 3,
    backgroundColor: '#1E293B',
  },
  openBadge: {
    backgroundColor: '#0D7A53',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#A7F3D0',
  },
  openText: {
    color: '#FFFFFF',
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  doorHandle: {
    position: 'absolute',
    right: 3,
    top: 26,
    width: 2,
    height: 5,
    backgroundColor: '#FCD34D',
    borderRadius: 1,
  },
  ground: {
    width: 86,
    height: 3,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
  },
});
