package com.glide.app.presentation.partner.shopsetup

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.glide.app.domain.model.DayHours
import com.glide.app.domain.model.DayKey
import com.glide.app.domain.model.OwnShop
import com.glide.app.domain.model.openingHours
import com.glide.app.domain.model.validateOpeningHours

@Composable
fun ShopSetupScreen(
    shop: OwnShop,
    onToggleOpen: (Boolean) -> Unit,
    onSaveProfile: (name: String, address: String) -> Unit,
    onSaveHours: (Map<DayKey, DayHours>) -> Unit,
) {
    var name by remember(shop.id) { mutableStateOf(shop.name) }
    var address by remember(shop.id) { mutableStateOf(shop.address.orEmpty()) }
    var hours by remember(shop.id) { mutableStateOf(shop.openingHours()) }
    val hourErrors = validateOpeningHours(hours)

    Column(
        modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Shop status", style = MaterialTheme.typography.titleMedium)
                    Text(
                        if (shop.isOpen) "● Open — accepting bookings" else "● Paused — not accepting bookings",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                Switch(checked = shop.isOpen, onCheckedChange = onToggleOpen)
            }
        }

        Text("Shop profile", style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Shop name") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = address, onValueChange = { address = it }, label = { Text("Address") }, modifier = Modifier.fillMaxWidth())
        Button(onClick = { onSaveProfile(name, address) }) { Text("Save profile") }

        Text("Opening hours", style = MaterialTheme.typography.titleMedium)
        DayKey.entries.forEach { day ->
            val dayHours = hours[day] ?: DayHours(closed = false, open = "09:00", close = "20:00")
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(day.key.uppercase(), modifier = Modifier.padding(end = 4.dp))
                Switch(
                    checked = !dayHours.closed,
                    onCheckedChange = { open -> hours = hours + (day to dayHours.copy(closed = !open)) },
                )
                if (!dayHours.closed) {
                    OutlinedTextField(
                        value = dayHours.open,
                        onValueChange = { hours = hours + (day to dayHours.copy(open = it)) },
                        label = { Text("Open") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = dayHours.close,
                        onValueChange = { hours = hours + (day to dayHours.copy(close = it)) },
                        label = { Text("Close") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                    )
                } else {
                    Text("Closed", modifier = Modifier.weight(1f))
                }
            }
            hourErrors[day]?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall) }
        }
        Button(onClick = { onSaveHours(hours) }, enabled = hourErrors.isEmpty()) { Text("Save hours") }
    }
}
