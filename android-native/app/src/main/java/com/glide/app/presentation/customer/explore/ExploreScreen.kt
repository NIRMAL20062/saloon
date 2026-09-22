package com.glide.app.presentation.customer.explore

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.domain.model.Shop
import com.glide.app.ui.theme.CustomerColors
import kotlin.math.roundToInt

@Composable
fun ExploreScreen(
    onShopClick: (shopId: String) -> Unit,
    onSignOut: () -> Unit,
    viewModel: ExploreViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted -> viewModel.onLocationPermissionResult(granted) }

    LaunchedEffect(Unit) {
        val alreadyGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        viewModel.onScreenReady(alreadyGranted)
    }

    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Explore",
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                color = CustomerColors.Ink,
            )
            TextButton(onClick = onSignOut) { Text("Sign out", color = CustomerColors.MutedText) }
        }

        OutlinedTextField(
            value = uiState.search,
            onValueChange = viewModel::onSearchChanged,
            label = { Text("Search shops") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
        )

        if (uiState.showLocationBanner) {
            Card(
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                colors = CardDefaults.cardColors(containerColor = CustomerColors.AccentSurface),
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Enable location to sort shops by distance",
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.bodyMedium,
                        color = CustomerColors.Accent,
                    )
                    TextButton(onClick = { permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION) }) {
                        Text("Enable")
                    }
                }
            }
        }

        uiState.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp))
        }

        if (uiState.isLoading) {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                CircularProgressIndicator(color = CustomerColors.Accent)
            }
        } else if (uiState.items.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text("No shops found nearby yet", color = CustomerColors.MutedText)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(top = 12.dp),
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(uiState.items) { item ->
                    ShopCard(
                        shop = item.shop,
                        distanceKm = item.distanceKm,
                        onClick = { onShopClick(item.shop.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun ShopCard(shop: Shop, distanceKm: Double?, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CustomerColors.Surface),
        border = BorderStroke(1.dp, CustomerColors.HairlineBorder),
        onClick = onClick,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Text(
                    shop.name,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = CustomerColors.Ink,
                    modifier = Modifier.weight(1f),
                )
                StatusBadge(isOpen = shop.isOpen)
            }
            shop.address?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = CustomerColors.MutedText,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            distanceKm?.let {
                Text(
                    "${(it * 10).roundToInt() / 10.0} km away",
                    style = MaterialTheme.typography.labelSmall,
                    color = CustomerColors.Accent,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }
    }
}

@Composable
private fun StatusBadge(isOpen: Boolean) {
    val color = if (isOpen) CustomerColors.LiveOpen else CustomerColors.UrgentCoral
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.padding(end = 4.dp).clip(CircleShape)) {
            Text("●", color = color, style = MaterialTheme.typography.labelSmall)
        }
        Text(
            if (isOpen) "Open" else "Closed",
            style = MaterialTheme.typography.labelSmall,
            color = color,
        )
    }
}
