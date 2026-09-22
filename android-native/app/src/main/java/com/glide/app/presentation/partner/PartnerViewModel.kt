package com.glide.app.presentation.partner

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.glide.app.core.location.LocationTracker
import com.glide.app.domain.model.DayHours
import com.glide.app.domain.model.DayKey
import com.glide.app.domain.model.OwnShop
import com.glide.app.domain.repository.AuthRepository
import com.glide.app.domain.repository.PartnerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface PartnerUiState {
    data object Loading : PartnerUiState
    data class NoShop(val isSaving: Boolean = false, val error: String? = null) : PartnerUiState
    data class Ready(val shop: OwnShop) : PartnerUiState
}

@HiltViewModel
class PartnerViewModel @Inject constructor(
    private val partnerRepository: PartnerRepository,
    private val authRepository: AuthRepository,
    private val locationTracker: LocationTracker,
) : ViewModel() {

    private val _uiState = MutableStateFlow<PartnerUiState>(PartnerUiState.Loading)
    val uiState: StateFlow<PartnerUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        val ownerId = authRepository.currentUserId() ?: return
        viewModelScope.launch {
            _uiState.value = PartnerUiState.Loading
            runCatching { partnerRepository.fetchOwnShop(ownerId) }
                .onSuccess { shop ->
                    _uiState.value = if (shop != null) PartnerUiState.Ready(shop) else PartnerUiState.NoShop()
                }
                .onFailure { e ->
                    _uiState.value = PartnerUiState.NoShop(error = e.message ?: "Could not load your shop")
                }
        }
    }

    fun createShop(name: String, address: String) {
        val ownerId = authRepository.currentUserId() ?: return
        if (name.isBlank()) {
            _uiState.value = PartnerUiState.NoShop(error = "Shop name is required.")
            return
        }
        _uiState.value = PartnerUiState.NoShop(isSaving = true)
        viewModelScope.launch {
            val coordinates = runCatching { locationTracker.getCurrentCoordinates() }.getOrNull()
            runCatching { partnerRepository.createShop(ownerId, name, address, coordinates) }
                .onSuccess { shop -> _uiState.value = PartnerUiState.Ready(shop) }
                .onFailure { e ->
                    _uiState.value = PartnerUiState.NoShop(error = e.message ?: "Could not create your shop")
                }
        }
    }

    private inline fun withReadyShop(action: (OwnShop) -> Unit) {
        (_uiState.value as? PartnerUiState.Ready)?.let { action(it.shop) }
    }

    fun updateProfile(name: String, address: String) = withReadyShop { shop ->
        viewModelScope.launch {
            val coordinates = runCatching { locationTracker.getCurrentCoordinates() }.getOrNull()
            runCatching { partnerRepository.updateShopProfile(shop.id, name, address, coordinates) }
                .onSuccess { refresh() }
        }
    }

    /** The one-tap emergency-pause toggle, applied optimistically like the Expo screen does. */
    fun setOpen(isOpen: Boolean) = withReadyShop { shop ->
        _uiState.value = PartnerUiState.Ready(shop.copy(isOpen = isOpen))
        viewModelScope.launch {
            runCatching { partnerRepository.setShopOpen(shop.id, isOpen) }
                .onFailure { _uiState.value = PartnerUiState.Ready(shop) } // revert on failure
        }
    }

    fun saveOpeningHours(hours: Map<DayKey, DayHours>) = withReadyShop { shop ->
        viewModelScope.launch {
            runCatching { partnerRepository.updateOpeningHours(shop.id, hours) }
                .onSuccess { refresh() }
        }
    }
}
