package com.glide.app.presentation.customer

import androidx.compose.runtime.Composable
import com.glide.app.presentation.customer.explore.ExploreScreen
import com.glide.app.ui.theme.CustomerTheme

@Composable
fun CustomerHomeScreen(onSignOut: () -> Unit) {
    CustomerTheme {
        ExploreScreen(
            // Shop detail screen is Phase 4 (booking) territory — not built yet.
            onShopClick = {},
            onSignOut = onSignOut,
        )
    }
}
