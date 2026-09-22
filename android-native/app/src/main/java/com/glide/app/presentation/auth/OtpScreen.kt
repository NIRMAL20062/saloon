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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.core.sms.SmsAutoReadEffect

@Composable
fun OtpScreen(
    phone: String,
    viewModel: OtpViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    SmsAutoReadEffect { code -> viewModel.onCodeAutoDetected(phone, code) }

    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Verify your number", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Enter the code sent to $phone — we'll auto-fill it if you allow the SMS prompt.",
                style = MaterialTheme.typography.bodyMedium,
            )

            OutlinedTextField(
                value = uiState.code,
                onValueChange = viewModel::onCodeChanged,
                label = { Text("6-digit code") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

            Button(onClick = { viewModel.verify(phone) }, enabled = !uiState.isLoading) {
                Text(if (uiState.isLoading) "Verifying…" else "Verify")
            }
        }
    }
}
