package com.glide.app.domain.repository

import com.glide.app.domain.model.Profile
import com.glide.app.domain.model.UserRole
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.flow.StateFlow

/**
 * Abstracted so ViewModels can be unit-tested against a fake, without a real
 * SupabaseClient (which needs network + an Android context to construct).
 */
interface AuthRepository {
    val sessionStatus: StateFlow<SessionStatus>

    suspend fun sendOtp(phone: String)
    suspend fun verifyOtp(phone: String, token: String)

    /**
     * Dev-only shortcut — signs in against a pre-created throwaway Supabase Auth
     * account instead of sending a real (paid) OTP SMS. Only ever called from a
     * BuildConfig.DEBUG-gated UI path; never reachable in a release build.
     */
    suspend fun signInWithPassword(email: String, password: String)
    suspend fun fetchProfile(userId: String): Profile?
    suspend fun createProfile(userId: String, phone: String?, fullName: String, role: UserRole)
    suspend fun signOut()
    fun currentUserId(): String?
    fun currentPhone(): String?
}
