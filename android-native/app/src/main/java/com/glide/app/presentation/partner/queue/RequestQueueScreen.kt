package com.glide.app.presentation.partner.queue

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.domain.model.Booking
import com.glide.app.ui.theme.PartnerColors
import java.time.Instant
import kotlinx.coroutines.delay

@Composable
fun RequestQueueScreen(shopId: String, viewModel: RequestQueueViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    LaunchedEffect(shopId) { viewModel.refresh(shopId) }

    // No Realtime push yet (Phase 8) — poll every 15s while this screen is open so a shop
    // owner glancing at the app sees new requests without hunting for a refresh button.
    LaunchedEffect(shopId) {
        while (true) {
            delay(15_000)
            viewModel.refresh(shopId)
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                "Incoming requests",
                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                color = PartnerColors.TextPrimary,
            )
            OutlinedButton(onClick = { viewModel.refresh(shopId) }) { Text("Refresh") }
        }

        uiState.error?.let { Text(it, color = PartnerColors.Danger, modifier = Modifier.padding(top = 8.dp)) }
        uiState.actionError?.let { Text(it, color = PartnerColors.Danger, modifier = Modifier.padding(top = 8.dp)) }

        if (uiState.isLoading) {
            Column(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(color = PartnerColors.PrimaryBrand)
            }
        } else if (uiState.bookings.isEmpty()) {
            Text(
                "No pending requests right now.",
                color = PartnerColors.TextMuted,
                modifier = Modifier.padding(top = 24.dp),
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(top = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(uiState.bookings, key = { it.id }) { booking ->
                    RequestCard(
                        booking = booking,
                        onAccept = { viewModel.accept(shopId, booking.id) },
                        onReject = { viewModel.reject(shopId, booking.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun RequestCard(booking: Booking, onAccept: () -> Unit, onReject: () -> Unit) {
    var secondsLeft by remember(booking.id) { mutableLongStateOf(secondsUntil(booking.shopResponseExpiresAt)) }

    LaunchedEffect(booking.id) {
        while (secondsLeft > 0) {
            delay(1_000)
            secondsLeft = secondsUntil(booking.shopResponseExpiresAt)
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = PartnerColors.CardSurface),
        border = BorderStroke(1.dp, if (secondsLeft <= 20) PartnerColors.Danger else PartnerColors.CardBorder),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("₹${booking.totalAmount / 100.0}", style = MaterialTheme.typography.titleMedium, color = PartnerColors.TextPrimary)
                Text(
                    if (secondsLeft > 0) "${secondsLeft}s left" else "Expiring…",
                    color = if (secondsLeft <= 20) PartnerColors.Danger else PartnerColors.TextMuted,
                    style = MaterialTheme.typography.labelMedium,
                )
            }
            Text(booking.scheduledAt, color = PartnerColors.TextMuted, style = MaterialTheme.typography.bodySmall)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onAccept,
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = PartnerColors.PrimaryBrand),
                ) { Text("Accept") }
                OutlinedButton(onClick = onReject) { Text("Reject") }
            }
        }
    }
}

private fun secondsUntil(isoInstant: String?): Long {
    val target = isoInstant?.let { runCatching { Instant.parse(it) }.getOrNull() } ?: return 0
    return (target.epochSecond - Instant.now().epochSecond).coerceAtLeast(0)
}
