package com.glide.app.data.repository

import com.glide.app.domain.model.NewProfile
import com.glide.app.domain.model.Profile
import com.glide.app.domain.model.UserRole
import com.glide.app.domain.repository.AuthRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.OtpType
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.providers.builtin.OTP
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Mirrors features/auth/otp.ts + features/auth/auth-provider.tsx exactly —
 * same Supabase Auth calls, same `profiles` table shape, against the same backend.
 */
@Singleton
class SupabaseAuthRepository @Inject constructor(
    private val supabase: SupabaseClient,
) : AuthRepository {

    override val sessionStatus: StateFlow<SessionStatus>
        get() = supabase.auth.sessionStatus

    override suspend fun sendOtp(phone: String) {
        supabase.auth.signInWith(OTP) { this.phone = phone }
    }

    override suspend fun verifyOtp(phone: String, token: String) {
        supabase.auth.verifyPhoneOtp(type = OtpType.Phone.SMS, phone = phone, token = token)
    }

    override suspend fun signInWithPassword(email: String, password: String) {
        supabase.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
    }

    override suspend fun fetchProfile(userId: String): Profile? =
        supabase.postgrest.from("profiles")
            .select {
                filter { eq("id", userId) }
            }
            .decodeSingleOrNull<Profile>()

    override suspend fun createProfile(userId: String, phone: String?, fullName: String, role: UserRole) {
        supabase.postgrest.from("profiles").insert(
            NewProfile(id = userId, phone = phone, fullName = fullName, role = role)
        )
    }

    override suspend fun signOut() {
        supabase.auth.signOut()
    }

    override fun currentUserId(): String? = supabase.auth.currentUserOrNull()?.id

    override fun currentPhone(): String? = supabase.auth.currentUserOrNull()?.phone
}
