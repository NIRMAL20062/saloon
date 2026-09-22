package com.glide.app.data.repository

import com.glide.app.core.location.Coordinates
import com.glide.app.domain.model.DayHours
import com.glide.app.domain.model.DayKey
import com.glide.app.domain.model.OwnBarber
import com.glide.app.domain.model.OwnService
import com.glide.app.domain.model.OwnShop
import com.glide.app.domain.model.ParsedService
import com.glide.app.domain.model.ServiceFormInput
import com.glide.app.domain.model.parseServiceInput
import com.glide.app.domain.model.validateOpeningHours
import com.glide.app.domain.repository.PartnerRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
private data class ShopInsert(
    @SerialName("owner_id") val ownerId: String,
    val name: String,
    val address: String?,
    val lat: Double?,
    val lng: Double?,
)

@Serializable
private data class ShopProfileUpdate(val name: String, val address: String?, val lat: Double?, val lng: Double?)

@Serializable
private data class ShopOpenUpdate(@SerialName("is_open") val isOpen: Boolean)

@Serializable
private data class OpeningHoursUpdate(@SerialName("opening_hours") val openingHours: kotlinx.serialization.json.JsonObject)

@Serializable
private data class ServiceUpsert(val name: String, val price: Long, @SerialName("duration_min") val durationMin: Int)

@Serializable
private data class ServiceInsert(
    @SerialName("shop_id") val shopId: String,
    val name: String,
    val price: Long,
    @SerialName("duration_min") val durationMin: Int,
)

@Serializable
private data class ActiveUpdate(@SerialName("is_active") val isActive: Boolean)

@Serializable
private data class BarberInsert(@SerialName("shop_id") val shopId: String, val name: String)

@Serializable
private data class BarberNameUpdate(val name: String)

/** Mirrors features/shops/partner-api.ts exactly — same columns, same owner-scoped RLS reliance. */
@Singleton
class SupabasePartnerRepository @Inject constructor(
    private val supabase: SupabaseClient,
) : PartnerRepository {

    override suspend fun fetchOwnShop(ownerId: String): OwnShop? =
        supabase.postgrest.from("shops")
            .select {
                filter { eq("owner_id", ownerId) }
                order("created_at", Order.ASCENDING)
                limit(1L)
            }
            .decodeSingleOrNull<OwnShop>()

    override suspend fun createShop(ownerId: String, name: String, address: String, coordinates: Coordinates?): OwnShop =
        supabase.postgrest.from("shops")
            .insert(
                ShopInsert(
                    ownerId = ownerId,
                    name = name.trim(),
                    address = address.trim().ifBlank { null },
                    lat = coordinates?.lat,
                    lng = coordinates?.lng,
                ),
            ) { select() }
            .decodeSingle<OwnShop>()

    override suspend fun updateShopProfile(shopId: String, name: String, address: String, coordinates: Coordinates?) {
        supabase.postgrest.from("shops").update(
            ShopProfileUpdate(
                name = name.trim(),
                address = address.trim().ifBlank { null },
                lat = coordinates?.lat,
                lng = coordinates?.lng,
            ),
        ) {
            filter { eq("id", shopId) }
        }
    }

    override suspend fun setShopOpen(shopId: String, isOpen: Boolean) {
        supabase.postgrest.from("shops").update(ShopOpenUpdate(isOpen)) {
            filter { eq("id", shopId) }
        }
    }

    override suspend fun updateOpeningHours(shopId: String, hours: Map<DayKey, DayHours>) {
        val errors = validateOpeningHours(hours)
        require(errors.isEmpty()) { "Fix the highlighted opening hours before saving." }

        val json = buildJsonObject {
            hours.forEach { (day, dh) ->
                putJsonObject(day.key) {
                    put("closed", dh.closed)
                    put("open", dh.open)
                    put("close", dh.close)
                }
            }
        }
        supabase.postgrest.from("shops").update(OpeningHoursUpdate(json)) {
            filter { eq("id", shopId) }
        }
    }

    override suspend fun fetchOwnServices(shopId: String): List<OwnService> =
        supabase.postgrest.from("services")
            .select {
                filter { eq("shop_id", shopId) }
                order("created_at", Order.ASCENDING)
            }
            .decodeList<OwnService>()

    override suspend fun createService(shopId: String, input: ServiceFormInput): OwnService {
        val parsed: ParsedService = parseServiceInput(input)
        return supabase.postgrest.from("services")
            .insert(
                ServiceInsert(shopId = shopId, name = parsed.name, price = parsed.priceCentsOrPaise, durationMin = parsed.durationMin),
            ) { select() }
            .decodeSingle<OwnService>()
    }

    override suspend fun updateService(serviceId: String, input: ServiceFormInput) {
        val parsed = parseServiceInput(input)
        supabase.postgrest.from("services").update(
            ServiceUpsert(name = parsed.name, price = parsed.priceCentsOrPaise, durationMin = parsed.durationMin),
        ) {
            filter { eq("id", serviceId) }
        }
    }

    override suspend fun setServiceActive(serviceId: String, isActive: Boolean) {
        supabase.postgrest.from("services").update(ActiveUpdate(isActive)) {
            filter { eq("id", serviceId) }
        }
    }

    override suspend fun fetchOwnBarbers(shopId: String): List<OwnBarber> =
        supabase.postgrest.from("barbers")
            .select {
                filter { eq("shop_id", shopId) }
                order("created_at", Order.ASCENDING)
            }
            .decodeList<OwnBarber>()

    override suspend fun createBarber(shopId: String, name: String): OwnBarber {
        val trimmed = name.trim()
        require(trimmed.isNotEmpty()) { "Barber name is required." }
        return supabase.postgrest.from("barbers")
            .insert(BarberInsert(shopId = shopId, name = trimmed)) { select() }
            .decodeSingle<OwnBarber>()
    }

    override suspend fun updateBarber(barberId: String, name: String) {
        val trimmed = name.trim()
        require(trimmed.isNotEmpty()) { "Barber name is required." }
        supabase.postgrest.from("barbers").update(BarberNameUpdate(trimmed)) {
            filter { eq("id", barberId) }
        }
    }

    override suspend fun setBarberActive(barberId: String, isActive: Boolean) {
        supabase.postgrest.from("barbers").update(ActiveUpdate(isActive)) {
            filter { eq("id", barberId) }
        }
    }
}
