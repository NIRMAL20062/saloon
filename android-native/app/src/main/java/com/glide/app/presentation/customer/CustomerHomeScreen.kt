package com.glide.app.presentation.customer

import androidx.compose.runtime.Composable
import com.glide.app.presentation.customer.explore.ExploreScreen
import com.glide.app.ui.theme.CustomerTheme

@Composable
fun CustomerHomeScreen(onSignOut: () -> Unit, onShopClick: (shopId: String) -> Unit) {
    CustomerTheme {
        ExploreScreen(
            onShopClick = onShopClick,
            onSignOut = onSignOut,
        )
    }
}
