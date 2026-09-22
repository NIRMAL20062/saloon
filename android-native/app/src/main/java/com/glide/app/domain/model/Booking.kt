package com.glide.app.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Mirrors public.bookings exactly (supabase/migrations/0008_slot_booking.sql +
 * 0012_payments.sql). Only the Razorpay webhook can ever set status to CONFIRMED —
 * accept_booking moves it to PAYMENT_PENDING, never straight to CONFIRMED.
 */
@Serializable
enum class BookingStatus {
    @SerialName("draft") DRAFT,
    @SerialName("awaiting_shop") AWAITING_SHOP,
    @SerialName("payment_pending") PAYMENT_PENDING,
    @SerialName("confirmed") CONFIRMED,
    @SerialName("rejected") REJECTED,
    @SerialName("expired") EXPIRED,
}

@Serializable
data class Booking(
    val id: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("shop_id") val shopId: String,
    @SerialName("barber_id") val barberId: String,
    val status: BookingStatus,
    @SerialName("scheduled_at") val scheduledAt: String,
    @SerialName("ends_at") val endsAt: String,
    @SerialName("service_amount") val serviceAmount: Long,
    @SerialName("total_amount") val totalAmount: Long,
    @SerialName("slot_hold_expires_at") val slotHoldExpiresAt: String? = null,
    @SerialName("shop_response_expires_at") val shopResponseExpiresAt: String? = null,
    @SerialName("payment_status") val paymentStatus: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("confirmed_at") val confirmedAt: String? = null,
)

/** public.barber_busy_windows — no customer_id/shop_id/service info by design (privacy-safe view). */
@Serializable
data class BusyWindow(
    @SerialName("barber_id") val barberId: String,
    @SerialName("scheduled_at") val scheduledAt: String,
    @SerialName("ends_at") val endsAt: String,
)
