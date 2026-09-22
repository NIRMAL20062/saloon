package com.glide.app.presentation.partner.queue

import com.glide.app.data.repository.FakeBookingRepository
import com.glide.app.domain.model.Booking
import com.glide.app.domain.model.BookingStatus
import com.glide.app.testutil.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class RequestQueueViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private fun booking(id: String, status: BookingStatus) = Booking(
        id = id,
        customerId = "customer-1",
        shopId = "shop-1",
        barberId = "barber-1",
        status = status,
        scheduledAt = "2026-01-01T10:00:00Z",
        endsAt = "2026-01-01T10:30:00Z",
        serviceAmount = 20000,
        totalAmount = 20000,
        shopResponseExpiresAt = "2026-01-01T09:01:40Z",
    )

    @Test
    fun `only shows awaiting_shop bookings, not confirmed or rejected ones`() = runTest {
        val repo = FakeBookingRepository().apply {
            shopBookingsToReturn = mutableListOf(
                booking("b1", BookingStatus.AWAITING_SHOP),
                booking("b2", BookingStatus.CONFIRMED),
                booking("b3", BookingStatus.AWAITING_SHOP),
            )
        }
        val viewModel = RequestQueueViewModel(repo)

        viewModel.refresh("shop-1")

        assertEquals(listOf("b1", "b3"), viewModel.uiState.value.bookings.map { it.id })
    }

    @Test
    fun `accepting a booking refreshes the list afterward`() = runTest {
        val repo = FakeBookingRepository().apply {
            shopBookingsToReturn = mutableListOf(booking("b1", BookingStatus.AWAITING_SHOP))
        }
        val viewModel = RequestQueueViewModel(repo)
        viewModel.refresh("shop-1")

        viewModel.accept("shop-1", "b1")

        assertEquals(listOf("b1"), repo.acceptedIds)
    }

    @Test
    fun `a failed accept surfaces an action error without crashing`() = runTest {
        val repo = FakeBookingRepository().apply {
            shopBookingsToReturn = mutableListOf(booking("b1", BookingStatus.AWAITING_SHOP))
            acceptBookingError = IllegalStateException("This booking can no longer be accepted (already resolved, expired, or not yours).")
        }
        val viewModel = RequestQueueViewModel(repo)
        viewModel.refresh("shop-1")

        viewModel.accept("shop-1", "b1")

        assertTrue(viewModel.uiState.value.actionError?.contains("no longer be accepted") == true)
    }

    @Test
    fun `rejecting delegates to the repository`() = runTest {
        val repo = FakeBookingRepository().apply {
            shopBookingsToReturn = mutableListOf(booking("b1", BookingStatus.AWAITING_SHOP))
        }
        val viewModel = RequestQueueViewModel(repo)
        viewModel.refresh("shop-1")

        viewModel.reject("shop-1", "b1")

        assertEquals(listOf("b1"), repo.rejectedIds)
    }
}
