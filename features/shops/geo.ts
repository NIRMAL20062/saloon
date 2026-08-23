import * as Location from 'expo-location';

export type Coordinates = { lat: number; lng: number };

/**
 * Great-circle distance between two lat/lng points, in kilometers.
 * Fine at this scale (a city's worth of shops, client-side sort) — no need
 * for PostGIS/earthdistance until the dataset or query pattern demands it.
 */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const EARTH_RADIUS_KM = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_KM * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Returns the device's current coordinates, or `null` if permission was
 * denied or the position couldn't be read. Never throws — a customer who
 * declines the location prompt should still see the (unsorted) shop list,
 * not an error screen. Only ever requests *foreground* ("when in use")
 * access; GLIDE has no reason to track location while the app is closed.
 */
export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch (e) {
    console.warn('[geo] failed to read location:', e instanceof Error ? e.message : e);
    return null;
  }
}
