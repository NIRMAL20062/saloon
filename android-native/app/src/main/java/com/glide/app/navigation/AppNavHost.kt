package com.glide.app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.glide.app.domain.model.UserRole
import com.glide.app.presentation.auth.OnboardingScreen
import com.glide.app.presentation.auth.OtpScreen
import com.glide.app.presentation.auth.PhoneEntryScreen
import com.glide.app.presentation.customer.CustomerHomeScreen
import com.glide.app.presentation.customer.booking.BookingTrackerScreen
import com.glide.app.presentation.customer.checkout.PaymentScreen
import com.glide.app.presentation.customer.shopdetail.ShopDetailScreen
import com.glide.app.presentation.partner.PartnerHomeScreen

@Composable
fun AppNavHost(rootViewModel: RootViewModel = hiltViewModel()) {
    val navController = rememberNavController()
    val rootState by rootViewModel.uiState.collectAsState()

    LaunchedEffect(rootState) {
        when (val state = rootState) {
            is RootUiState.Loading -> Unit
            is RootUiState.LoggedOut -> navController.navigate(Destination.Login) {
                popUpTo(0)
            }
            is RootUiState.NeedsOnboarding -> navController.navigate(Destination.Onboarding(state.phone)) {
                popUpTo(0)
            }
            is RootUiState.LoggedIn -> {
                val destination = if (state.role == UserRole.PARTNER) {
                    Destination.PartnerHome
                } else {
                    Destination.CustomerHome
                }
                navController.navigate(destination) { popUpTo(0) }
            }
        }
    }

    NavHost(navController = navController, startDestination = Destination.Login) {
        composable<Destination.Login> {
            PhoneEntryScreen(
                onOtpSent = { phone -> navController.navigate(Destination.OtpVerification(phone)) },
            )
        }
        composable<Destination.OtpVerification> { backStackEntry ->
            val args = backStackEntry.toRoute<Destination.OtpVerification>()
            OtpScreen(phone = args.phone)
        }
        composable<Destination.Onboarding> { backStackEntry ->
            val args = backStackEntry.toRoute<Destination.Onboarding>()
            OnboardingScreen(
                phone = args.phone,
                onComplete = { role -> rootViewModel.onOnboardingComplete(role) },
            )
        }
        composable<Destination.CustomerHome> {
            CustomerHomeScreen(
                onSignOut = rootViewModel::signOut,
                onShopClick = { shopId -> navController.navigate(Destination.ShopDetails(shopId)) },
            )
        }
        composable<Destination.ShopDetails> { backStackEntry ->
            val args = backStackEntry.toRoute<Destination.ShopDetails>()
            ShopDetailScreen(
                shopId = args.shopId,
                onBookingCreated = { bookingId -> navController.navigate(Destination.BookingTracker(bookingId)) },
            )
        }
        composable<Destination.BookingTracker> { backStackEntry ->
            val args = backStackEntry.toRoute<Destination.BookingTracker>()
            BookingTrackerScreen(
                bookingId = args.bookingId,
                onPayNow = { bookingId -> navController.navigate(Destination.Payment(bookingId)) },
            )
        }
        composable<Destination.Payment> { backStackEntry ->
            val args = backStackEntry.toRoute<Destination.Payment>()
            PaymentScreen(
                bookingId = args.bookingId,
                onCheckoutFinished = { navController.popBackStack() },
            )
        }
        composable<Destination.PartnerHome> {
            PartnerHomeScreen(onSignOut = rootViewModel::signOut)
        }
    }
}
