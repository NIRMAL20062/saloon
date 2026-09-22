package com.glide.app.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class UserRole {
    @SerialName("customer") CUSTOMER,
    @SerialName("partner") PARTNER,
    @SerialName("admin") ADMIN,
}

/** Mirrors public.profiles exactly (supabase/migrations/0001_init.sql) — same row shape the Expo app reads. */
@Serializable
data class Profile(
    val id: String,
    val phone: String? = null,
    @SerialName("full_name") val fullName: String? = null,
    @SerialName("photo_url") val photoUrl: String? = null,
    val role: UserRole = UserRole.CUSTOMER,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class NewProfile(
    val id: String,
    val phone: String? = null,
    @SerialName("full_name") val fullName: String,
    val role: UserRole,
)
