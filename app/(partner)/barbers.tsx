import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CardSkeleton } from '@/components/skeleton';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { Radius, Spacing, withAlpha } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import {
  createBarber,
  fetchOwnBarbers,
  fetchOwnShop,
  setBarberActive,
  updateBarber,
  type OwnBarber,
} from '@/features/shops/partner-api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { successFeedback, tapFeedback } from '@/lib/haptics';

export default function PartnerBarbersScreen() {
  const { profile } = useAuth();

  const [shopId, setShopId] = useState<string | null>(null);
  const [barbers, setBarbers] = useState<OwnBarber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const danger = useThemeColor({}, 'danger');
  const icon = useThemeColor({}, 'icon');
  const tint = useThemeColor({}, 'tint');
  const tintSurface = useThemeColor({}, 'tintSurface');
  const textMuted = useThemeColor({}, 'textMuted');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const success = useThemeColor({}, 'success');

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const shop = await fetchOwnShop(profile.id);
      setShopId(shop?.id ?? null);
      if (shop) setBarbers(await fetchOwnBarbers(shop.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load barbers.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(barber: OwnBarber) {
    tapFeedback();
    setEditingId(barber.id);
    setName(barber.name);
  }

  function cancelEdit() {
    tapFeedback();
    setEditingId(null);
    setName('');
  }

  async function handleSubmit() {
    if (!shopId || !name.trim()) return;
    tapFeedback();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateBarber(editingId, name);
      } else {
        await createBarber(shopId, name);
      }
      cancelEdit();
      setBarbers(await fetchOwnBarbers(shopId));
      successFeedback();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save barber.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(barber: OwnBarber, value: boolean) {
    successFeedback();
    setTogglingId(barber.id);
    setBarbers((prev) => prev.map((b) => (b.id === barber.id ? { ...b, is_active: value } : b)));
    try {
      await setBarberActive(barber.id, value);
    } catch (e) {
      setBarbers((prev) => prev.map((b) => (b.id === barber.id ? { ...b, is_active: !value } : b)));
      setError(e instanceof Error ? e.message : 'Could not update barber status.');
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) {
    return (
      <Screen style={{ padding: Spacing.lg }}>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </Screen>
    );
  }

  if (!shopId) {
    return (
      <Screen style={styles.center}>
        <ThemedText style={{ color: textMuted }}>
          Create your shop first, then come back to manage your barbers.
        </ThemedText>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Top Header Navigation */}
        <View style={styles.topHeader}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={20} color={icon} />
          </Pressable>
          <ThemedText type="title" style={styles.screenTitle}>
            Manage Barbers
          </ThemedText>
        </View>

        {error ? <ThemedText style={[styles.errorBanner, { color: danger }]}>{error}</ThemedText> : null}

        {/* Add / Edit Form Card */}
        <Card style={styles.formCard}>
          <ThemedText type="subtitle" style={styles.formTitle}>
            {editingId ? 'Edit Barber' : 'Add New Barber'}
          </ThemedText>
          <ThemedTextInput
            placeholder="Barber name (e.g. Rahul Sharma)"
            value={name}
            onChangeText={setName}
          />
          <View style={styles.formActions}>
            {justSaved ? (
              <View style={styles.savedFlash}>
                <Ionicons name="checkmark-circle" size={18} color={tint} />
                <ThemedText style={{ color: tint, fontWeight: '700' }}>Saved ✓</ThemedText>
              </View>
            ) : null}
            {editingId ? (
              <Button title="Cancel" variant="secondary" onPress={cancelEdit} disabled={saving} />
            ) : null}
            <Button
              title={editingId ? 'Save Changes' : '+ Add Barber'}
              onPress={handleSubmit}
              loading={saving}
              disabled={!name.trim()}
            />
          </View>
        </Card>

        {/* Existing Barbers Roster */}
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Barber Roster ({barbers.length})</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: textMuted }]}>
            Active barbers are selectable by customers during slot booking.
          </ThemedText>
        </View>

        {barbers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="people-outline" size={32} color={icon} />
            <ThemedText style={{ color: textMuted }}>No barbers added yet.</ThemedText>
          </Card>
        ) : (
          barbers.map((barber) => (
            <Card key={barber.id} style={styles.barberRow}>
              <Pressable style={styles.barberInfo} onPress={() => startEdit(barber)}>
                <View style={[styles.avatarIcon, { backgroundColor: tintSurface }]}>
                  <Ionicons name="person" size={18} color={tint} />
                </View>
                <View style={styles.barberTextGroup}>
                  <View style={styles.titleRow}>
                    <ThemedText style={styles.barberName}>{barber.name}</ThemedText>
                    <Badge
                      label={barber.is_active ? 'Active' : 'On Leave'}
                      tone={barber.is_active ? 'success' : 'neutral'}
                    />
                  </View>
                  <ThemedText style={[styles.barberSub, { color: textMuted }]}>
                    Senior Stylist
                  </ThemedText>
                </View>
                <Ionicons name="pencil" size={16} color={icon} style={styles.editIcon} />
              </Pressable>
              <Switch
                value={barber.is_active}
                onValueChange={(value) => handleToggleActive(barber, value)}
                disabled={togglingId === barber.id}
                trackColor={{ false: surfaceBorder, true: withAlpha(success, 0.5) }}
                thumbColor={barber.is_active ? success : icon}
              />
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  errorBanner: {
    fontSize: 13,
    fontWeight: '600',
  },
  formCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  formActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  savedFlash: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 'auto',
  },
  sectionHeader: {
    gap: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  barberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  barberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barberTextGroup: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  barberSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  editIcon: {
    marginRight: Spacing.xs,
  },
});
