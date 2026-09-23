package com.glide.app.presentation.customer.booking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.domain.model.BookingStatus
import com.glide.app.ui.theme.CustomerColors

@Composable
fun BookingTrackerScreen(
    bookingId: String,
    onPayNow: (bookingId: String) -> Unit,
    viewModel: BookingTrackerViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    LaunchedEffect(bookingId) { viewModel.refresh(bookingId) }

    Scaffold { innerPadding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(innerPadding).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Booking status", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold), color = CustomerColors.Ink)

            if (uiState.isLoading) {
                Column(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = CustomerColors.Accent)
                }
            } else {
                uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                uiState.booking?.let { booking ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(statusHeadline(booking.status), style = MaterialTheme.typography.titleMedium)
                            Text(statusDescription(booking.status), color = CustomerColors.MutedText)
                            Text("₹${booking.totalAmount / 100.0}", color = CustomerColors.Accent)
                        }
                    }

                    if (booking.status == BookingStatus.PAYMENT_PENDING) {
                        Button(onClick = { onPayNow(booking.id) }, modifier = Modifier.fillMaxWidth()) {
                            Text("Pay ₹${booking.totalAmount / 100.0}")
                        }
                    }

                    Text(
                        "This screen doesn't update live yet — tap refresh to check again.",
                        style = MaterialTheme.typography.labelSmall,
                        color = CustomerColors.MutedText,
                    )
                    Button(onClick = { viewModel.refresh(bookingId) }, modifier = Modifier.fillMaxWidth()) {
                        Text("Refresh")
                    }
                }
            }
        }
    }
}

private fun statusHeadline(status: BookingStatus): String = when (status) {
    BookingStatus.DRAFT, BookingStatus.AWAITING_SHOP -> "Waiting for the shop to respond"
    BookingStatus.PAYMENT_PENDING -> "Accepted — payment required"
    BookingStatus.CONFIRMED -> "Confirmed"
    BookingStatus.REJECTED -> "Declined by the shop"
    BookingStatus.EXPIRED -> "Expired — the shop didn't respond in time"
}

private fun statusDescription(status: BookingStatus): String = when (status) {
    BookingStatus.DRAFT, BookingStatus.AWAITING_SHOP -> "The shop has a short window to accept or decline."
    BookingStatus.PAYMENT_PENDING -> "The shop accepted your booking. Complete payment to confirm your slot."
    BookingStatus.CONFIRMED -> "Your slot is booked."
    BookingStatus.REJECTED -> "No charge was made — nothing to refund."
    BookingStatus.EXPIRED -> "No charge was made — try booking again."
}
