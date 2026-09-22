package com.glide.app.presentation.customer.checkout

import com.glide.app.core.payments.PaymentResultBus
import com.glide.app.data.repository.FakePaymentRepository
import com.glide.app.domain.model.PaymentCheckoutResult
import com.glide.app.testutil.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class PaymentViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `loading fetches an order for the given booking`() = runTest {
        val repo = FakePaymentRepository()
        val viewModel = PaymentViewModel(repo, PaymentResultBus())

        viewModel.load("booking-1")

        assertEquals(listOf("booking-1"), repo.requestedBookingIds)
        assertEquals("order_1", viewModel.uiState.value.order?.orderId)
        assertFalse(viewModel.uiState.value.isLoading)
    }

    @Test
    fun `a server error surfaces instead of an order`() = runTest {
        val repo = FakePaymentRepository().apply {
            createOrderError = IllegalStateException("This booking is not awaiting payment.")
        }
        val viewModel = PaymentViewModel(repo, PaymentResultBus())

        viewModel.load("booking-1")

        assertNull(viewModel.uiState.value.order)
        assertEquals("This booking is not awaiting payment.", viewModel.uiState.value.error)
    }

    @Test
    fun `a successful checkout result marks the flow finished without an error`() = runTest {
        val bus = PaymentResultBus()
        val viewModel = PaymentViewModel(FakePaymentRepository(), bus)

        bus.emit(PaymentCheckoutResult.Success("pay_123"))

        assertTrue(viewModel.uiState.value.checkoutFinished)
        assertNull(viewModel.uiState.value.error)
    }

    @Test
    fun `a failed checkout result marks the flow finished and surfaces the message`() = runTest {
        val bus = PaymentResultBus()
        val viewModel = PaymentViewModel(FakePaymentRepository(), bus)

        bus.emit(PaymentCheckoutResult.Failed(code = 2, message = "Payment cancelled"))

        assertTrue(viewModel.uiState.value.checkoutFinished)
        assertEquals("Payment cancelled", viewModel.uiState.value.error)
    }
}
