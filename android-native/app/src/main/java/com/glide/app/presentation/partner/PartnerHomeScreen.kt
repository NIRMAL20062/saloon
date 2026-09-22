package com.glide.app.presentation.partner

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
import com.glide.app.ui.theme.PartnerTheme

/** Placeholder — real shop/catalog/booking-queue UI is Phases 3/7. */
@Composable
fun PartnerHomeScreen(onSignOut: () -> Unit) {
    PartnerTheme {
        Scaffold { innerPadding ->
            Column(
                modifier = Modifier.fillMaxSize().padding(innerPadding).padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("Partner home", style = MaterialTheme.typography.headlineMedium)
                Button(onClick = onSignOut) { Text("Sign out") }
            }
        }
    }
}
