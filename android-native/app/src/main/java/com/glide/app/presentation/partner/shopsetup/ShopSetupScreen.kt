package com.glide.app.presentation.partner.shopsetup

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.glide.app.domain.model.DayHours
import com.glide.app.domain.model.DayKey
import com.glide.app.domain.model.OwnShop
import com.glide.app.domain.model.openingHours
import com.glide.app.domain.model.validateOpeningHours
import com.glide.app.ui.theme.PartnerColors

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
        modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = PartnerColors.MintSurface),
            border = BorderStroke(1.dp, PartnerColors.MintBorder),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(
                        "Shop status",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = PartnerColors.TextPrimary,
                    )
                    Text(
                        if (shop.isOpen) "● Open — accepting bookings" else "● Paused — not accepting bookings",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (shop.isOpen) PartnerColors.PrimaryBrand else PartnerColors.TextMuted,
                    )
                }
                Switch(
                    checked = shop.isOpen,
                    onCheckedChange = onToggleOpen,
                    colors = SwitchDefaults.colors(checkedTrackColor = PartnerColors.PrimaryBrand),
                )
            }
        }

        SectionCard(title = "Shop profile") {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Shop name") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = address, onValueChange = { address = it }, label = { Text("Address") }, modifier = Modifier.fillMaxWidth())
            Button(
                onClick = { onSaveProfile(name, address) },
                colors = ButtonDefaults.buttonColors(containerColor = PartnerColors.PrimaryBrand),
            ) { Text("Save profile") }
        }

        SectionCard(title = "Opening hours") {
            DayKey.entries.forEach { day ->
                val dayHours = hours[day] ?: DayHours(closed = false, open = "09:00", close = "20:00")
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            day.key.uppercase(),
                            modifier = Modifier.padding(end = 4.dp).weight(0.6f),
                            style = MaterialTheme.typography.labelMedium,
                            color = PartnerColors.TextPrimary,
                        )
                        Switch(
                            checked = !dayHours.closed,
                            onCheckedChange = { open -> hours = hours + (day to dayHours.copy(closed = !open)) },
                            colors = SwitchDefaults.colors(checkedTrackColor = PartnerColors.PrimaryBrand),
                        )
                        if (!dayHours.closed) {
                            OutlinedTextField(
                                value = dayHours.open,
                                onValueChange = { hours = hours + (day to dayHours.copy(open = it)) },
                                label = { Text("Open") },
                                modifier = Modifier.weight(1.4f),
                                singleLine = true,
                            )
                            OutlinedTextField(
                                value = dayHours.close,
                                onValueChange = { hours = hours + (day to dayHours.copy(close = it)) },
                                label = { Text("Close") },
                                modifier = Modifier.weight(1.4f),
                                singleLine = true,
                            )
                        } else {
                            Text(
                                "Closed",
                                modifier = Modifier.weight(2.8f),
                                color = PartnerColors.TextMuted,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                    hourErrors[day]?.let {
                        Text(it, color = PartnerColors.Danger, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
            Button(
                onClick = { onSaveHours(hours) },
                enabled = hourErrors.isEmpty(),
                colors = ButtonDefaults.buttonColors(containerColor = PartnerColors.PrimaryBrand),
            ) { Text("Save hours") }
        }
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = PartnerColors.CardSurface),
        border = BorderStroke(1.dp, PartnerColors.CardBorder),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = PartnerColors.TextPrimary,
            )
            content()
        }
    }
}
