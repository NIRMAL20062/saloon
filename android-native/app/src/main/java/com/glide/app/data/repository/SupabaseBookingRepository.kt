package com.glide.app.data.repository

import com.glide.app.domain.model.Booking
import com.glide.app.domain.model.BusyWindow
import com.glide.app.domain.repository.BookingRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
private data class CreateBookingRequest(
    @SerialName("shop_id") val shopId: String,
    @SerialName("barber_id") val barberId: String,
    @SerialName("service_ids") val serviceIds: List<String>,
    @SerialName("scheduled_at") val scheduledAt: String,
)

@Serializable
private data class AcceptRejectRequest(
    @SerialName("booking_id") val bookingId: String,
    val note: String? = null,
)

/** create-booking/accept-booking/reject-booking all respond with either {booking} or {error}. */
@Serializable
private data class BookingFunctionResponse(
    val booking: Booking? = null,
    val error: String? = null,
)

private val json = Json { ignoreUnknownKeys = true }

/**
 * Calls the existing, already-proven create-booking/accept-booking/reject-booking Edge
 * Functions — no new backend logic, this is purely a new client for endpoints that already
 * enforce collision-safety, ownership, and opening-hours validation server-side.
 */
@Singleton
class SupabaseBookingRepository @Inject constructor(
    private val supabase: SupabaseClient,
) : BookingRepository {

    override suspend fun createBooking(
        shopId: String,
        barberId: String,
        serviceIds: List<String>,
        scheduledAtIso: String,
    ): Booking {
        val response = supabase.functions.invoke("create-booking") {
            contentType(ContentType.Application.Json)
            setBody(
                json.encodeToString(
                    CreateBookingRequest.serializer(),
                    CreateBookingRequest(shopId, barberId, serviceIds, scheduledAtIso),
                ),
            )
        }
        return decodeBookingOrThrow(response)
    }

    override suspend fun acceptBooking(bookingId: String): Booking {
        val response = supabase.functions.invoke("accept-booking") {
            contentType(ContentType.Application.Json)
            setBody(json.encodeToString(AcceptRejectRequest.serializer(), AcceptRejectRequest(bookingId)))
        }
        return decodeBookingOrThrow(response)
    }

    override suspend fun rejectBooking(bookingId: String, note: String?): Booking {
        val response = supabase.functions.invoke("reject-booking") {
            contentType(ContentType.Application.Json)
            setBody(json.encodeToString(AcceptRejectRequest.serializer(), AcceptRejectRequest(bookingId, note)))
        }
        return decodeBookingOrThrow(response)
    }

    private suspend fun decodeBookingOrThrow(response: HttpResponse): Booking {
        val text = response.bodyAsText()
        val decoded = runCatching { json.decodeFromString(BookingFunctionResponse.serializer(), text) }.getOrNull()
        if (decoded?.error != null) throw IllegalStateException(decoded.error)
        return decoded?.booking ?: throw IllegalStateException("Unexpected response from server: $text")
    }

    override suspend fun fetchCustomerBookings(customerId: String): List<Booking> =
        supabase.postgrest.from("bookings")
            .select {
                filter { eq("customer_id", customerId) }
                order("created_at", Order.DESCENDING)
            }
            .decodeList<Booking>()

    override suspend fun fetchShopBookings(shopId: String): List<Booking> =
        supabase.postgrest.from("bookings")
            .select {
                filter { eq("shop_id", shopId) }
                order("created_at", Order.DESCENDING)
            }
            .decodeList<Booking>()

    override suspend fun fetchBusyWindows(barberId: String): List<BusyWindow> =
        supabase.postgrest.from("barber_busy_windows")
            .select {
                filter { eq("barber_id", barberId) }
            }
            .decodeList<BusyWindow>()
}
