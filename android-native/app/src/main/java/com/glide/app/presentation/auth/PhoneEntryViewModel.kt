package com.glide.app.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.glide.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PhoneEntryUiState(
    val phone: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val otpSent: Boolean = false,
)

/** Loose E.164 shape check only — Supabase Auth is what actually validates/rate-limits server-side. */
private val PHONE_REGEX = Regex("^\\+[1-9]\\d{7,14}$")

@HiltViewModel
class PhoneEntryViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PhoneEntryUiState())
    val uiState: StateFlow<PhoneEntryUiState> = _uiState.asStateFlow()

    fun onPhoneChanged(phone: String) {
        _uiState.value = _uiState.value.copy(phone = phone, error = null)
    }

    fun sendOtp() {
        val phone = _uiState.value.phone.trim()
        if (!PHONE_REGEX.matches(phone)) {
            _uiState.value = _uiState.value.copy(error = "Enter a valid phone number, e.g. +919876543210")
            return
        }
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            runCatching { authRepository.sendOtp(phone) }
                .onSuccess {
                    _uiState.value = _uiState.value.copy(isLoading = false, otpSent = true)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Could not send code")
                }
        }
    }

    fun otpSentHandled() {
        _uiState.value = _uiState.value.copy(otpSent = false)
    }
}
