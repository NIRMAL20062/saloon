package com.glide.app.data.repository

import com.glide.app.domain.model.Barber
import com.glide.app.domain.model.Service
import com.glide.app.domain.model.Shop
import com.glide.app.domain.model.ShopDetail
import com.glide.app.domain.repository.ShopRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import javax.inject.Inject
import javax.inject.Singleton

/** Mirrors features/shops/api.ts exactly — same columns, same RLS-backed filters. */
@Singleton
class SupabaseShopRepository @Inject constructor(
    private val supabase: SupabaseClient,
) : ShopRepository {

    override suspend fun fetchShops(search: String?): List<Shop> =
        supabase.postgrest.from("shops")
            .select {
                order("name", Order.ASCENDING)
                if (!search.isNullOrBlank()) {
                    filter { ilike("name", "%${search.trim()}%") }
                }
            }
            .decodeList<Shop>()

    override suspend fun fetchShopDetail(shopId: String): ShopDetail = coroutineScope {
        val shopDeferred = async {
            supabase.postgrest.from("shops")
                .select { filter { eq("id", shopId) }; single() }
                .decodeSingle<Shop>()
        }
        val servicesDeferred = async {
            supabase.postgrest.from("services")
                .select {
                    filter { eq("shop_id", shopId); eq("is_active", true) }
                    order("name", Order.ASCENDING)
                }
                .decodeList<Service>()
        }
        val barbersDeferred = async {
            supabase.postgrest.from("barbers")
                .select {
                    filter { eq("shop_id", shopId); eq("is_active", true) }
                    order("name", Order.ASCENDING)
                }
                .decodeList<Barber>()
        }
        ShopDetail(
            shop = shopDeferred.await(),
            services = servicesDeferred.await(),
            barbers = barbersDeferred.await(),
        )
    }
}
