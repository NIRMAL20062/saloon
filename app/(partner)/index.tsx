import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { OpeningHoursEditor } from '@/components/opening-hours-editor';
import { QrScannerModal } from '@/components/qr-scanner-modal';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { PartnerColors, Radius, Spacing } from '@/constants/theme';
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
import { successFeedback, tapFeedback } from '@/lib/haptics';

export default function PartnerHomeScreen() {
  const { profile, signOut } = useAuth();

  const [shop, setShop] = useState<OwnShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleUseCurrentLocation() {
    tapFeedback();
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
      successFeedback();
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

  // Summary string for Opening Hours (e.g. Mon – Sun ● 09:00 – 20:00)
  const mondayHours = hours.mon;
  const hoursSummary = mondayHours && !mondayHours.closed
    ? `Mon – Sun  ●  ${mondayHours.open} – ${mondayHours.close}`
    : 'Tap to view & edit schedule';

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={PartnerColors.primary} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {error ? <ThemedText style={[styles.errorBanner, { color: PartnerColors.danger }]}>{error}</ThemedText> : null}

        {shop && shop.status === 'pending' ? (
          <View style={styles.pendingCard}>
            <Ionicons name="information-circle-outline" size={18} color={PartnerColors.pendingAlert} />
            <ThemedText style={[styles.pendingApprovalText, { color: PartnerColors.pendingAlert }]}>
              Pending approval — not visible to customers yet
            </ThemedText>
          </View>
        ) : null}

        {shop ? (
          <View style={styles.contentLayout}>
            {/* Top Navigation Bar & Shop Status Pill */}
            <View style={styles.topHeader}>
              <View style={styles.headerLeftGroup}>
                <View style={styles.menuIconBox}>
                  <Ionicons name="menu-outline" size={22} color={PartnerColors.textPrimary} />
                </View>
                <View style={styles.headerTextCol}>
                  <ThemedText style={styles.brandTitle}>GLIDE PARTNER</ThemedText>
                  <ThemedText style={styles.shopNameSub}>{shop.name?.toUpperCase() ?? 'MY SHOP'}</ThemedText>
                </View>
              </View>

              {/* Status Pill with Toggle */}
              <View style={styles.statusPill}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: shop.is_open ? PartnerColors.primary : PartnerColors.placeholder },
                  ]}
                />
                <ThemedText
                  style={[
                    styles.statusPillLabel,
                    { color: shop.is_open ? PartnerColors.primary : PartnerColors.textMuted },
                  ]}>
                  {shop.is_open ? 'OPEN' : 'PAUSED'}
                </ThemedText>
                <Switch
                  value={shop.is_open}
                  onValueChange={(val) => {
                    successFeedback();
                    handleToggleOpen(val);
                  }}
                  disabled={togglingOpen}
                  trackColor={{ false: PartnerColors.cardBorder, true: PartnerColors.primary }}
                  thumbColor={PartnerColors.onPrimary}
                  style={styles.switchCompact}
                />
              </View>
            </View>

            {/* Incoming Bookings Card */}
            <Link href="/(partner)/bookings" asChild>
              <Pressable
                onPress={() => tapFeedback()}
                style={({ pressed }) => [styles.incomingCard, pressed && styles.pressed]}>
                <View style={styles.iconSquircle}>
                  <Ionicons name="calendar-outline" size={20} color={PartnerColors.primary} />
                </View>
                <View style={styles.incomingContent}>
                  <ThemedText style={styles.sectionSmallHeading}>INCOMING BOOKINGS</ThemedText>
                  <ThemedText style={styles.incomingTitle}>
                    {pendingBookings > 0
                      ? `${pendingBookings} awaiting your response`
                      : 'Nothing waiting right now'}
                  </ThemedText>
                </View>
                {pendingBookings > 0 ? (
                  <View style={styles.pendingCountBadge}>
                    <ThemedText style={styles.pendingCountText}>{pendingBookings}</ThemedText>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={PartnerColors.textMuted} />
              </Pressable>
            </Link>

            {/* Quick Actions 3-Column Grid */}
            <View style={styles.sectionGroup}>
              <ThemedText style={styles.sectionTrackedHeading}>QUICK ACTIONS</ThemedText>
              <View style={styles.quickActionsGrid}>
                {/* 1. Scan Customer QR Code */}
                <Pressable
                  onPress={() => {
                    tapFeedback();
                    setQrModalVisible(true);
                  }}
                  style={({ pressed }) => [styles.quickActionColumnCard, pressed && styles.pressed]}>
                  <View style={styles.quickActionIconBox}>
                    <Ionicons name="qr-code-outline" size={22} color={PartnerColors.primary} />
                  </View>
                  <ThemedText style={styles.quickActionTitle}>Scan Customer{'\n'}QR Code</ThemedText>
                  <View style={styles.quickActionMiniArrow}>
                    <Ionicons name="chevron-forward" size={13} color={PartnerColors.textMuted} />
                  </View>
                </Pressable>

                {/* 2. Services & Prices */}
                <Link href="/(partner)/services" asChild>
                  <Pressable
                    onPress={() => tapFeedback()}
                    style={({ pressed }) => [styles.quickActionColumnCard, pressed && styles.pressed]}>
                    <View style={styles.quickActionIconBox}>
                      <Ionicons name="pricetag-outline" size={22} color={PartnerColors.primary} />
                    </View>
                    <ThemedText style={styles.quickActionTitle}>Services &{'\n'}Prices</ThemedText>
                    <View style={styles.quickActionMiniArrow}>
                      <Ionicons name="chevron-forward" size={13} color={PartnerColors.textMuted} />
                    </View>
                  </Pressable>
                </Link>

                {/* 3. Barbers & Stylists */}
                <Link href="/(partner)/barbers" asChild>
                  <Pressable
                    onPress={() => tapFeedback()}
                    style={({ pressed }) => [styles.quickActionColumnCard, pressed && styles.pressed]}>
                    <View style={styles.quickActionIconBox}>
                      <Ionicons name="person-outline" size={22} color={PartnerColors.primary} />
                    </View>
                    <ThemedText style={styles.quickActionTitle}>Barbers &{'\n'}Stylists</ThemedText>
                    <View style={styles.quickActionMiniArrow}>
                      <Ionicons name="chevron-forward" size={13} color={PartnerColors.textMuted} />
                    </View>
                  </Pressable>
                </Link>
              </View>
            </View>

            {/* Edit Shop Profile Section */}
            <View style={styles.sectionGroup}>
              <ThemedText style={styles.sectionTrackedHeading}>EDIT SHOP PROFILE</ThemedText>
              
              <View style={styles.profileRowsContainer}>
                {/* Shop Name Input Row */}
                <View style={styles.profileFieldCard}>
                  <View style={styles.profileFieldIconBox}>
                    <Ionicons name="storefront-outline" size={18} color={PartnerColors.primary} />
                  </View>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Shop name"
                    placeholderTextColor={PartnerColors.placeholder}
                    style={styles.profileFieldInput}
                  />
                  <Ionicons name="chevron-forward" size={18} color={PartnerColors.placeholder} />
                </View>

                {/* Owner / Address Input Row */}
                <View style={styles.profileFieldCard}>
                  <View style={styles.profileFieldIconBox}>
                    <Ionicons name="person-outline" size={18} color={PartnerColors.primary} />
                  </View>
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Address / Details"
                    placeholderTextColor={PartnerColors.placeholder}
                    style={styles.profileFieldInput}
                  />
                  <Ionicons name="chevron-forward" size={18} color={PartnerColors.placeholder} />
                </View>

                {/* Location Action Row */}
                <Pressable
                  onPress={handleUseCurrentLocation}
                  style={({ pressed }) => [styles.profileFieldCard, pressed && styles.pressed]}>
                  <View style={styles.profileFieldIconBox}>
                    <Ionicons name="location-outline" size={18} color={PartnerColors.primary} />
                  </View>
                  <View style={styles.locationContentCol}>
                    <ThemedText style={styles.profileRowMainText}>
                      {coordinates ? 'Location set ✓' : 'Set shop location'}
                    </ThemedText>
                    <ThemedText style={styles.profileRowSubText}>
                      {locationHint ?? (coordinates ? '(tap to refresh)' : 'Use GPS location')}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={PartnerColors.placeholder} />
                </Pressable>
              </View>

              {/* Save Profile Button */}
              <Pressable
                onPress={handleSaveProfile}
                disabled={!name.trim() || saving}
                style={({ pressed }) => [
                  styles.saveProfileBtn,
                  (!name.trim() || saving) && styles.disabledButton,
                  pressed && styles.pressed,
                ]}>
                <Ionicons
                  name={justSaved ? 'checkmark-circle-outline' : 'save-outline'}
                  size={18}
                  color={PartnerColors.onPrimary}
                />
                <ThemedText style={styles.saveProfileBtnText}>
                  {saving ? 'SAVING...' : justSaved ? 'SAVED ✓' : 'SAVE PROFILE'}
                </ThemedText>
              </Pressable>
            </View>

            {/* Opening Hours Summary & Expandable Card */}
            <View style={styles.hoursCardWrapper}>
              <Pressable
                onPress={() => {
                  tapFeedback();
                  setHoursExpanded((prev) => !prev);
                }}
                style={styles.hoursSummaryRow}>
                <View style={styles.iconSquircle}>
                  <Ionicons name="time-outline" size={20} color={PartnerColors.primary} />
                </View>
                <View style={styles.incomingContent}>
                  <ThemedText style={styles.sectionSmallHeading}>OPENING HOURS</ThemedText>
                  <ThemedText style={styles.hoursSummaryText}>{hoursSummary}</ThemedText>
                </View>
                <Ionicons
                  name={hoursExpanded ? 'chevron-up' : 'chevron-forward'}
                  size={18}
                  color={PartnerColors.textMuted}
                />
              </Pressable>

              {hoursExpanded && (
                <View style={styles.hoursExpandedContent}>
                  <OpeningHoursEditor
                    value={hours}
                    onChange={setHours}
                    errors={hoursErrors}
                    disabled={savingHours}
                  />

                  <Pressable
                    onPress={handleSaveHours}
                    disabled={savingHours || Object.keys(hoursErrors).length > 0}
                    style={({ pressed }) => [
                      styles.saveHoursBtn,
                      (savingHours || Object.keys(hoursErrors).length > 0) && styles.disabledButton,
                      pressed && styles.pressed,
                    ]}>
                    <Ionicons
                      name={hoursSaved ? 'checkmark-circle-outline' : 'time-outline'}
                      size={18}
                      color={PartnerColors.onPrimary}
                    />
                    <ThemedText style={styles.saveProfileBtnText}>
                      {savingHours ? 'SAVING...' : hoursSaved ? 'SAVED ✓' : 'SAVE HOURS'}
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Sign Out Action Card */}
            <Pressable
              onPress={signOut}
              style={({ pressed }) => [styles.signOutCard, pressed && styles.pressed]}>
              <Ionicons name="log-out-outline" size={18} color={PartnerColors.danger} />
              <ThemedText style={styles.signOutText}>SIGN OUT</ThemedText>
            </Pressable>
          </View>
        ) : (
          /* Initial Shop Setup View */
          <View style={styles.setupContainer}>
            <View style={styles.topHeader}>
              <View style={styles.headerLeftGroup}>
                <View style={styles.menuIconBox}>
                  <Ionicons name="storefront-outline" size={22} color={PartnerColors.primary} />
                </View>
                <View style={styles.headerTextCol}>
                  <ThemedText style={styles.brandTitle}>GLIDE PARTNER</ThemedText>
                  <ThemedText style={styles.shopNameSub}>SETUP YOUR SHOP</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.setupCard}>
              <ThemedText style={styles.setupTitle}>Create Your Shop</ThemedText>
              <ThemedText style={styles.setupSubtitle}>
                Initial setup — start listing your services and accepting bookings. Your shop starts as
                &ldquo;pending&rdquo; until approved; customers can&apos;t see it yet.
              </ThemedText>

              <View style={styles.profileFieldCard}>
                <View style={styles.profileFieldIconBox}>
                  <Ionicons name="storefront-outline" size={18} color={PartnerColors.primary} />
                </View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Shop name"
                  placeholderTextColor={PartnerColors.placeholder}
                  style={styles.profileFieldInput}
                />
              </View>

              <View style={styles.profileFieldCard}>
                <View style={styles.profileFieldIconBox}>
                  <Ionicons name="location-outline" size={18} color={PartnerColors.primary} />
                </View>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Shop address"
                  placeholderTextColor={PartnerColors.placeholder}
                  style={styles.profileFieldInput}
                />
              </View>

              <Pressable
                onPress={handleUseCurrentLocation}
                style={({ pressed }) => [styles.profileFieldCard, pressed && styles.pressed]}>
                <View style={styles.profileFieldIconBox}>
                  <Ionicons name="navigate-outline" size={18} color={PartnerColors.primary} />
                </View>
                <View style={styles.locationContentCol}>
                  <ThemedText style={styles.profileRowMainText}>
                    {coordinates ? 'Location set ✓' : 'Use my current location'}
                  </ThemedText>
                  <ThemedText style={styles.profileRowSubText}>
                    {locationHint ?? 'GPS coordinates for discovery map'}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={PartnerColors.placeholder} />
              </Pressable>

              <Pressable
                onPress={handleCreate}
                disabled={!name.trim() || saving}
                style={({ pressed }) => [
                  styles.saveProfileBtn,
                  (!name.trim() || saving) && styles.disabledButton,
                  pressed && styles.pressed,
                ]}>
                <Ionicons name="storefront-outline" size={18} color={PartnerColors.onPrimary} />
                <ThemedText style={styles.saveProfileBtnText}>
                  {saving ? 'CREATING...' : 'CREATE SHOP'}
                </ThemedText>
              </Pressable>
            </View>

            <Pressable
              onPress={signOut}
              style={({ pressed }) => [styles.signOutCard, pressed && styles.pressed]}>
              <Ionicons name="log-out-outline" size={18} color={PartnerColors.danger} />
              <ThemedText style={styles.signOutText}>SIGN OUT</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <QrScannerModal
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PartnerColors.background,
  },
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 80,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentLayout: {
    gap: 16,
  },

  /* Top Navigation & Status Bar */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PartnerColors.cardSurface,
    borderWidth: 1,
    borderColor: PartnerColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PartnerColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerTextCol: {
    gap: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: PartnerColors.textPrimary,
    letterSpacing: 0.5,
  },
  shopNameSub: {
    fontSize: 11,
    fontWeight: '700',
    color: PartnerColors.textMuted,
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PartnerColors.mintSurface,
    borderWidth: 1,
    borderColor: PartnerColors.mintBorder,
    borderRadius: 22,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 3,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusPillLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  switchCompact: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },

  /* Incoming Bookings Card */
  incomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PartnerColors.cardSurface,
    borderWidth: 1,
    borderColor: PartnerColors.cardBorder,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 12,
    shadowColor: PartnerColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PartnerColors.mintSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingContent: {
    flex: 1,
    gap: 2,
  },
  sectionSmallHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: PartnerColors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  incomingTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: PartnerColors.textPrimary,
  },
  pendingCountBadge: {
    backgroundColor: PartnerColors.pendingAlert,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingCountText: {
    color: PartnerColors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  /* Quick Actions 3-Column Grid */
  sectionGroup: {
    gap: 8,
  },
  sectionTrackedHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: PartnerColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 2,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionColumnCard: {
    flex: 1,
    backgroundColor: PartnerColors.cardSurface,
    borderWidth: 1,
    borderColor: PartnerColors.cardBorder,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 146,
    shadowColor: PartnerColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PartnerColors.mintSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: PartnerColors.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },
  quickActionMiniArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PartnerColors.background,
    borderWidth: 1,
    borderColor: PartnerColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Edit Profile Rows */
  profileRowsContainer: {
    gap: 8,
  },
  profileFieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PartnerColors.cardSurface,
    borderWidth: 1,
    borderColor: PartnerColors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  profileFieldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PartnerColors.mintSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileFieldInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: PartnerColors.textPrimary,
    paddingVertical: 2,
  },
  locationContentCol: {
    flex: 1,
    gap: 1,
  },
  profileRowMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: PartnerColors.textPrimary,
  },
  profileRowSubText: {
    fontSize: 12,
    color: PartnerColors.textMuted,
  },
  saveProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PartnerColors.textPrimary, // Ink Noir, matches the doc's Partner Text Primary token
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
    shadowColor: PartnerColors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  saveProfileBtnText: {
    color: PartnerColors.onPrimary,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  /* Opening Hours Card */
  hoursCardWrapper: {
    backgroundColor: PartnerColors.cardSurface,
    borderWidth: 1,
    borderColor: PartnerColors.cardBorder,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: PartnerColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  hoursSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  hoursSummaryText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: PartnerColors.textPrimary,
  },
  hoursExpandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: PartnerColors.rowDivider,
  },
  saveHoursBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PartnerColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 10,
  },

  /* Sign Out Card */
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PartnerColors.dangerSurface,
    borderWidth: 1,
    borderColor: PartnerColors.dangerBorder,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
  },
  signOutText: {
    color: PartnerColors.danger,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  /* Setup Flow */
  setupContainer: {
    gap: 16,
  },
  setupCard: {
    backgroundColor: PartnerColors.cardSurface,
    borderWidth: 1,
    borderColor: PartnerColors.cardBorder,
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: PartnerColors.textPrimary,
  },
  setupSubtitle: {
    fontSize: 13,
    color: PartnerColors.textMuted,
    lineHeight: 18,
  },

  /* Utilities */
  disabledButton: {
    opacity: 0.6,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PartnerColors.pendingAlertSurface,
    borderWidth: 1,
    borderColor: PartnerColors.pendingAlertBorder,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 10,
  },
  pendingApprovalText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
