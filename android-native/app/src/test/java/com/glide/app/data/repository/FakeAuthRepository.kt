package com.glide.app.data.repository

import com.glide.app.domain.model.Profile
import com.glide.app.domain.model.UserRole
import com.glide.app.domain.repository.AuthRepository
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Test double — no network, no Android context, fully controllable from the test. */
class FakeAuthRepository : AuthRepository {

    private val _sessionStatus = MutableStateFlow<SessionStatus>(SessionStatus.NotAuthenticated())
    override val sessionStatus: StateFlow<SessionStatus> get() = _sessionStatus

    var sendOtpError: Throwable? = null
    var verifyOtpError: Throwable? = null
    var createProfileError: Throwable? = null
    var passwordSignInError: Throwable? = null
    var profileToReturn: Profile? = null
    var userIdToReturn: String? = "user-1"
    var phoneToReturn: String? = "+919876543210"

    val sentOtpTo = mutableListOf<String>()
    val verifiedCodes = mutableListOf<Pair<String, String>>()
    val createdProfiles = mutableListOf<Pair<String, UserRole>>()
    val passwordSignIns = mutableListOf<Pair<String, String>>()
    var signOutCalled = false

    fun emit(status: SessionStatus) {
        _sessionStatus.value = status
    }

    override suspend fun sendOtp(phone: String) {
        sendOtpError?.let { throw it }
        sentOtpTo += phone
    }

    override suspend fun verifyOtp(phone: String, token: String) {
        verifyOtpError?.let { throw it }
        verifiedCodes += phone to token
    }

    override suspend fun fetchProfile(userId: String): Profile? = profileToReturn

    override suspend fun createProfile(userId: String, phone: String?, fullName: String, role: UserRole) {
        createProfileError?.let { throw it }
        createdProfiles += userId to role
    }

    override suspend fun signInWithPassword(email: String, password: String) {
        passwordSignInError?.let { throw it }
        passwordSignIns += email to password
    }

    override suspend fun signOut() {
        signOutCalled = true
    }

    override fun currentUserId(): String? = userIdToReturn

    override fun currentPhone(): String? = phoneToReturn
}
