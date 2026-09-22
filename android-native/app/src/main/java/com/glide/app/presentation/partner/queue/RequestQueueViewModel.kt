package com.glide.app.presentation.partner.queue

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.glide.app.domain.model.Booking
import com.glide.app.domain.model.BookingStatus
import com.glide.app.domain.repository.BookingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RequestQueueUiState(
    val isLoading: Boolean = true,
    val bookings: List<Booking> = emptyList(),
    val error: String? = null,
    val actionError: String? = null,
)

/** Manual-refresh only for now — live push on a new request is Phase 8 (Realtime + FCM). */
@HiltViewModel
class RequestQueueViewModel @Inject constructor(
    private val bookingRepository: BookingRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RequestQueueUiState())
    val uiState: StateFlow<RequestQueueUiState> = _uiState.asStateFlow()

    fun refresh(shopId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            runCatching { bookingRepository.fetchShopBookings(shopId) }
                .onSuccess { bookings ->
                    val awaiting = bookings.filter { it.status == BookingStatus.AWAITING_SHOP }
                    _uiState.value = _uiState.value.copy(isLoading = false, bookings = awaiting)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Could not load requests")
                }
        }
    }

    fun accept(shopId: String, bookingId: String) {
        viewModelScope.launch {
            runCatching { bookingRepository.acceptBooking(bookingId) }
                .onSuccess { refresh(shopId) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(actionError = e.message ?: "Could not accept — it may already be resolved") }
        }
    }

    fun reject(shopId: String, bookingId: String) {
        viewModelScope.launch {
            runCatching { bookingRepository.rejectBooking(bookingId) }
                .onSuccess { refresh(shopId) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(actionError = e.message ?: "Could not reject — it may already be resolved") }
        }
    }
}
