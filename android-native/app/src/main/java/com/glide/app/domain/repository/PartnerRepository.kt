package com.glide.app.domain.repository

import com.glide.app.core.location.Coordinates
import com.glide.app.domain.model.DayHours
import com.glide.app.domain.model.DayKey
import com.glide.app.domain.model.OwnBarber
import com.glide.app.domain.model.OwnService
import com.glide.app.domain.model.OwnShop
import com.glide.app.domain.model.ServiceFormInput

interface PartnerRepository {
    /** Migration 0003's owner-read policy — sees the row regardless of approval `status`. */
    suspend fun fetchOwnShop(ownerId: String): OwnShop?
    suspend fun createShop(ownerId: String, name: String, address: String, coordinates: Coordinates?): OwnShop
    suspend fun updateShopProfile(shopId: String, name: String, address: String, coordinates: Coordinates?)

    /** The one-tap emergency-pause toggle — separate from the profile form on purpose. */
    suspend fun setShopOpen(shopId: String, isOpen: Boolean)
    suspend fun updateOpeningHours(shopId: String, hours: Map<DayKey, DayHours>)

    suspend fun fetchOwnServices(shopId: String): List<OwnService>
    suspend fun createService(shopId: String, input: ServiceFormInput): OwnService
    suspend fun updateService(serviceId: String, input: ServiceFormInput)
    suspend fun setServiceActive(serviceId: String, isActive: Boolean)

    suspend fun fetchOwnBarbers(shopId: String): List<OwnBarber>
    suspend fun createBarber(shopId: String, name: String): OwnBarber
    suspend fun updateBarber(barberId: String, name: String)
    suspend fun setBarberActive(barberId: String, isActive: Boolean)
}
