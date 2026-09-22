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

/** India-only for now — see PhoneEntryScreen's fixed "+91" prefix. */
const val COUNTRY_CODE = "+91"

data class PhoneEntryUiState(
    val localNumber: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    /** Full E.164 number once an OTP has actually been sent for it. */
    val otpSentTo: String? = null,
)

private val LOCAL_NUMBER_REGEX = Regex("^\\d{10}$")

@HiltViewModel
class PhoneEntryViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PhoneEntryUiState())
    val uiState: StateFlow<PhoneEntryUiState> = _uiState.asStateFlow()

    /** Digits only, capped at 10 — the user never types a country code. */
    fun onLocalNumberChanged(raw: String) {
        val digitsOnly = raw.filter(Char::isDigit).take(10)
        _uiState.value = _uiState.value.copy(localNumber = digitsOnly, error = null)
    }

    fun sendOtp() {
        val local = _uiState.value.localNumber
        if (!LOCAL_NUMBER_REGEX.matches(local)) {
            _uiState.value = _uiState.value.copy(error = "Enter a valid 10-digit mobile number")
            return
        }
        val fullPhone = COUNTRY_CODE + local
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            runCatching { authRepository.sendOtp(fullPhone) }
                .onSuccess {
                    _uiState.value = _uiState.value.copy(isLoading = false, otpSentTo = fullPhone)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Could not send code")
                }
        }
    }

    fun otpSentHandled() {
        _uiState.value = _uiState.value.copy(otpSentTo = null)
    }

    /** BuildConfig.DEBUG-gated in the UI — never reachable in a release build. */
    fun signInWithDevAccount(account: DevAccount) {
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            runCatching { authRepository.signInWithPassword(account.email, account.password) }
                .onSuccess {
                    // RootViewModel's sessionStatus collector picks this up and routes —
                    // this screen doesn't navigate itself.
                    _uiState.value = _uiState.value.copy(isLoading = false)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Dev sign-in failed")
                }
        }
    }
}
