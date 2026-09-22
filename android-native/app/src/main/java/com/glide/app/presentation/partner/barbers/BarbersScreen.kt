package com.glide.app.presentation.partner.barbers

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
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.domain.model.OwnBarber
import com.glide.app.ui.theme.PartnerColors

@Composable
fun BarbersScreen(shopId: String, viewModel: BarbersViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    LaunchedEffect(shopId) { viewModel.load(shopId) }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Text(
            "Barbers",
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
            color = PartnerColors.TextPrimary,
        )

        Card(
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            colors = CardDefaults.cardColors(containerColor = PartnerColors.CardSurface),
            border = BorderStroke(1.dp, PartnerColors.CardBorder),
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    if (uiState.editingBarberId == null) "Add a barber" else "Edit barber",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = PartnerColors.TextPrimary,
                )
                OutlinedTextField(
                    value = uiState.nameInput,
                    onValueChange = viewModel::onNameChanged,
                    label = { Text("Barber name") },
                    modifier = Modifier.fillMaxWidth(),
                )
                uiState.submitError?.let { Text(it, color = PartnerColors.Danger) }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { viewModel.submit(shopId) },
                        colors = ButtonDefaults.buttonColors(containerColor = PartnerColors.PrimaryBrand),
                    ) {
                        Text(if (uiState.editingBarberId == null) "Add barber" else "Save changes")
                    }
                    if (uiState.editingBarberId != null) {
                        OutlinedButton(onClick = { viewModel.startEditing(null) }) { Text("Cancel") }
                    }
                }
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(top = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(uiState.barbers) { barber -> BarberRow(barber, viewModel) }
        }
    }
}

@Composable
private fun BarberRow(barber: OwnBarber, viewModel: BarbersViewModel) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = PartnerColors.CardSurface),
        border = BorderStroke(1.dp, PartnerColors.CardBorder),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                barber.name,
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                color = PartnerColors.TextPrimary,
                modifier = Modifier.weight(1f),
            )
            Switch(
                checked = barber.isActive,
                onCheckedChange = { viewModel.setActive(barber.id, it) },
                colors = SwitchDefaults.colors(checkedTrackColor = PartnerColors.PrimaryBrand),
            )
            OutlinedButton(onClick = { viewModel.startEditing(barber) }) { Text("Edit") }
        }
    }
}
