import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { FloatingCartBar } from '@/components/floating-cart-bar';
import { Screen } from '@/components/screen';
import { ServiceItemCard } from '@/components/service-item-card';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { fetchShopDetail, type Barber, type Service, type Shop } from '@/features/shops/api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

// Module scope, not component-local — a plain constant re-declared inside the
// component body would get a fresh array identity (and reallocate) on every
// render, including every cart-quantity keystroke.
const GALLERY_IMAGES = [
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80',
];

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cart Selection state: map service ID to quantity
  const [selectedServices, setSelectedServices] = useState<Record<string, number>>({});
  const [selectedBarberId, setSelectedBarberId] = useState<string>('any');
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  const danger = useThemeColor({}, 'danger');
  const icon = useThemeColor({}, 'icon');
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textMuted = useThemeColor({}, 'textMuted');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchShopDetail(id)
      .then((result) => {
        if (!isMounted) return;
        setShop(result.shop);
        setServices(result.services);
        setBarbers(result.barbers);
      })
      .catch((e) => {
        if (isMounted) setError(e instanceof Error ? e.message : 'Could not load this shop.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleAddService = (serviceId: string) => {
    setSelectedServices((prev) => ({
      ...prev,
      [serviceId]: (prev[serviceId] || 0) + 1,
    }));
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices((prev) => {
      const current = prev[serviceId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      }
      return { ...prev, [serviceId]: current - 1 };
    });
  };

  // Compute Cart totals
  const { totalItems, totalPrice } = useMemo(() => {
    let count = 0;
    let price = 0;
    services.forEach((s) => {
      const qty = selectedServices[s.id] || 0;
      if (qty > 0) {
        count += qty;
        price += (s.price / 100) * qty;
      }
    });
    return { totalItems: count, totalPrice: Math.round(price) };
  }, [services, selectedServices]);

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={tint} />
      </Screen>
    );
  }

  if (error || !shop) {
    return (
      <Screen style={styles.center}>
        <ThemedText style={{ color: danger }}>{error ?? 'Shop not found.'}</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Floating Back Button */}
        <Pressable
          onPress={() => {
            tapFeedback();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(customer)');
            }
          }}
          style={[styles.backBtn, { backgroundColor: surface, borderColor: surfaceBorder }]}
          hitSlop={12}>
          <Ionicons name="arrow-back" size={18} color={icon} />
          <ThemedText style={styles.backText}>Back</ThemedText>
        </Pressable>

        {/* Hero Photo Gallery Carousel */}
        <View style={styles.heroContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const width = e.nativeEvent.layoutMeasurement.width;
              if (width > 0) {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setActivePhotoIdx(idx);
              }
            }}
            scrollEventThrottle={16}>
            {GALLERY_IMAGES.map((imgUrl, idx) => (
              <Image key={idx} source={{ uri: imgUrl }} style={styles.heroImage} resizeMode="cover" />
            ))}
          </ScrollView>

          {/* Pagination Dots */}
          <View style={styles.paginationDotsWrap}>
            {GALLERY_IMAGES.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === activePhotoIdx && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {/* Rating Pill */}
          <View style={styles.heroRatingBadge}>
            <Ionicons name="star" size={12} color="#FFF" />
            <ThemedText style={styles.heroRatingText}>New</ThemedText>
          </View>
        </View>

        {/* Shop Info Header */}
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.shopTitle}>{shop.name}</ThemedText>
            <Badge
              label={shop.is_open ? 'OPEN NOW' : 'CLOSED'}
              tone={shop.is_open ? 'success' : 'danger'}
              dot
            />
          </View>

          {shop.address ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={15} color={textMuted} />
              <ThemedText style={[styles.addressText, { color: textMuted }]}>
                {shop.address}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Stylist / Barber Selection */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>Choose Stylist / Barber</ThemedText>
          {barbers.length === 0 ? (
            <ThemedText style={{ color: textMuted, fontStyle: 'italic' }}>
              No barbers listed yet.
            </ThemedText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.barberScroll}>
              <Chip
                label="Any Barber (Fastest)"
                icon="people-outline"
                active={selectedBarberId === 'any'}
                onPress={() => setSelectedBarberId('any')}
                style={styles.barberChip}
              />
              {barbers.map((b) => (
                <Chip
                  key={b.id}
                  label={b.name}
                  icon="person-outline"
                  active={b.id === selectedBarberId}
                  onPress={() => setSelectedBarberId(b.id)}
                  style={[styles.barberChip, b.id === selectedBarberId && Shadow.glowCyan]}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Services Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>Select Services</ThemedText>

          {services.length === 0 ? (
            <ThemedText style={{ color: textMuted, fontStyle: 'italic' }}>
              No services listed yet for this salon.
            </ThemedText>
          ) : (
            services.map((s, index) => (
              <ServiceItemCard
                key={s.id}
                id={s.id}
                name={s.name}
                price={Math.round(s.price / 100)}
                durationMin={s.duration_min}
                isPopular={index === 0}
                description={`Professional ${s.name.toLowerCase()} service with premium styling products.`}
                quantity={selectedServices[s.id] || 0}
                onAdd={() => handleAddService(s.id)}
                onRemove={() => handleRemoveService(s.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Sticky Checkout Bar */}
      <FloatingCartBar
        itemCount={totalItems}
        totalPrice={totalPrice}
        ctaText="Select Time Slot"
        onPress={() => {
          // A slot booking needs one specific barber (CLAUDE.md Phase 4:
          // "choose shop → barber → service → date/time") — "Any Barber" is
          // an assignment-logic concept that isn't built, so guard against it
          // here rather than letting the next screen fail confusingly.
          if (selectedBarberId === 'any') {
            Alert.alert('Pick a barber', 'Select a specific barber above to book a slot with them.');
            return;
          }
          const chosenServiceIds = Object.keys(selectedServices).filter((id) => selectedServices[id] > 0);
          router.push({
            pathname: '/(customer)/book/[shopId]',
            params: {
              shopId: shop.id,
              barberId: selectedBarberId,
              serviceIds: JSON.stringify(chosenServiceIds),
            },
          });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
    zIndex: 10,
    ...Shadow.sm,
  },
  backText: {
    ...Typography.badgeText,
    fontWeight: '600',
  },
  heroContainer: {
    height: 180,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.card,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroRatingBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    gap: 4,
  },
  heroRatingText: {
    color: '#FFF',
    ...Typography.badgeText,
  },
  paginationDotsWrap: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    width: 14,
    backgroundColor: '#06B6D4',
  },
  headerInfo: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopTitle: {
    ...Typography.screenTitle,
    fontSize: 22,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    ...Typography.bodyText,
    fontSize: 13,
  },
  section: {
    marginTop: Spacing.xs,
  },
  sectionHeader: {
    ...Typography.sectionHeader,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  barberScroll: {
    gap: Spacing.sm,
    paddingBottom: 4,
  },
  barberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 6,
    ...Shadow.sm,
  },
});

