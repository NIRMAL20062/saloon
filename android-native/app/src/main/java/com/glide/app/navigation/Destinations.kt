package com.glide.app.navigation

import kotlinx.serialization.Serializable

sealed interface Destination {
    @Serializable data object Login : Destination
    @Serializable data class OtpVerification(val phone: String) : Destination
    @Serializable data class Onboarding(val phone: String?) : Destination
    @Serializable data object CustomerHome : Destination
    @Serializable data object PartnerHome : Destination
    @Serializable data class ShopDetails(val shopId: String) : Destination
    @Serializable data class BookingTracker(val bookingId: String) : Destination
}
