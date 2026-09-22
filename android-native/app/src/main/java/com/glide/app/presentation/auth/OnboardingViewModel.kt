package com.glide.app.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.glide.app.data.repository.AuthRepository
import com.glide.app.domain.model.UserRole
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OnboardingUiState(
    val fullName: String = "",
    val role: UserRole = UserRole.CUSTOMER,
    val isLoading: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    fun onFullNameChanged(name: String) {
        _uiState.value = _uiState.value.copy(fullName = name, error = null)
    }

    fun onRoleSelected(role: UserRole) {
        _uiState.value = _uiState.value.copy(role = role)
    }

    fun submit(phone: String?, onComplete: (UserRole) -> Unit) {
        val name = _uiState.value.fullName.trim()
        if (name.isEmpty()) {
            _uiState.value = _uiState.value.copy(error = "Please enter your full name.")
            return
        }
        val userId = authRepository.currentUserId() ?: return
        val role = _uiState.value.role
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            runCatching { authRepository.createProfile(userId, phone, name, role) }
                .onSuccess {
                    _uiState.value = _uiState.value.copy(isLoading = false)
                    onComplete(role)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Could not save profile.")
                }
        }
    }
}
