import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { successFeedback, tapFeedback } from '@/lib/haptics';

export interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccessVerification?: (codeOrPin: string) => void;
}

export function QrScannerModal({ visible, onClose, onSuccessVerification }: QrScannerModalProps) {
  const [pinCode, setPinCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'pin'>('camera');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const success = useThemeColor({}, 'success');
  const textMuted = useThemeColor({}, 'textMuted');

  const handleVerifyPin = () => {
    tapFeedback();
    if (pinCode.length < 6) return;
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setVerifiedSuccess(true);
      successFeedback();
      if (onSuccessVerification) onSuccessVerification(pinCode);
      setTimeout(() => {
        setVerifiedSuccess(false);
        setPinCode('');
        onClose();
      }, 1500);
    }, 800);
  };

  const handleSimulateQrScan = () => {
    tapFeedback();
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setVerifiedSuccess(true);
      successFeedback();
      if (onSuccessVerification) onSuccessVerification('QR-SCAN-8942');
      setTimeout(() => {
        setVerifiedSuccess(false);
        onClose();
      }, 1500);
    }, 800);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.modalCard}>
          {/* Header Bar */}
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Customer Arrival Verification
            </ThemedText>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={20} color={textMuted} />
            </Pressable>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => {
                tapFeedback();
                setActiveTab('camera');
              }}
              style={[
                styles.tabBtn,
                activeTab === 'camera' && { backgroundColor: tint, borderColor: tint },
              ]}>
              <Ionicons
                name="qr-code-outline"
                size={16}
                color={activeTab === 'camera' ? onTint : textMuted}
              />
              <ThemedText style={[styles.tabText, activeTab === 'camera' && { color: onTint }]}>
                Scan QR Code
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => {
                tapFeedback();
                setActiveTab('pin');
              }}
              style={[
                styles.tabBtn,
                activeTab === 'pin' && { backgroundColor: tint, borderColor: tint },
              ]}>
              <Ionicons
                name="keypad-outline"
                size={16}
                color={activeTab === 'pin' ? onTint : textMuted}
              />
              <ThemedText style={[styles.tabText, activeTab === 'pin' && { color: onTint }]}>
                6-Digit PIN
              </ThemedText>
            </Pressable>
          </View>

          {verifiedSuccess ? (
            <View style={styles.successBlock}>
              <View style={[styles.successIcon, { backgroundColor: success + '20' }]}>
                <Ionicons name="checkmark-circle-sharp" size={48} color={success} />
              </View>
              <ThemedText style={[styles.successTitle, { color: success }]}>
                VERIFIED ON ARRIVAL ✓
              </ThemedText>
              <ThemedText style={[styles.successSub, { color: textMuted }]}>
                &quot;Start Service&quot; Unlocked • Payment Allocated
              </ThemedText>
            </View>
          ) : activeTab === 'camera' ? (
            <View style={styles.cameraContainer}>
              {/* Simulated Camera Viewfinder */}
              <View style={styles.viewfinder}>
                <View style={styles.targetFrame}>
                  <View style={[styles.corner, styles.topLeft, { borderColor: tint }]} />
                  <View style={[styles.corner, styles.topRight, { borderColor: tint }]} />
                  <View style={[styles.corner, styles.bottomLeft, { borderColor: tint }]} />
                  <View style={[styles.corner, styles.bottomRight, { borderColor: tint }]} />
                  <Ionicons name="scan-outline" size={64} color={tint} />
                </View>
              </View>
              <ThemedText style={[styles.guideText, { color: textMuted }]}>
                Point camera at customer&apos;s GLIDE QR code
              </ThemedText>
              <Button
                title={verifying ? 'Verifying...' : 'Simulate QR Scan 📷'}
                onPress={handleSimulateQrScan}
                loading={verifying}
                style={styles.scanSimBtn}
              />
            </View>
          ) : (
            <View style={styles.pinContainer}>
              <ThemedText style={styles.pinLabel}>Enter Customer 6-Digit PIN</ThemedText>
              <ThemedTextInput
                value={pinCode}
                onChangeText={(text) => setPinCode(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="849210"
                style={styles.pinInput}
              />
              <Button
                title="Verify PIN Code"
                onPress={handleVerifyPin}
                loading={verifying}
                disabled={pinCode.length < 6}
                style={styles.verifyBtn}
              />
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
    backgroundColor: 'rgba(11, 15, 25, 0.75)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    padding: Spacing.xl,
    gap: Spacing.lg,
    borderRadius: Radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cameraContainer: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  viewfinder: {
    width: 200,
    height: 200,
    borderRadius: Radius.lg,
    backgroundColor: '#0B0F19',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  targetFrame: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  guideText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scanSimBtn: {
    width: '100%',
    marginTop: Spacing.xs,
  },
  pinContainer: {
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pinLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  pinInput: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
  },
  verifyBtn: {
    marginTop: Spacing.xs,
  },
  successBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  successSub: {
    fontSize: 12,
    fontWeight: '600',
  },
});
