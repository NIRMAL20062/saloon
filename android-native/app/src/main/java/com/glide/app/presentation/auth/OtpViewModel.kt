package com.glide.app.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.glide.app.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OtpUiState(
    val code: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class OtpViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OtpUiState())
    val uiState: StateFlow<OtpUiState> = _uiState.asStateFlow()

    fun onCodeChanged(code: String) {
        _uiState.value = _uiState.value.copy(code = code, error = null)
    }

    fun verify(phone: String) {
        val code = _uiState.value.code.trim()
        if (code.length < 4) {
            _uiState.value = _uiState.value.copy(error = "Enter the code you received")
            return
        }
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            runCatching { authRepository.verifyOtp(phone, code) }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Invalid or expired code")
                }
            // On success, RootViewModel's sessionStatus collector drives navigation —
            // this screen doesn't navigate itself.
        }
    }
}
