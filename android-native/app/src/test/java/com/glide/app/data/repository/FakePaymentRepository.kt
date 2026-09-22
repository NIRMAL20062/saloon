package com.glide.app.data.repository

import com.glide.app.domain.model.PaymentOrder
import com.glide.app.domain.repository.PaymentRepository

class FakePaymentRepository : PaymentRepository {
    var createOrderError: Throwable? = null
    var orderToReturn: PaymentOrder = PaymentOrder(orderId = "order_1", amount = 20000, keyId = "rzp_test_key")
    val requestedBookingIds = mutableListOf<String>()

    override suspend fun createPaymentOrder(bookingId: String): PaymentOrder {
        createOrderError?.let { throw it }
        requestedBookingIds += bookingId
        return orderToReturn
    }
}
