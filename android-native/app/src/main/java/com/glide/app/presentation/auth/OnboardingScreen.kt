package com.glide.app.presentation.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.domain.model.UserRole
import com.glide.app.ui.theme.CustomerColors

@Composable
fun OnboardingScreen(
    phone: String?,
    onComplete: (UserRole) -> Unit,
    viewModel: OnboardingViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    "Welcome to GLIDE",
                    style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                    color = CustomerColors.Ink,
                )
                Text(
                    "Set up your profile to get started",
                    style = MaterialTheme.typography.bodyMedium,
                    color = CustomerColors.MutedText,
                )
            }

            OutlinedTextField(
                value = uiState.fullName,
                onValueChange = viewModel::onFullNameChanged,
                label = { Text("Your full name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("I am a…", style = MaterialTheme.typography.labelLarge, color = CustomerColors.MutedText)
                RoleCard(
                    title = "Customer",
                    description = "Book haircuts & grooming",
                    selected = uiState.role == UserRole.CUSTOMER,
                    onSelect = { viewModel.onRoleSelected(UserRole.CUSTOMER) },
                )
                RoleCard(
                    title = "Shop owner",
                    description = "Manage salon & barbers",
                    selected = uiState.role == UserRole.PARTNER,
                    onSelect = { viewModel.onRoleSelected(UserRole.PARTNER) },
                )
            }

            uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

            Button(
                onClick = { viewModel.submit(phone, onComplete) },
                enabled = !uiState.isLoading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (uiState.isLoading) "Saving…" else "Complete profile")
            }
        }
    }
}

@Composable
private fun RoleCard(title: String, description: String, selected: Boolean, onSelect: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(selected = selected, onClick = onSelect),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) CustomerColors.AccentSurface else CustomerColors.Surface,
        ),
        border = BorderStroke(1.dp, if (selected) CustomerColors.Accent else CustomerColors.HairlineBorder),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = if (selected) CustomerColors.Accent else CustomerColors.Ink,
            )
            Text(description, style = MaterialTheme.typography.bodySmall, color = CustomerColors.MutedText)
        }
    }
}
