package com.glide.app.presentation.partner

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.presentation.partner.barbers.BarbersScreen
import com.glide.app.presentation.partner.catalog.ServicesScreen
import com.glide.app.presentation.partner.shopsetup.ShopSetupScreen
import com.glide.app.ui.theme.PartnerColors
import com.glide.app.ui.theme.PartnerTheme

@Composable
fun PartnerHomeScreen(onSignOut: () -> Unit, viewModel: PartnerViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    PartnerTheme {
        Scaffold { innerPadding ->
            when (val state = uiState) {
                is PartnerUiState.Loading -> Column(
                    modifier = Modifier.fillMaxSize().padding(innerPadding),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) { CircularProgressIndicator(color = PartnerColors.PrimaryBrand) }

                is PartnerUiState.NoShop -> CreateShopForm(
                    isSaving = state.isSaving,
                    error = state.error,
                    onCreate = viewModel::createShop,
                    modifier = Modifier.padding(innerPadding),
                )

                is PartnerUiState.Ready -> PartnerTabs(
                    state = state,
                    onToggleOpen = viewModel::setOpen,
                    onSaveProfile = viewModel::updateProfile,
                    onSaveHours = viewModel::saveOpeningHours,
                    onSignOut = onSignOut,
                    modifier = Modifier.padding(innerPadding),
                )
            }
        }
    }
}

@Composable
private fun CreateShopForm(
    isSaving: Boolean,
    error: String?,
    onCreate: (name: String, address: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var name by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }

    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                "Set up your shop",
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                color = PartnerColors.TextPrimary,
            )
            Text(
                "This becomes your GLIDE storefront",
                style = MaterialTheme.typography.bodyMedium,
                color = PartnerColors.TextMuted,
            )
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = PartnerColors.CardSurface),
            border = BorderStroke(1.dp, PartnerColors.CardBorder),
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Shop name") },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("Address") },
                    modifier = Modifier.fillMaxWidth(),
                )
                error?.let { Text(it, color = PartnerColors.Danger) }
                Button(
                    onClick = { onCreate(name, address) },
                    enabled = !isSaving,
                    colors = ButtonDefaults.buttonColors(containerColor = PartnerColors.PrimaryBrand),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (isSaving) "Creating…" else "Create shop")
                }
            }
        }
    }
}

@Composable
private fun PartnerTabs(
    state: PartnerUiState.Ready,
    onToggleOpen: (Boolean) -> Unit,
    onSaveProfile: (String, String) -> Unit,
    onSaveHours: (Map<com.glide.app.domain.model.DayKey, com.glide.app.domain.model.DayHours>) -> Unit,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val titles = listOf("Shop", "Services", "Barbers")

    Column(modifier = modifier.fillMaxSize()) {
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = PartnerColors.CardSurface,
            contentColor = PartnerColors.PrimaryBrand,
        ) {
            titles.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = { Text(title, color = if (selectedTab == index) PartnerColors.PrimaryBrand else PartnerColors.TextMuted) },
                )
            }
        }
        Column(modifier = Modifier.fillMaxSize().weight(1f)) {
            when (selectedTab) {
                0 -> ShopSetupScreen(
                    shop = state.shop,
                    onToggleOpen = onToggleOpen,
                    onSaveProfile = onSaveProfile,
                    onSaveHours = onSaveHours,
                )
                1 -> ServicesScreen(shopId = state.shop.id)
                2 -> BarbersScreen(shopId = state.shop.id)
            }
        }
        Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.End) {
            TextButton(onClick = onSignOut) { Text("Sign out", color = PartnerColors.TextMuted) }
        }
    }
}
