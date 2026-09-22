package com.glide.app.presentation.customer.explore

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.glide.app.core.location.Coordinates
import com.glide.app.core.location.LocationTracker
import com.glide.app.core.location.distanceKm
import com.glide.app.domain.model.Shop
import com.glide.app.domain.repository.ShopRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ShopListItem(val shop: Shop, val distanceKm: Double? = null)

data class ExploreUiState(
    val items: List<ShopListItem> = emptyList(),
    val search: String = "",
    val isLoading: Boolean = true,
    val sortedByDistance: Boolean = false,
    val showLocationBanner: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class ExploreViewModel @Inject constructor(
    private val shopRepository: ShopRepository,
    private val locationTracker: LocationTracker,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ExploreUiState())
    val uiState: StateFlow<ExploreUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch { loadShops() }
    }

    fun onSearchChanged(query: String) {
        _uiState.value = _uiState.value.copy(search = query)
        viewModelScope.launch { loadShops() }
    }

    /** Called once by the screen after checking the OS permission state (no cold prompt). */
    fun onScreenReady(hasPermissionAlready: Boolean) {
        if (hasPermissionAlready) {
            viewModelScope.launch { applyLocationSort() }
        } else {
            _uiState.value = _uiState.value.copy(showLocationBanner = true)
        }
    }

    fun onLocationPermissionResult(granted: Boolean) {
        if (!granted) {
            _uiState.value = _uiState.value.copy(showLocationBanner = true)
            return
        }
        viewModelScope.launch { applyLocationSort() }
    }

    private suspend fun loadShops() {
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)
        runCatching { shopRepository.fetchShops(_uiState.value.search) }
            .onSuccess { shops ->
                _uiState.value = _uiState.value.copy(
                    items = shops.map { ShopListItem(it) },
                    isLoading = false,
                    sortedByDistance = false,
                )
            }
            .onFailure { e ->
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Could not load shops")
            }
    }

    private suspend fun applyLocationSort() {
        val here = locationTracker.getCurrentCoordinates()
        if (here == null) {
            _uiState.value = _uiState.value.copy(showLocationBanner = true)
            return
        }
        val sorted = _uiState.value.items
            .map { item -> item.copy(distanceKm = item.shop.coordinatesOrNull()?.let { distanceKm(here, it) }) }
            .sortedWith(compareBy(nullsLast<Double>()) { it.distanceKm })
        _uiState.value = _uiState.value.copy(items = sorted, sortedByDistance = true, showLocationBanner = false)
    }

    private fun Shop.coordinatesOrNull(): Coordinates? {
        val shopLat = lat ?: return null
        val shopLng = lng ?: return null
        return Coordinates(shopLat, shopLng)
    }
}
