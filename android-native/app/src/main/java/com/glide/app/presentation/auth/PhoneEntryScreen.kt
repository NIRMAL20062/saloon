package com.glide.app.presentation.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.BuildConfig
import com.glide.app.ui.theme.CustomerColors

@Composable
fun PhoneEntryScreen(
    onOtpSent: (phone: String) -> Unit,
    viewModel: PhoneEntryViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.otpSentTo) {
        uiState.otpSentTo?.let { phone ->
            onOtpSent(phone)
            viewModel.otpSentHandled()
        }
    }

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
                    "GLIDE",
                    style = MaterialTheme.typography.headlineLarge.copy(fontWeight = FontWeight.Bold),
                    color = CustomerColors.Ink,
                )
                Text(
                    "Enter your mobile number to continue",
                    style = MaterialTheme.typography.bodyMedium,
                    color = CustomerColors.MutedText,
                )
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CustomerColors.Surface),
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        Card(colors = CardDefaults.cardColors(containerColor = CustomerColors.AccentSurface)) {
                            Text(
                                "+91",
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                                style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                                color = CustomerColors.Accent,
                            )
                        }
                        OutlinedTextField(
                            value = uiState.localNumber,
                            onValueChange = viewModel::onLocalNumberChanged,
                            label = { Text("Mobile number") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth().padding(start = 8.dp),
                        )
                    }

                    uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

                    Button(
                        onClick = viewModel::sendOtp,
                        enabled = !uiState.isLoading,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(if (uiState.isLoading) "Sending…" else "Send code")
                    }
                }
            }

            if (BuildConfig.DEBUG) {
                DevSignInSection(
                    isLoading = uiState.isLoading,
                    onSelect = viewModel::signInWithDevAccount,
                )
            }
        }
    }
}

@Composable
private fun DevSignInSection(isLoading: Boolean, onSelect: (DevAccount) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        HorizontalDivider()
        Text(
            "Debug build only — skips real SMS, signs in as a throwaway test account",
            style = MaterialTheme.typography.labelSmall,
            color = CustomerColors.MutedText,
        )
        DEV_ACCOUNTS.forEach { account ->
            OutlinedButton(
                onClick = { onSelect(account) },
                enabled = !isLoading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(account.label)
            }
        }
    }
}
