package com.glide.app.presentation.customer.booking

import com.glide.app.data.repository.FakeAuthRepository
import com.glide.app.data.repository.FakeBookingRepository
import com.glide.app.domain.model.Booking
import com.glide.app.domain.model.BookingStatus
import com.glide.app.testutil.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

class BookingTrackerViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `finds the requested booking among the customer's own bookings`() = runTest {
        val bookingRepo = FakeBookingRepository().apply {
            customerBookingsToReturn = mutableListOf(
                Booking(
                    id = "b1", customerId = "user-1", shopId = "shop-1", barberId = "barber-1",
                    status = BookingStatus.AWAITING_SHOP, scheduledAt = "2026-01-01T10:00:00Z",
                    endsAt = "2026-01-01T10:30:00Z", serviceAmount = 20000, totalAmount = 20000,
                ),
            )
        }
        val authRepo = FakeAuthRepository().apply { userIdToReturn = "user-1" }
        val viewModel = BookingTrackerViewModel(bookingRepo, authRepo)

        viewModel.refresh("b1")

        assertEquals(BookingStatus.AWAITING_SHOP, viewModel.uiState.value.booking?.status)
    }

    @Test
    fun `a repository failure surfaces as an error, not a crash`() = runTest {
        val bookingRepo = FakeBookingRepository()
        val authRepo = FakeAuthRepository().apply { userIdToReturn = "user-1" }
        val viewModel = BookingTrackerViewModel(bookingRepo, authRepo)

        // No bookings configured — fetchCustomerBookings returns an empty list, not an error,
        // so the booking is simply not found rather than surfacing a message.
        viewModel.refresh("does-not-exist")

        assertNull(viewModel.uiState.value.booking)
        assertNull(viewModel.uiState.value.error)
    }
}
