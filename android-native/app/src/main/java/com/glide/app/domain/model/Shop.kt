package com.glide.app.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

/** Mirrors features/shops/api.ts's `Shop` shape and column list exactly. */
@Serializable
data class Shop(
    val id: String,
    val name: String,
    val address: String? = null,
    @SerialName("is_open") val isOpen: Boolean = false,
    val lat: Double? = null,
    val lng: Double? = null,
    @SerialName("opening_hours") val openingHoursRaw: JsonObject = JsonObject(emptyMap()),
)

@Serializable
data class Service(
    val id: String,
    @SerialName("shop_id") val shopId: String,
    val name: String,
    /** Integer paise — see docs/CLAUDE.md Section 10. Never a floating-point rupee value. */
    val price: Long,
    @SerialName("duration_min") val durationMin: Int,
)

@Serializable
data class Barber(
    val id: String,
    @SerialName("shop_id") val shopId: String,
    val name: String,
)

data class ShopDetail(
    val shop: Shop,
    val services: List<Service>,
    val barbers: List<Barber>,
)

enum class DayKey(val key: String) {
    MON("mon"), TUE("tue"), WED("wed"), THU("thu"), FRI("fri"), SAT("sat"), SUN("sun"),
}

data class DayHours(val closed: Boolean, val open: String, val close: String)

/**
 * `shops.opening_hours` defaults to `{}` in the schema — mirrors withOpeningHoursDefaults() in
 * features/shops/partner-api.ts. Shared by both `Shop` (customer-facing) and `OwnShop`
 * (partner-facing) — same column, same shape, two different query column lists.
 */
fun parseOpeningHours(raw: JsonObject): Map<DayKey, DayHours> {
    val default = DayHours(closed = false, open = "09:00", close = "20:00")
    return DayKey.entries.associateWith { day ->
        val entry = raw[day.key] as? JsonObject
        DayHours(
            closed = entry?.get("closed")?.jsonPrimitive?.booleanOrNull ?: default.closed,
            open = entry?.get("open")?.jsonPrimitive?.contentOrNull ?: default.open,
            close = entry?.get("close")?.jsonPrimitive?.contentOrNull ?: default.close,
        )
    }
}

fun Shop.openingHours(): Map<DayKey, DayHours> = parseOpeningHours(openingHoursRaw)
