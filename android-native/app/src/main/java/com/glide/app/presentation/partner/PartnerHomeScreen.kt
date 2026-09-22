package com.glide.app.presentation.partner

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.presentation.partner.barbers.BarbersScreen
import com.glide.app.presentation.partner.catalog.ServicesScreen
import com.glide.app.presentation.partner.shopsetup.ShopSetupScreen
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
                ) { CircularProgressIndicator() }

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
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Set up your shop", style = MaterialTheme.typography.headlineMedium)
        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Shop name") })
        OutlinedTextField(value = address, onValueChange = { address = it }, label = { Text("Address") })
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(onClick = { onCreate(name, address) }, enabled = !isSaving) {
            Text(if (isSaving) "Creating…" else "Create shop")
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
        TabRow(selectedTabIndex = selectedTab) {
            titles.forEachIndexed { index, title ->
                Tab(selected = selectedTab == index, onClick = { selectedTab = index }, text = { Text(title) })
            }
        }
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
        Button(onClick = onSignOut, modifier = Modifier.padding(16.dp)) { Text("Sign out") }
    }
}
