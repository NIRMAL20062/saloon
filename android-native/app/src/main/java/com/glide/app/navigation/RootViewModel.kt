package com.glide.app.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.glide.app.data.repository.AuthRepository
import com.glide.app.domain.model.UserRole
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface RootUiState {
    data object Loading : RootUiState
    data object LoggedOut : RootUiState
    data class NeedsOnboarding(val phone: String?) : RootUiState
    data class LoggedIn(val role: UserRole) : RootUiState
}

@HiltViewModel
class RootViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<RootUiState>(RootUiState.Loading)
    val uiState: StateFlow<RootUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.sessionStatus.collect { status -> onSessionStatus(status) }
        }
    }

    private suspend fun onSessionStatus(status: SessionStatus) {
        _uiState.value = when (status) {
            is SessionStatus.Authenticated -> {
                val userId = status.session.user?.id ?: return
                val profile = authRepository.fetchProfile(userId)
                if (profile == null) {
                    RootUiState.NeedsOnboarding(authRepository.currentPhone())
                } else {
                    RootUiState.LoggedIn(profile.role)
                }
            }
            is SessionStatus.NotAuthenticated -> RootUiState.LoggedOut
            SessionStatus.Initializing -> RootUiState.Loading
            is SessionStatus.RefreshFailure -> RootUiState.LoggedOut
        }
    }

    /** Called after onboarding successfully inserts the profiles row. */
    fun onOnboardingComplete(role: UserRole) {
        _uiState.value = RootUiState.LoggedIn(role)
    }

    fun signOut() {
        viewModelScope.launch { authRepository.signOut() }
    }
}
