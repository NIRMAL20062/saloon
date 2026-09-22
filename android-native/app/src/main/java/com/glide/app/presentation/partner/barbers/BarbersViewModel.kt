package com.glide.app.presentation.partner.barbers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.glide.app.domain.model.OwnBarber
import com.glide.app.domain.repository.PartnerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BarbersUiState(
    val barbers: List<OwnBarber> = emptyList(),
    val isLoading: Boolean = true,
    val nameInput: String = "",
    val editingBarberId: String? = null,
    val submitError: String? = null,
)

@HiltViewModel
class BarbersViewModel @Inject constructor(
    private val partnerRepository: PartnerRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BarbersUiState())
    val uiState: StateFlow<BarbersUiState> = _uiState.asStateFlow()

    private var loadedShopId: String? = null

    fun load(shopId: String) {
        if (loadedShopId == shopId) return
        loadedShopId = shopId
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            runCatching { partnerRepository.fetchOwnBarbers(shopId) }
                .onSuccess { barbers -> _uiState.value = _uiState.value.copy(barbers = barbers, isLoading = false) }
                .onFailure { _uiState.value = _uiState.value.copy(isLoading = false) }
        }
    }

    fun onNameChanged(name: String) {
        _uiState.value = _uiState.value.copy(nameInput = name, submitError = null)
    }

    fun startEditing(barber: OwnBarber?) {
        _uiState.value = _uiState.value.copy(
            editingBarberId = barber?.id,
            nameInput = barber?.name.orEmpty(),
            submitError = null,
        )
    }

    fun submit(shopId: String) {
        val state = _uiState.value
        viewModelScope.launch {
            val result = if (state.editingBarberId == null) {
                runCatching { partnerRepository.createBarber(shopId, state.nameInput) }
            } else {
                runCatching { partnerRepository.updateBarber(state.editingBarberId, state.nameInput) }
            }
            result
                .onSuccess {
                    _uiState.value = _uiState.value.copy(editingBarberId = null, nameInput = "")
                    loadedShopId = null
                    load(shopId)
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(submitError = e.message ?: "Could not save barber") }
        }
    }

    fun setActive(barberId: String, isActive: Boolean) {
        val previous = _uiState.value.barbers
        _uiState.value = _uiState.value.copy(
            barbers = previous.map { if (it.id == barberId) it.copy(isActive = isActive) else it },
        )
        viewModelScope.launch {
            runCatching { partnerRepository.setBarberActive(barberId, isActive) }
                .onFailure { _uiState.value = _uiState.value.copy(barbers = previous) }
        }
    }
}
