package com.glide.app.domain.repository

import com.glide.app.domain.model.PaymentOrder

interface PaymentRepository {
    /**
     * Calls the existing create-payment-order Edge Function, which re-verifies ownership and
     * booking state server-side and computes the amount itself from bookings.total_amount —
     * never a client-supplied figure. Reuses an existing open order if the customer re-enters
     * checkout (e.g. after backgrounding mid-payment) rather than creating a new one each time.
     */
    suspend fun createPaymentOrder(bookingId: String): PaymentOrder
}
