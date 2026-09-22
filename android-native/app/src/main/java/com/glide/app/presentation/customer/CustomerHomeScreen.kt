package com.glide.app.presentation.customer

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.glide.app.ui.theme.CustomerTheme

/** Placeholder — real discovery/booking UI is Phases 2/4. */
@Composable
fun CustomerHomeScreen(onSignOut: () -> Unit) {
    CustomerTheme {
        Scaffold { innerPadding ->
            Column(
                modifier = Modifier.fillMaxSize().padding(innerPadding).padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("Customer home", style = MaterialTheme.typography.headlineMedium)
                Button(onClick = onSignOut) { Text("Sign out") }
            }
        }
    }
}
