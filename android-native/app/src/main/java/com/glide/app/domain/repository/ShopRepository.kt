package com.glide.app.domain.repository

import com.glide.app.domain.model.ShopDetail
import com.glide.app.domain.model.Shop

interface ShopRepository {
    /**
     * RLS (migration 0002) already restricts this to `status = 'approved'` shops —
     * no client-side status filter here on purpose, mirroring features/shops/api.ts.
     */
    suspend fun fetchShops(search: String? = null): List<Shop>

    suspend fun fetchShopDetail(shopId: String): ShopDetail
}
