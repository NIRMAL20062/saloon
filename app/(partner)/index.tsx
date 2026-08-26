import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { OpeningHoursEditor } from '@/components/opening-hours-editor';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { Colors, Radius, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { countPendingBookings, expireStaleBookings } from '@/features/bookings/api';
import { getCurrentCoordinates, type Coordinates } from '@/features/shops/geo';
import {
  createShop,
  fetchOwnShop,
  setShopOpen,
  updateOpeningHours,
  updateShopProfile,
  validateOpeningHours,
  withOpeningHoursDefaults,
  type OpeningHours,
  type OwnShop,
} from '@/features/shops/partner-api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { successFeedback } from '@/lib/haptics';

export default function PartnerHomeScreen() {
  const { profile, signOut } = useAuth();

  const [shop, setShop] = useState<OwnShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingOpen, setTogglingOpen] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [hours, setHours] = useState<OpeningHours>(withOpeningHoursDefaults(null));
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);
  const hoursErrors = validateOpeningHours(hours);

  const [pendingBookings, setPendingBookings] = useState(0);

  const danger = useThemeColor({}, 'danger');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const tint = useThemeColor({}, 'tint');
  const textPrimary = useThemeColor({}, 'text');
  const textMuted = useThemeColor({}, 'textMuted');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const own = await fetchOwnShop(profile.id);
      setShop(own);
      if (own) {
        setName(own.name);
        setAddress(own.address ?? '');
        setCoordinates(own.lat != null && own.lng != null ? { lat: own.lat, lng: own.lng } : null);
        setHours(own.opening_hours);
        // Best-effort — a failed sweep or count just means a stale badge
        // number for one screen load, never a broken shop-profile screen.
        expireStaleBookings()
          .then(() => countPendingBookings(own.id))
          .then(setPendingBookings)
          .catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your shop.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // useFocusEffect (not a plain mount-only useEffect) so the pending-bookings
  // badge is fresh again after coming back from the Incoming Bookings screen.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleUseCurrentLocation() {
    setLocationHint('Finding location…');
    const coords = await getCurrentCoordinates();
    setCoordinates(coords);
    setLocationHint(coords ? 'Location set ✓' : 'Could not get location.');
  }

  async function handleCreate() {
    if (!profile || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createShop({ ownerId: profile.id, name, address, coordinates });
      setShop(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your shop.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveProfile() {
    if (!shop || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateShopProfile(shop.id, { name, address, coordinates });
      await load();
      successFeedback();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveHours() {
    if (!shop || Object.keys(hoursErrors).length > 0) return;
    setSavingHours(true);
    setError(null);
    try {
      await updateOpeningHours(shop.id, hours);
      setShop({ ...shop, opening_hours: hours });
      successFeedback();
      setHoursSaved(true);
      setTimeout(() => setHoursSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save opening hours.');
    } finally {
      setSavingHours(false);
    }
  }

  async function handleToggleOpen(value: boolean) {
    if (!shop) return;
    setTogglingOpen(true);
    setShop({ ...shop, is_open: value });
    try {
      await setShopOpen(shop.id, value);
    } catch (e) {
      setShop({ ...shop, is_open: !value });
      setError(e instanceof Error ? e.message : 'Could not update open status.');
    } finally {
      setTogglingOpen(false);
    }
  }

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={tint} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Brand Header Line */}
        <View style={styles.brandHeader}>
          <View>
            <ThemedText style={styles.brandTitle}>GLIDE PARTNER</ThemedText>
            <ThemedText style={[styles.shopSubtext, { color: textMuted }]}>
              {shop?.name?.toUpperCase() ?? 'SETUP'}
            </ThemedText>
          </View>

          {/* Minimal Status Indicator */}
          {shop && (
            <View style={styles.statusToggleRow}>
              <View style={[styles.statusDot, { backgroundColor: shop.is_open ? success : danger }]} />
              <ThemedText style={[styles.statusLabel, { color: shop.is_open ? success : danger }]}>
                {shop.is_open ? 'OPEN' : 'PAUSED'}
              </ThemedText>
              <Switch
                value={shop.is_open}
                onValueChange={(val) => {
                  successFeedback();
                  handleToggleOpen(val);
                }}
                disabled={togglingOpen}
                trackColor={{ false: withAlpha(danger, 0.25), true: withAlpha(success, 0.5) }}
                thumbColor={shop.is_open ? success : danger}
              />
            </View>
          )}
        </View>

        {error ? <ThemedText style={{ color: danger }}>{error}</ThemedText> : null}

        {shop && shop.status === 'pending' ? (
          <ThemedText style={[styles.pendingApprovalText, { color: warning }]}>
            Pending approval — not visible to customers yet
          </ThemedText>
        ) : null}

        <View style={[styles.hairline, { backgroundColor: surfaceBorder }]} />

        {/* Incoming Bookings — links to the real Accept/Reject screen rather
            than cramming a live countdown/action pair into this overview
            (CLAUDE.md Section 13: this needs to stay hard to miss, not
            buried — the badge count does that without turning the home
            screen into a second copy of the bookings list). */}
        {shop && (
          <Link href="/(partner)/bookings" asChild>
            <Pressable style={({ pressed }) => [styles.section, pressed && styles.pressed]}>
              <View style={styles.incomingRow}>
                <View style={styles.incomingLeft}>
                  <ThemedText style={[styles.sectionTitle, { color: textMuted }]}>INCOMING BOOKINGS</ThemedText>
                  <ThemedText style={styles.customerName}>
                    {pendingBookings > 0 ? `${pendingBookings} awaiting your response` : 'Nothing waiting right now'}
                  </ThemedText>
                </View>
                <View style={styles.incomingActions}>
                  {pendingBookings > 0 ? (
                    <View style={[styles.pendingBadge, { backgroundColor: warning }]}>
                      <ThemedText style={styles.pendingBadgeText}>{pendingBookings}</ThemedText>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color={textPrimary} />
                </View>
              </View>
            </Pressable>
          </Link>
        )}

        <View style={[styles.hairline, { backgroundColor: surfaceBorder }]} />

        {/* Quick Actions List (Hairline Separated) */}
        {shop && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textMuted }]}>QUICK ACTIONS</ThemedText>

            <Link href="/(partner)/services" asChild>
              <Pressable style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
                <ThemedText style={styles.actionRowText}>Services & Prices</ThemedText>
                <Ionicons name="arrow-forward" size={18} color={textPrimary} />
              </Pressable>
            </Link>

            <View style={[styles.hairline, { backgroundColor: surfaceBorder }]} />

            <Link href="/(partner)/barbers" asChild>
              <Pressable style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
                <ThemedText style={styles.actionRowText}>Barbers & Stylists</ThemedText>
                <Ionicons name="arrow-forward" size={18} color={textPrimary} />
              </Pressable>
            </Link>

            <View style={[styles.hairline, { backgroundColor: surfaceBorder }]} />

            <View style={styles.profileEditSection}>
              <ThemedText style={[styles.subHeader, { color: textMuted }]}>EDIT SHOP PROFILE</ThemedText>
              <ThemedTextInput placeholder="Shop name" value={name} onChangeText={setName} />
              <ThemedTextInput placeholder="Address" value={address} onChangeText={setAddress} />
              <Pressable onPress={handleUseCurrentLocation} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
                <ThemedText style={styles.actionRowText}>
                  {coordinates ? 'Location set ✓ (tap to refresh)' : 'Set shop location'}
                </ThemedText>
                <Ionicons name="location-outline" size={18} color={textPrimary} />
              </Pressable>
              {locationHint ? <ThemedText style={[styles.locationHint, { color: textMuted }]}>{locationHint}</ThemedText> : null}

              <View style={styles.saveRow}>
                {justSaved ? <ThemedText style={{ color: tint, fontWeight: '700' }}>Saved ✓</ThemedText> : null}
                <Pressable
                  onPress={handleSaveProfile}
                  disabled={!name.trim() || saving}
                  style={({ pressed }) => [styles.saveBtn, { backgroundColor: textPrimary }, pressed && styles.pressed]}>
                  <ThemedText style={[styles.saveBtnText, { color: Colors.light.background }]}>
                    {saving ? 'SAVING...' : 'SAVE PROFILE'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            <View style={[styles.hairline, { backgroundColor: surfaceBorder }]} />

            <View style={styles.profileEditSection}>
              <ThemedText style={[styles.subHeader, { color: textMuted }]}>OPENING HOURS</ThemedText>
              <ThemedText style={[styles.hoursHint, { color: textMuted }]}>
                Your regular weekly schedule — separate from the OPEN/PAUSED switch above, which is for
                right-now exceptions, not planned hours.
              </ThemedText>
              <OpeningHoursEditor value={hours} onChange={setHours} errors={hoursErrors} disabled={savingHours} />
              <View style={styles.saveRow}>
                {hoursSaved ? <ThemedText style={{ color: tint, fontWeight: '700' }}>Saved ✓</ThemedText> : null}
                <Pressable
                  onPress={handleSaveHours}
                  disabled={savingHours || Object.keys(hoursErrors).length > 0}
                  style={({ pressed }) => [styles.saveBtn, { backgroundColor: textPrimary }, pressed && styles.pressed]}>
                  <ThemedText style={[styles.saveBtnText, { color: Colors.light.background }]}>
                    {savingHours ? 'SAVING...' : 'SAVE HOURS'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {!shop && (
          <View style={styles.setupCard}>
            <ThemedText style={styles.brandTitle}>CREATE YOUR SHOP</ThemedText>
            <ThemedText style={[styles.shopSubtext, { color: textMuted }]}>
              Initial setup — start listing your services and accepting bookings. Your shop starts as
              &ldquo;pending&rdquo; until an admin approves it (Phase 12); customers can&apos;t see it yet.
            </ThemedText>
            <ThemedTextInput placeholder="Shop name" value={name} onChangeText={setName} />
            <ThemedTextInput placeholder="Address" value={address} onChangeText={setAddress} />
            <Pressable onPress={handleUseCurrentLocation} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
              <ThemedText style={styles.actionRowText}>
                {coordinates ? 'Location set ✓ (tap to refresh)' : 'Use my current location'}
              </ThemedText>
              <Ionicons name="location-outline" size={18} color={textPrimary} />
            </Pressable>
            {locationHint ? <ThemedText style={[styles.locationHint, { color: textMuted }]}>{locationHint}</ThemedText> : null}
            <Pressable
              onPress={handleCreate}
              disabled={!name.trim() || saving}
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: tint }, pressed && styles.pressed]}>
              <ThemedText style={styles.saveBtnText}>{saving ? 'CREATING...' : 'CREATE SHOP'}</ThemedText>
            </Pressable>
          </View>
        )}

        <Pressable onPress={signOut} style={styles.signOutBtn}>
          <ThemedText style={[styles.signOutText, { color: textMuted }]}>SIGN OUT</ThemedText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  brandTitle: {
    ...Typography.displayHero,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  shopSubtext: {
    ...Typography.microText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pendingApprovalText: {
    ...Typography.microText,
    fontSize: 12,
    fontWeight: '700',
  },
  statusToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    ...Typography.microText,
    fontWeight: '800',
    fontSize: 11,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.sectionHeader,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  incomingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomingLeft: {
    gap: 2,
  },
  incomingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pendingBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  customerName: {
    ...Typography.cardTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  actionRowText: {
    ...Typography.cardTitle,
    fontSize: 16,
    fontWeight: '700',
  },
  profileEditSection: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  subHeader: {
    ...Typography.microText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hoursHint: {
    ...Typography.microText,
    fontSize: 12,
    marginTop: -6,
  },
  locationHint: {
    ...Typography.microText,
    fontSize: 12,
    marginTop: -6,
  },
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  saveBtnText: {
    ...Typography.badgeText,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#FFF',
  },
  setupCard: {
    gap: Spacing.md,
  },
  signOutBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  signOutText: {
    ...Typography.badgeText,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  pressed: { opacity: 0.8 },
});
