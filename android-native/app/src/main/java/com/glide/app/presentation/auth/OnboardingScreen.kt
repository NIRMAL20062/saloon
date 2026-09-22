package com.glide.app.presentation.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.domain.model.UserRole

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
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Welcome to GLIDE", style = MaterialTheme.typography.headlineMedium)
            Text("Set up your profile to get started", style = MaterialTheme.typography.bodyMedium)

            OutlinedTextField(
                value = uiState.fullName,
                onValueChange = viewModel::onFullNameChanged,
                label = { Text("Your full name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            Text("I am a…", style = MaterialTheme.typography.labelLarge)
            RoleOption(
                label = "Customer — book haircuts & grooming",
                selected = uiState.role == UserRole.CUSTOMER,
                onSelect = { viewModel.onRoleSelected(UserRole.CUSTOMER) },
            )
            RoleOption(
                label = "Shop owner — manage salon & barbers",
                selected = uiState.role == UserRole.PARTNER,
                onSelect = { viewModel.onRoleSelected(UserRole.PARTNER) },
            )

            uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

            Button(
                onClick = { viewModel.submit(phone, onComplete) },
                enabled = !uiState.isLoading,
            ) {
                Text(if (uiState.isLoading) "Saving…" else "Complete profile")
            }
        }
    }
}

@Composable
private fun RoleOption(label: String, selected: Boolean, onSelect: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(selected = selected, onClick = onSelect),
    ) {
        RadioButton(selected = selected, onClick = onSelect)
        Text(label, modifier = Modifier.padding(start = 8.dp, top = 12.dp))
    }
}
