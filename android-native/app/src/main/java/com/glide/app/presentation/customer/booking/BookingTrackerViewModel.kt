package com.glide.app.presentation.customer.booking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.glide.app.domain.model.Booking
import com.glide.app.domain.repository.AuthRepository
import com.glide.app.domain.repository.BookingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BookingTrackerUiState(
    val isLoading: Boolean = true,
    val booking: Booking? = null,
    val error: String? = null,
)

/**
 * Manual-refresh only for now — Realtime push updates are Phase 8. Until then, this is
 * "pull to see if the shop responded yet," not a live countdown.
 */
@HiltViewModel
class BookingTrackerViewModel @Inject constructor(
    private val bookingRepository: BookingRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BookingTrackerUiState())
    val uiState: StateFlow<BookingTrackerUiState> = _uiState.asStateFlow()

    fun refresh(bookingId: String) {
        val customerId = authRepository.currentUserId() ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            runCatching { bookingRepository.fetchCustomerBookings(customerId) }
                .onSuccess { bookings ->
                    val booking = bookings.firstOrNull { it.id == bookingId }
                    _uiState.value = _uiState.value.copy(isLoading = false, booking = booking)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Could not load booking")
                }
        }
    }
}
