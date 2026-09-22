package com.glide.app.core.payments

import com.glide.app.domain.model.PaymentCheckoutResult
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The Razorpay Android SDK delivers its payment result to the launching Activity
 * (PaymentResultWithDataListener), not to whatever Composable/ViewModel is on screen — this
 * bus bridges that gap so MainActivity can stay a thin shell and PaymentViewModel can react
 * without either one holding a reference to the other.
 */
@Singleton
class PaymentResultBus @Inject constructor() {
    private val _results = MutableSharedFlow<PaymentCheckoutResult>(extraBufferCapacity = 1)
    val results: SharedFlow<PaymentCheckoutResult> = _results.asSharedFlow()

    fun emit(result: PaymentCheckoutResult) {
        _results.tryEmit(result)
    }
}
