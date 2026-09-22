package com.glide.app.presentation.partner.catalog

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.glide.app.domain.model.OwnService
import com.glide.app.domain.model.ServiceFieldErrors
import com.glide.app.domain.model.ServiceFormInput
import com.glide.app.domain.model.validateServiceInput
import com.glide.app.domain.repository.PartnerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ServicesUiState(
    val services: List<OwnService> = emptyList(),
    val isLoading: Boolean = true,
    val form: ServiceFormInput = ServiceFormInput("", "", ""),
    val fieldErrors: ServiceFieldErrors = ServiceFieldErrors(),
    val editingServiceId: String? = null,
    val submitError: String? = null,
)

@HiltViewModel
class ServicesViewModel @Inject constructor(
    private val partnerRepository: PartnerRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ServicesUiState())
    val uiState: StateFlow<ServicesUiState> = _uiState.asStateFlow()

    private var loadedShopId: String? = null

    fun load(shopId: String) {
        if (loadedShopId == shopId) return
        loadedShopId = shopId
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            runCatching { partnerRepository.fetchOwnServices(shopId) }
                .onSuccess { services -> _uiState.value = _uiState.value.copy(services = services, isLoading = false) }
                .onFailure { _uiState.value = _uiState.value.copy(isLoading = false) }
        }
    }

    fun onFormChanged(form: ServiceFormInput) {
        _uiState.value = _uiState.value.copy(form = form, fieldErrors = validateServiceInput(form), submitError = null)
    }

    fun startEditing(service: OwnService?) {
        _uiState.value = _uiState.value.copy(
            editingServiceId = service?.id,
            form = if (service == null) {
                ServiceFormInput("", "", "")
            } else {
                ServiceFormInput(service.name, (service.price / 100.0).toString(), service.durationMin.toString())
            },
            fieldErrors = ServiceFieldErrors(),
            submitError = null,
        )
    }

    fun submit(shopId: String) {
        val state = _uiState.value
        viewModelScope.launch {
            val result = if (state.editingServiceId == null) {
                runCatching { partnerRepository.createService(shopId, state.form) }
            } else {
                runCatching { partnerRepository.updateService(state.editingServiceId, state.form) }
            }
            result
                .onSuccess {
                    _uiState.value = _uiState.value.copy(editingServiceId = null, form = ServiceFormInput("", "", ""))
                    loadedShopId = null
                    load(shopId)
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(submitError = e.message ?: "Could not save service") }
        }
    }

    /** The "delete" a partner actually gets — migration 0004 has no DELETE policy on purpose. */
    fun setActive(serviceId: String, isActive: Boolean) {
        val previous = _uiState.value.services
        _uiState.value = _uiState.value.copy(
            services = previous.map { if (it.id == serviceId) it.copy(isActive = isActive) else it },
        )
        viewModelScope.launch {
            runCatching { partnerRepository.setServiceActive(serviceId, isActive) }
                .onFailure { _uiState.value = _uiState.value.copy(services = previous) }
        }
    }
}
