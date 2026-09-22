package com.glide.app.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Mirrors features/shops/partner-api.ts's `OwnShop` exactly — same columns, owner-scoped. */
@Serializable
data class OwnShop(
    val id: String,
    @SerialName("owner_id") val ownerId: String,
    val name: String,
    val address: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val status: String = "pending",
    @SerialName("is_open") val isOpen: Boolean = false,
    @SerialName("opening_hours") val openingHoursRaw: kotlinx.serialization.json.JsonObject =
        kotlinx.serialization.json.JsonObject(emptyMap()),
)

fun OwnShop.openingHours(): Map<DayKey, DayHours> = parseOpeningHours(openingHoursRaw)

@Serializable
data class OwnService(
    val id: String,
    @SerialName("shop_id") val shopId: String,
    val name: String,
    val price: Long,
    @SerialName("duration_min") val durationMin: Int,
    @SerialName("is_active") val isActive: Boolean = true,
)

@Serializable
data class OwnBarber(
    val id: String,
    @SerialName("shop_id") val shopId: String,
    val name: String,
    @SerialName("is_active") val isActive: Boolean = true,
)

/** Raw form strings, not parsed numbers — validation happens in [parseServiceInput]. */
data class ServiceFormInput(
    val name: String,
    val priceRupees: String,
    val durationMin: String,
)

data class ServiceFieldErrors(
    val name: String? = null,
    val priceRupees: String? = null,
    val durationMin: String? = null,
) {
    val isEmpty: Boolean get() = name == null && priceRupees == null && durationMin == null
}

data class ParsedService(val name: String, val priceCentsOrPaise: Long, val durationMin: Int)

private const val MAX_DURATION_MIN = 480

/**
 * Client-side half of the price/duration validation — mirrors parseServiceInput() in
 * features/shops/partner-api.ts exactly, including the rupees→paise conversion. The database
 * CHECK constraints (migration 0001: price > 0, duration_min > 0; migration 0004: duration_min
 * <= 480) are what actually can't be bypassed; this just turns a typo into a clear message.
 */
fun parseServiceInput(input: ServiceFormInput): ParsedService {
    val name = input.name.trim()
    require(name.isNotEmpty()) { "Service name is required." }

    val priceRupees = input.priceRupees.toDoubleOrNull()
    val price = priceRupees?.let { Math.round(it * 100) }
    require(price != null && price > 0) { "Price must be a positive amount." }

    val durationMin = input.durationMin.toDoubleOrNull()?.let { Math.round(it).toInt() }
    require(durationMin != null && durationMin > 0) { "Duration must be a positive number of minutes." }
    require(durationMin <= MAX_DURATION_MIN) { "Duration can't be more than $MAX_DURATION_MIN minutes (8 hours)." }

    return ParsedService(name, price, durationMin)
}

/** Field-level validation for live feedback — mirrors validateServiceInput() exactly. */
fun validateServiceInput(input: ServiceFormInput): ServiceFieldErrors {
    var priceError: String? = null
    if (input.priceRupees.isNotBlank()) {
        val price = input.priceRupees.toDoubleOrNull()?.let { Math.round(it * 100) }
        if (price == null || price <= 0) priceError = "Enter a positive price."
    }

    var durationError: String? = null
    if (input.durationMin.isNotBlank()) {
        val duration = input.durationMin.toDoubleOrNull()?.let { Math.round(it).toInt() }
        if (duration == null || duration <= 0) {
            durationError = "Enter a positive number of minutes."
        } else if (duration > MAX_DURATION_MIN) {
            durationError = "Can't be more than $MAX_DURATION_MIN min (8 hours)."
        }
    }

    return ServiceFieldErrors(priceRupees = priceError, durationMin = durationError)
}

private val HHMM = Regex("^([01]\\d|2[0-3]):([0-5]\\d)$")

/** Mirrors validateOpeningHours() exactly — one message per invalid day. */
fun validateOpeningHours(hours: Map<DayKey, DayHours>): Map<DayKey, String> {
    val errors = mutableMapOf<DayKey, String>()
    for (day in DayKey.entries) {
        val (closed, open, close) = hours[day] ?: continue
        if (closed) continue
        if (!HHMM.matches(open) || !HHMM.matches(close)) {
            errors[day] = "Use 24-hour HH:MM, e.g. 09:00."
        } else if (open >= close) {
            errors[day] = "Opening time must be before closing time."
        }
    }
    return errors
}
