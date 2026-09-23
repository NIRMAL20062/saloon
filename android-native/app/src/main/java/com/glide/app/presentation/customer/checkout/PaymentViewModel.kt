package com.glide.app.presentation.customer.checkout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.glide.app.core.payments.PaymentResultBus
import com.glide.app.domain.model.PaymentCheckoutResult
import com.glide.app.domain.model.PaymentOrder
import com.glide.app.domain.repository.PaymentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PaymentUiState(
    val isLoading: Boolean = true,
    val order: PaymentOrder? = null,
    val error: String? = null,
    /** Checkout finished (success or failure) — the screen should go check the real booking status. */
    val checkoutFinished: Boolean = false,
)

@HiltViewModel
class PaymentViewModel @Inject constructor(
    private val paymentRepository: PaymentRepository,
    private val paymentResultBus: PaymentResultBus,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState: StateFlow<PaymentUiState> = _uiState.asStateFlow()

    private var loadedBookingId: String? = null

    init {
        viewModelScope.launch {
            paymentResultBus.results.collect { result ->
                // Success or failure both just mean "checkout is done" — the client-side result
                // is a UI hint only. It never sets the booking to confirmed itself.
                when (result) {
                    is PaymentCheckoutResult.Success -> _uiState.value = _uiState.value.copy(checkoutFinished = true)
                    is PaymentCheckoutResult.Failed -> _uiState.value = _uiState.value.copy(
                        checkoutFinished = true,
                        error = result.message,
                    )
                }
            }
        }
    }

    fun load(bookingId: String) {
        if (loadedBookingId == bookingId) return
        loadedBookingId = bookingId
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            runCatching { paymentRepository.createPaymentOrder(bookingId) }
                .onSuccess { order -> _uiState.value = _uiState.value.copy(isLoading = false, order = order) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Could not start payment") }
        }
    }
}
