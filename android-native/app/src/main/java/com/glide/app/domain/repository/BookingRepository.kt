package com.glide.app.domain.repository

import com.glide.app.domain.model.Booking
import com.glide.app.domain.model.BusyWindow

interface BookingRepository {
    /**
     * Calls the existing create-booking Edge Function — server re-validates everything
     * (shop open, barber active, services valid, opening hours, collision) and computes
     * the price itself. Throws with the server's own error message on failure (already
     * safe to show — see create-booking/index.ts's ERROR_STATUS mapping).
     */
    suspend fun createBooking(shopId: String, barberId: String, serviceIds: List<String>, scheduledAtIso: String): Booking

    /** Calls the existing accept-booking Edge Function. Moves the booking to PAYMENT_PENDING, never straight to CONFIRMED. */
    suspend fun acceptBooking(bookingId: String): Booking

    /** Calls the existing reject-booking Edge Function. */
    suspend fun rejectBooking(bookingId: String, note: String? = null): Booking

    /** RLS already scopes this to the caller's own bookings. */
    suspend fun fetchCustomerBookings(customerId: String): List<Booking>

    /** RLS already scopes this to the caller's own shop's bookings. */
    suspend fun fetchShopBookings(shopId: String): List<Booking>

    /** public.barber_busy_windows — privacy-safe view for the slot picker's grey-out logic. */
    suspend fun fetchBusyWindows(barberId: String): List<BusyWindow>
}
