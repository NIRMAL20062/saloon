package com.glide.app.data.repository

import com.glide.app.domain.model.Booking
import com.glide.app.domain.model.BusyWindow
import com.glide.app.domain.repository.BookingRepository

class FakeBookingRepository : BookingRepository {
    var createBookingError: Throwable? = null
    var acceptBookingError: Throwable? = null
    var rejectBookingError: Throwable? = null
    var busyWindowsToReturn: List<BusyWindow> = emptyList()
    var customerBookingsToReturn: MutableList<Booking> = mutableListOf()
    var shopBookingsToReturn: MutableList<Booking> = mutableListOf()
    var nextBookingId = "booking-1"

    val createCalls = mutableListOf<Triple<String, String, List<String>>>()
    val acceptedIds = mutableListOf<String>()
    val rejectedIds = mutableListOf<String>()

    override suspend fun createBooking(shopId: String, barberId: String, serviceIds: List<String>, scheduledAtIso: String): Booking {
        createBookingError?.let { throw it }
        createCalls += Triple(shopId, barberId, serviceIds)
        val booking = Booking(
            id = nextBookingId,
            customerId = "customer-1",
            shopId = shopId,
            barberId = barberId,
            status = com.glide.app.domain.model.BookingStatus.AWAITING_SHOP,
            scheduledAt = scheduledAtIso,
            endsAt = scheduledAtIso,
            serviceAmount = 10000,
            totalAmount = 10000,
        )
        customerBookingsToReturn.add(booking)
        return booking
    }

    override suspend fun acceptBooking(bookingId: String): Booking {
        acceptBookingError?.let { throw it }
        acceptedIds += bookingId
        return shopBookingsToReturn.first { it.id == bookingId }.copy(status = com.glide.app.domain.model.BookingStatus.PAYMENT_PENDING)
    }

    override suspend fun rejectBooking(bookingId: String, note: String?): Booking {
        rejectBookingError?.let { throw it }
        rejectedIds += bookingId
        return shopBookingsToReturn.first { it.id == bookingId }.copy(status = com.glide.app.domain.model.BookingStatus.REJECTED)
    }

    override suspend fun fetchCustomerBookings(customerId: String): List<Booking> = customerBookingsToReturn

    override suspend fun fetchShopBookings(shopId: String): List<Booking> = shopBookingsToReturn

    override suspend fun fetchBusyWindows(barberId: String): List<BusyWindow> = busyWindowsToReturn
}
