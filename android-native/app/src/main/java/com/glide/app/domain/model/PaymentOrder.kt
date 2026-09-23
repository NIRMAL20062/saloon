package com.glide.app.domain.model

import kotlinx.serialization.Serializable

/** What create-payment-order returns — everything the native Razorpay Checkout SDK needs. */
@Serializable
data class PaymentOrder(
    val orderId: String,
    val amount: Long,
    val keyId: String,
)

/**
 * The Razorpay Android SDK's success/error callbacks live on the launching Activity
 * (PaymentResultWithDataListener) — this is a UI hint only, never a source of truth. The real
 * confirmation is razorpay-webhook flipping the booking to CONFIRMED server-side; this type
 * only tells the screen "checkout finished, go refresh the real booking status."
 */
sealed interface PaymentCheckoutResult {
    data class Success(val razorpayPaymentId: String) : PaymentCheckoutResult
    data class Failed(val code: Int, val message: String?) : PaymentCheckoutResult
}
