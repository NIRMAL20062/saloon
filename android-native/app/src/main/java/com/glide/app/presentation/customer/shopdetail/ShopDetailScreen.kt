package com.glide.app.presentation.customer.shopdetail

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.Button
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.domain.model.Barber
import com.glide.app.domain.model.GLIDE_ZONE
import com.glide.app.domain.model.Service
import com.glide.app.domain.model.SlotCandidate
import com.glide.app.ui.theme.CustomerColors
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

@Composable
fun ShopDetailScreen(
    shopId: String,
    onBookingCreated: (bookingId: String) -> Unit,
    viewModel: ShopDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    LaunchedEffect(shopId) { viewModel.load(shopId) }

    LaunchedEffect(uiState.createdBookingId) {
        uiState.createdBookingId?.let {
            onBookingCreated(it)
            viewModel.createdBookingHandled()
        }
    }

    Scaffold { innerPadding ->
        if (uiState.isLoading) {
            Column(
                modifier = Modifier.fillMaxSize().padding(innerPadding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) { CircularProgressIndicator(color = CustomerColors.Accent) }
            return@Scaffold
        }

        val shop = uiState.shop
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            shop?.let {
                Text(it.name, style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold), color = CustomerColors.Ink)
                it.address?.let { addr -> Text(addr, style = MaterialTheme.typography.bodyMedium, color = CustomerColors.MutedText) }
            }

            SectionLabel("Services")
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                uiState.services.forEach { service ->
                    ServiceRow(
                        service = service,
                        selected = service.id in uiState.selectedServiceIds,
                        onToggle = { viewModel.toggleService(service.id) },
                    )
                }
            }

            SectionLabel("Barber")
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(uiState.barbers) { barber ->
                    BarberChip(
                        barber = barber,
                        selected = barber.id == uiState.selectedBarberId,
                        onClick = { viewModel.selectBarber(barber.id) },
                    )
                }
            }

            SectionLabel("Date")
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                val today = LocalDate.now(GLIDE_ZONE)
                items((0 until 7).map { today.plusDays(it.toLong()) }) { date ->
                    DateChip(date = date, selected = date == uiState.selectedDate, onClick = { viewModel.selectDate(date) })
                }
            }

            if (uiState.selectedBarberId != null) {
                SectionLabel("Time")
                if (uiState.slots.isEmpty()) {
                    Text("No slots available this day.", color = CustomerColors.MutedText, style = MaterialTheme.typography.bodySmall)
                } else {
                    SlotGrid(slots = uiState.slots, selected = uiState.selectedSlot, onSelect = viewModel::selectSlot)
                }
            }

            uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

            if (uiState.selectedServiceIds.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = CustomerColors.AccentSurface),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("₹${uiState.totalPricePaise / 100.0} · ${uiState.totalDurationMin} min", color = CustomerColors.Accent)
                    }
                }
            }

            Button(
                onClick = viewModel::requestBooking,
                enabled = uiState.canRequestBooking,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (uiState.isBooking) "Requesting…" else "Request booking")
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(text, style = MaterialTheme.typography.labelLarge, color = CustomerColors.MutedText)
}

@Composable
private fun ServiceRow(service: Service, selected: Boolean, onToggle: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = if (selected) CustomerColors.AccentSurface else CustomerColors.Surface),
        border = BorderStroke(1.dp, if (selected) CustomerColors.Accent else CustomerColors.HairlineBorder),
        onClick = onToggle,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(service.name, style = MaterialTheme.typography.titleSmall, color = CustomerColors.Ink)
                Text(
                    "₹${service.price / 100.0} · ${service.durationMin} min",
                    style = MaterialTheme.typography.bodySmall,
                    color = CustomerColors.MutedText,
                )
            }
            Checkbox(checked = selected, onCheckedChange = { onToggle() })
        }
    }
}

@Composable
private fun BarberChip(barber: Barber, selected: Boolean, onClick: () -> Unit) {
    FilterChip(selected = selected, onClick = onClick, label = { Text(barber.name) })
}

@Composable
private fun DateChip(date: LocalDate, selected: Boolean, onClick: () -> Unit) {
    val label = "${date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault())} ${date.format(DateTimeFormatter.ofPattern("d MMM"))}"
    FilterChip(selected = selected, onClick = onClick, label = { Text(label) })
}

@Composable
private fun SlotGrid(slots: List<SlotCandidate>, selected: SlotCandidate?, onSelect: (SlotCandidate) -> Unit) {
    val rows = slots.chunked(4)
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        rows.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                row.forEach { slot ->
                    FilterChip(
                        selected = slot == selected,
                        onClick = { onSelect(slot) },
                        enabled = slot.available,
                        label = { Text(slot.time.toString()) },
                    )
                }
            }
        }
    }
}
