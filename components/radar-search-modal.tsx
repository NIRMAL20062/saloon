import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { successFeedback, tapFeedback } from '@/lib/haptics';

export interface RadarSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onShopMatched?: (shopName: string) => void;
}

export function RadarSearchModal({ visible, onClose, onShopMatched }: RadarSearchModalProps) {
  const [matchCount, setMatchCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [matchedShop, setMatchedShop] = useState<string | null>(null);

  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const cyan = '#06B6D4';
  const success = useThemeColor({}, 'success');
  const textMuted = useThemeColor({}, 'textMuted');

  useEffect(() => {
    if (!visible) {
      setMatchCount(0);
      setSecondsLeft(90);
      setMatchedShop(null);
      return;
    }

    // Simulate shop matching over time
    const countTimer = setTimeout(() => setMatchCount(3), 1200);
    const countTimer2 = setTimeout(() => setMatchCount(7), 2500);

    const matchTimer = setTimeout(() => {
      const shop = 'The Grooming Station (1.2 km)';
      setMatchedShop(shop);
      successFeedback();
      if (onShopMatched) onShopMatched(shop);
    }, 4500);

    const countdownInterval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearTimeout(countTimer);
      clearTimeout(countTimer2);
      clearTimeout(matchTimer);
      clearInterval(countdownInterval);
    };
  }, [visible, onShopMatched]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={[styles.pulseDot, { backgroundColor: cyan }]} />
              <ThemedText style={[styles.badgeText, { color: cyan }]}>INSTANT RADAR BROADCAST</ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={20} color={textMuted} />
            </Pressable>
          </View>

          {matchedShop ? (
            <View style={styles.matchedBlock}>
              <View style={[styles.successIcon, { backgroundColor: success + '20' }]}>
                <Ionicons name="checkmark-circle" size={56} color={success} />
              </View>
              <ThemedText style={[styles.matchedTitle, { color: success }]}>
                SHOP ACCEPTED YOUR REQUEST!
              </ThemedText>
              <ThemedText style={styles.matchedShopName}>{matchedShop}</ThemedText>
              <ThemedText style={[styles.matchedSub, { color: textMuted }]}>
                Price locked: ₹250 • Pay now to secure your chair
              </ThemedText>
              <Button title="Proceed to Checkout →" onPress={() => { tapFeedback(); onClose(); }} style={styles.checkoutBtn} />
            </View>
          ) : (
            <View style={styles.radarContainer}>
              {/* Radar Rings Animation Simulation */}
              <View style={styles.radarCircle3}>
                <View style={styles.radarCircle2}>
                  <View style={styles.radarCircle1}>
                    <Ionicons name="flash" size={32} color={cyan} />
                  </View>
                </View>
              </View>

              <View style={styles.statusBlock}>
                <ThemedText style={styles.statusTitle}>
                  Broadcasting Request to Nearby Salons...
                </ThemedText>
                <ThemedText style={[styles.statusSub, { color: textMuted }]}>
                  {matchCount > 0
                    ? `📡 Reached ${matchCount} active salons near you`
                    : 'Scanning 2km broadcast radius...'}
                </ThemedText>
                <ThemedText style={[styles.timerText, { color: cyan }]}>
                  Timeout in 0:{secondsLeft.toString().padStart(2, '0')}
                </ThemedText>
              </View>

              <Button title="Cancel Broadcast" variant="secondary" onPress={onClose} style={styles.cancelBtn} />
            </View>
          )}
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    padding: Spacing.xl,
    gap: Spacing.lg,
    borderRadius: Radius.xl,
    borderColor: '#6366F1',
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  radarContainer: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  radarCircle3: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  radarCircle2: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
  },
  radarCircle1: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#06B6D4',
    ...Shadow.glowCyan,
  },
  statusBlock: {
    alignItems: 'center',
    gap: 4,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  cancelBtn: {
    width: '100%',
  },
  matchedBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchedTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  matchedShopName: {
    fontSize: 20,
    fontWeight: '800',
  },
  matchedSub: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkoutBtn: {
    width: '100%',
    marginTop: Spacing.sm,
  },
});
