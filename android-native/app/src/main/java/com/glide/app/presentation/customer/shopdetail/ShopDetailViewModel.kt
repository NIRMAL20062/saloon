package com.glide.app.presentation.customer.shopdetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.glide.app.domain.model.Barber
import com.glide.app.domain.model.Service
import com.glide.app.domain.model.Shop
import com.glide.app.domain.model.SlotCandidate
import com.glide.app.domain.model.GLIDE_ZONE
import com.glide.app.domain.model.generateSlotCandidates
import com.glide.app.domain.model.openingHours
import com.glide.app.domain.model.toDayKey
import com.glide.app.domain.model.toIsoInstant
import com.glide.app.domain.repository.BookingRepository
import com.glide.app.domain.repository.ShopRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.LocalDate
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ShopDetailUiState(
    val isLoading: Boolean = true,
    val shop: Shop? = null,
    val services: List<Service> = emptyList(),
    val barbers: List<Barber> = emptyList(),
    val selectedServiceIds: Set<String> = emptySet(),
    val selectedBarberId: String? = null,
    val selectedDate: LocalDate = LocalDate.now(GLIDE_ZONE),
    val slots: List<SlotCandidate> = emptyList(),
    val selectedSlot: SlotCandidate? = null,
    val isBooking: Boolean = false,
    val error: String? = null,
    val createdBookingId: String? = null,
) {
    val totalPricePaise: Long get() = services.filter { it.id in selectedServiceIds }.sumOf { it.price }
    val totalDurationMin: Int get() = services.filter { it.id in selectedServiceIds }.sumOf { it.durationMin }
    val canRequestBooking: Boolean get() =
        selectedServiceIds.isNotEmpty() && selectedBarberId != null && selectedSlot?.available == true && !isBooking
}

@HiltViewModel
class ShopDetailViewModel @Inject constructor(
    private val shopRepository: ShopRepository,
    private val bookingRepository: BookingRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ShopDetailUiState())
    val uiState: StateFlow<ShopDetailUiState> = _uiState.asStateFlow()

    private var loadedShopId: String? = null

    fun load(shopId: String) {
        if (loadedShopId == shopId) return
        loadedShopId = shopId
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            runCatching { shopRepository.fetchShopDetail(shopId) }
                .onSuccess { detail ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        shop = detail.shop,
                        services = detail.services,
                        barbers = detail.barbers,
                    )
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Could not load shop")
                }
        }
    }

    fun toggleService(serviceId: String) {
        val current = _uiState.value.selectedServiceIds
        _uiState.value = _uiState.value.copy(
            selectedServiceIds = if (serviceId in current) current - serviceId else current + serviceId,
            selectedSlot = null,
        )
        refreshSlots()
    }

    fun selectBarber(barberId: String) {
        _uiState.value = _uiState.value.copy(selectedBarberId = barberId, selectedSlot = null)
        refreshSlots()
    }

    fun selectDate(date: LocalDate) {
        _uiState.value = _uiState.value.copy(selectedDate = date, selectedSlot = null)
        refreshSlots()
    }

    fun selectSlot(slot: SlotCandidate) {
        if (!slot.available) return
        _uiState.value = _uiState.value.copy(selectedSlot = slot)
    }

    private fun refreshSlots() {
        val state = _uiState.value
        val shop = state.shop ?: return
        val barberId = state.selectedBarberId
        if (barberId == null || state.totalDurationMin <= 0) {
            _uiState.value = _uiState.value.copy(slots = emptyList())
            return
        }
        viewModelScope.launch {
            val busyWindows = runCatching { bookingRepository.fetchBusyWindows(barberId) }.getOrDefault(emptyList())
            val dayHours = shop.openingHours()[state.selectedDate.toDayKey()]
            val slots = if (dayHours != null) {
                generateSlotCandidates(
                    date = state.selectedDate,
                    dayHours = dayHours,
                    totalDurationMin = state.totalDurationMin,
                    busyWindows = busyWindows.filter { it.barberId == barberId },
                )
            } else {
                emptyList()
            }
            _uiState.value = _uiState.value.copy(slots = slots)
        }
    }

    fun requestBooking() {
        val state = _uiState.value
        val shop = state.shop ?: return
        val barberId = state.selectedBarberId ?: return
        val slot = state.selectedSlot ?: return
        if (!state.canRequestBooking) return

        _uiState.value = _uiState.value.copy(isBooking = true, error = null)
        viewModelScope.launch {
            runCatching {
                bookingRepository.createBooking(
                    shopId = shop.id,
                    barberId = barberId,
                    serviceIds = state.selectedServiceIds.toList(),
                    scheduledAtIso = slot.toIsoInstant(),
                )
            }
                .onSuccess { booking ->
                    _uiState.value = _uiState.value.copy(isBooking = false, createdBookingId = booking.id)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(isBooking = false, error = e.message ?: "Could not create booking")
                }
        }
    }

    fun createdBookingHandled() {
        _uiState.value = _uiState.value.copy(createdBookingId = null)
    }
}
