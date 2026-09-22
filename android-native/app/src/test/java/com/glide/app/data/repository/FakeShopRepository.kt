package com.glide.app.data.repository

import com.glide.app.domain.model.Barber
import com.glide.app.domain.model.Service
import com.glide.app.domain.model.Shop
import com.glide.app.domain.model.ShopDetail
import com.glide.app.domain.repository.ShopRepository

class FakeShopRepository : ShopRepository {
    var shopsToReturn: List<Shop> = emptyList()
    var servicesToReturn: List<Service> = emptyList()
    var barbersToReturn: List<Barber> = emptyList()
    var fetchShopsError: Throwable? = null
    val searchesReceived = mutableListOf<String?>()

    override suspend fun fetchShops(search: String?): List<Shop> {
        fetchShopsError?.let { throw it }
        searchesReceived += search
        if (search.isNullOrBlank()) return shopsToReturn
        return shopsToReturn.filter { it.name.contains(search, ignoreCase = true) }
    }

    override suspend fun fetchShopDetail(shopId: String): ShopDetail {
        val shop = shopsToReturn.first { it.id == shopId }
        return ShopDetail(shop = shop, services = servicesToReturn, barbers = barbersToReturn)
    }
}
