import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CardSkeleton } from '@/components/skeleton';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { Radius, Shadow, Spacing, withAlpha } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import {
  createService,
  fetchOwnServices,
  fetchOwnShop,
  setServiceActive,
  updateService,
  validateServiceInput,
  type OwnService,
  type ServiceFormInput,
} from '@/features/shops/partner-api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { successFeedback, tapFeedback } from '@/lib/haptics';

const EMPTY_FORM: ServiceFormInput = { name: '', priceRupees: '', durationMin: '' };

export default function PartnerServicesScreen() {
  const { profile } = useAuth();

  const [shopId, setShopId] = useState<string | null>(null);
  const [services, setServices] = useState<OwnService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ServiceFormInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const fieldErrors = useMemo(() => validateServiceInput(form), [form]);

  const danger = useThemeColor({}, 'danger');
  const icon = useThemeColor({}, 'icon');
  const tint = useThemeColor({}, 'tint');
  const tintSurface = useThemeColor({}, 'tintSurface');
  const textMuted = useThemeColor({}, 'textMuted');
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const success = useThemeColor({}, 'success');

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const shop = await fetchOwnShop(profile.id);
      setShopId(shop?.id ?? null);
      if (shop) setServices(await fetchOwnServices(shop.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load services.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(service: OwnService) {
    tapFeedback();
    setEditingId(service.id);
    setForm({
      name: service.name,
      priceRupees: (service.price / 100).toString(),
      durationMin: service.duration_min.toString(),
    });
  }

  function cancelEdit() {
    tapFeedback();
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit() {
    if (!shopId) return;
    tapFeedback();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateService(editingId, form);
      } else {
        await createService(shopId, form);
      }
      cancelEdit();
      setServices(await fetchOwnServices(shopId));
      successFeedback();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this service.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(service: OwnService, value: boolean) {
    successFeedback();
    setTogglingId(service.id);
    setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, is_active: value } : s)));
    try {
      await setServiceActive(service.id, value);
    } catch (e) {
      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, is_active: !value } : s)));
      setError(e instanceof Error ? e.message : 'Could not update this service.');
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
          Create your shop first, then come back to add services.
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
            Manage Services
          </ThemedText>
        </View>

        {error ? <ThemedText style={[styles.errorBanner, { color: danger }]}>{error}</ThemedText> : null}

        {/* Add / Edit Form Card */}
        <Card style={styles.formCard}>
          <ThemedText type="subtitle" style={styles.formTitle}>
            {editingId ? 'Edit Service' : 'Add New Service'}
          </ThemedText>
          <ThemedTextInput
            placeholder="Service name (e.g. Classic Haircut)"
            value={form.name}
            onChangeText={(name: string) => setForm((f) => ({ ...f, name }))}
          />
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <ThemedTextInput
                placeholder="Price in ₹ (e.g. 250)"
                keyboardType="decimal-pad"
                value={form.priceRupees}
                error={!!fieldErrors.priceRupees}
                onChangeText={(priceRupees: string) => setForm((f) => ({ ...f, priceRupees }))}
              />
              {fieldErrors.priceRupees ? (
                <ThemedText style={[styles.fieldError, { color: danger }]}>{fieldErrors.priceRupees}</ThemedText>
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <ThemedTextInput
                placeholder="Duration (mins)"
                keyboardType="number-pad"
                value={form.durationMin}
                error={!!fieldErrors.durationMin}
                onChangeText={(durationMin: string) => setForm((f) => ({ ...f, durationMin }))}
              />
              {fieldErrors.durationMin ? (
                <ThemedText style={[styles.fieldError, { color: danger }]}>{fieldErrors.durationMin}</ThemedText>
              ) : null}
            </View>
          </View>

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
              title={editingId ? 'Save Changes' : '+ Add Service'}
              onPress={handleSubmit}
              loading={saving}
              disabled={!!fieldErrors.priceRupees || !!fieldErrors.durationMin || !form.name.trim()}
            />
          </View>
        </Card>

        {/* Existing Services Catalog Section */}
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Your Active Catalog ({services.length})</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: textMuted }]}>
            Toggle switches to instantly show/hide services from customer booking.
          </ThemedText>
        </View>

        {services.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="cut-outline" size={32} color={icon} />
            <ThemedText style={{ color: textMuted }}>No services added yet.</ThemedText>
          </Card>
        ) : (
          services.map((service) => (
            <Card key={service.id} style={styles.serviceRow}>
              <Pressable style={styles.serviceInfo} onPress={() => startEdit(service)}>
                <View style={[styles.serviceIcon, { backgroundColor: tintSurface }]}>
                  <Ionicons name="cut" size={18} color={tint} />
                </View>
                <View style={styles.serviceTextGroup}>
                  <View style={styles.titleRow}>
                    <ThemedText style={styles.serviceName}>{service.name}</ThemedText>
                    <Badge
                      label={service.is_active ? 'Active' : 'Hidden'}
                      tone={service.is_active ? 'success' : 'neutral'}
                    />
                  </View>
                  <ThemedText style={[styles.serviceDetails, { color: textMuted }]}>
                    ₹{(service.price / 100).toFixed(0)}  •  ⏱️ {service.duration_min} mins
                  </ThemedText>
                </View>
                <Ionicons name="pencil" size={16} color={icon} style={styles.editIcon} />
              </Pressable>
              <Switch
                value={service.is_active}
                onValueChange={(value) => handleToggleActive(service, value)}
                disabled={togglingId === service.id}
                trackColor={{ false: surfaceBorder, true: withAlpha(success, 0.5) }}
                thumbColor={service.is_active ? success : icon}
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
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  fieldError: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
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
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  serviceInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTextGroup: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
  },
  serviceDetails: {
    fontSize: 12,
    fontWeight: '500',
  },
  editIcon: {
    marginRight: Spacing.xs,
  },
});
