import { supabase } from '@/lib/supabase/client';

export type Shop = {
  id: string;
  name: string;
  address: string | null;
  is_open: boolean;
  lat: number | null;
  lng: number | null;
};

export type Service = {
  id: string;
  shop_id: string;
  name: string;
  price: number; // integer paise — see Claude-Context.md Section 10
  duration_min: number;
};

export type Barber = {
  id: string;
  shop_id: string;
  name: string;
};

/**
 * RLS (migration 0002) already restricts this to `status = 'approved'`
 * shops — there is no client-side status filter here on purpose, so the
 * query stays identical to what the server actually allows.
 */
export async function fetchShops(search?: string): Promise<Shop[]> {
  let query = supabase
    .from('shops')
    .select('id, name, address, is_open, lat, lng')
    .order('name', { ascending: true });

  if (search?.trim()) {
    query = query.ilike('name', `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchShopDetail(shopId: string) {
  const [shopResult, servicesResult, barbersResult] = await Promise.all([
    supabase.from('shops').select('id, name, address, is_open, lat, lng').eq('id', shopId).single(),
    supabase
      .from('services')
      .select('id, shop_id, name, price, duration_min')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('barbers')
      .select('id, shop_id, name')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name'),
  ]);

  if (shopResult.error) throw shopResult.error;
  if (servicesResult.error) throw servicesResult.error;
  if (barbersResult.error) throw barbersResult.error;

  return {
    shop: shopResult.data as Shop,
    services: (servicesResult.data ?? []) as Service[],
    barbers: (barbersResult.data ?? []) as Barber[],
  };
}
