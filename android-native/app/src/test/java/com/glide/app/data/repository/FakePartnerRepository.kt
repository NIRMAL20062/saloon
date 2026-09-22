package com.glide.app.data.repository

import com.glide.app.core.location.Coordinates
import com.glide.app.domain.model.DayHours
import com.glide.app.domain.model.DayKey
import com.glide.app.domain.model.OwnBarber
import com.glide.app.domain.model.OwnService
import com.glide.app.domain.model.OwnShop
import com.glide.app.domain.model.ServiceFormInput
import com.glide.app.domain.model.parseServiceInput
import com.glide.app.domain.repository.PartnerRepository

class FakePartnerRepository : PartnerRepository {
    var shop: OwnShop? = null
    var services = mutableListOf<OwnService>()
    var barbers = mutableListOf<OwnBarber>()

    var fetchShopError: Throwable? = null
    var createShopError: Throwable? = null
    var setShopOpenError: Throwable? = null
    var setServiceActiveError: Throwable? = null
    var setBarberActiveError: Throwable? = null

    val setOpenCalls = mutableListOf<Boolean>()
    var nextId = 1

    override suspend fun fetchOwnShop(ownerId: String): OwnShop? {
        fetchShopError?.let { throw it }
        return shop
    }

    override suspend fun createShop(ownerId: String, name: String, address: String, coordinates: Coordinates?): OwnShop {
        createShopError?.let { throw it }
        require(name.isNotBlank()) { "Shop name is required." }
        val created = OwnShop(id = "shop-${nextId++}", ownerId = ownerId, name = name.trim(), address = address.ifBlank { null })
        shop = created
        return created
    }

    override suspend fun updateShopProfile(shopId: String, name: String, address: String, coordinates: Coordinates?) {
        shop = shop?.copy(name = name.trim(), address = address.trim().ifBlank { null })
    }

    override suspend fun setShopOpen(shopId: String, isOpen: Boolean) {
        setOpenCalls += isOpen
        setShopOpenError?.let { throw it }
        shop = shop?.copy(isOpen = isOpen)
    }

    override suspend fun updateOpeningHours(shopId: String, hours: Map<DayKey, DayHours>) {
        // Not exercised by current tests beyond the pure validateOpeningHours() coverage.
    }

    override suspend fun fetchOwnServices(shopId: String): List<OwnService> = services.filter { it.shopId == shopId }

    override suspend fun createService(shopId: String, input: ServiceFormInput): OwnService {
        val parsed = parseServiceInput(input)
        val created = OwnService(
            id = "service-${nextId++}",
            shopId = shopId,
            name = parsed.name,
            price = parsed.priceCentsOrPaise,
            durationMin = parsed.durationMin,
        )
        services.add(created)
        return created
    }

    override suspend fun updateService(serviceId: String, input: ServiceFormInput) {
        val parsed = parseServiceInput(input)
        val index = services.indexOfFirst { it.id == serviceId }
        services[index] = services[index].copy(name = parsed.name, price = parsed.priceCentsOrPaise, durationMin = parsed.durationMin)
    }

    override suspend fun setServiceActive(serviceId: String, isActive: Boolean) {
        setServiceActiveError?.let { throw it }
        val index = services.indexOfFirst { it.id == serviceId }
        services[index] = services[index].copy(isActive = isActive)
    }

    override suspend fun fetchOwnBarbers(shopId: String): List<OwnBarber> = barbers.filter { it.shopId == shopId }

    override suspend fun createBarber(shopId: String, name: String): OwnBarber {
        require(name.isNotBlank()) { "Barber name is required." }
        val created = OwnBarber(id = "barber-${nextId++}", shopId = shopId, name = name.trim())
        barbers.add(created)
        return created
    }

    override suspend fun updateBarber(barberId: String, name: String) {
        require(name.isNotBlank()) { "Barber name is required." }
        val index = barbers.indexOfFirst { it.id == barberId }
        barbers[index] = barbers[index].copy(name = name.trim())
    }

    override suspend fun setBarberActive(barberId: String, isActive: Boolean) {
        setBarberActiveError?.let { throw it }
        val index = barbers.indexOfFirst { it.id == barberId }
        barbers[index] = barbers[index].copy(isActive = isActive)
    }
}
