package com.glide.app.presentation.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun PhoneEntryScreen(
    onOtpSent: (phone: String) -> Unit,
    viewModel: PhoneEntryViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.otpSent) {
        if (uiState.otpSent) {
            onOtpSent(uiState.phone.trim())
            viewModel.otpSentHandled()
        }
    }

    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("GLIDE", style = MaterialTheme.typography.headlineMedium)
            Text("Enter your phone number to continue", style = MaterialTheme.typography.bodyMedium)

            OutlinedTextField(
                value = uiState.phone,
                onValueChange = viewModel::onPhoneChanged,
                label = { Text("Phone number (e.g. +919876543210)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

            Button(onClick = viewModel::sendOtp, enabled = !uiState.isLoading) {
                Text(if (uiState.isLoading) "Sending…" else "Send code")
            }
        }
    }
}
