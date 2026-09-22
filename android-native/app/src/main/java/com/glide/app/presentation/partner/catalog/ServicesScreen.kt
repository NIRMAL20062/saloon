package com.glide.app.presentation.partner.catalog

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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.domain.model.OwnService

@Composable
fun ServicesScreen(shopId: String, viewModel: ServicesViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    LaunchedEffect(shopId) { viewModel.load(shopId) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Services", style = MaterialTheme.typography.headlineSmall)

        Card(modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = uiState.form.name,
                    onValueChange = { viewModel.onFormChanged(uiState.form.copy(name = it)) },
                    label = { Text("Service name") },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = uiState.form.priceRupees,
                    onValueChange = { viewModel.onFormChanged(uiState.form.copy(priceRupees = it)) },
                    label = { Text("Price (₹)") },
                    isError = uiState.fieldErrors.priceRupees != null,
                    supportingText = { uiState.fieldErrors.priceRupees?.let { Text(it) } },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = uiState.form.durationMin,
                    onValueChange = { viewModel.onFormChanged(uiState.form.copy(durationMin = it)) },
                    label = { Text("Duration (min)") },
                    isError = uiState.fieldErrors.durationMin != null,
                    supportingText = { uiState.fieldErrors.durationMin?.let { Text(it) } },
                    modifier = Modifier.fillMaxWidth(),
                )
                uiState.submitError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { viewModel.submit(shopId) }) {
                        Text(if (uiState.editingServiceId == null) "Add service" else "Save changes")
                    }
                    if (uiState.editingServiceId != null) {
                        Button(onClick = { viewModel.startEditing(null) }) { Text("Cancel") }
                    }
                }
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(top = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(uiState.services) { service -> ServiceRow(service, viewModel) }
        }
    }
}

@Composable
private fun ServiceRow(service: OwnService, viewModel: ServicesViewModel) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(service.name, style = MaterialTheme.typography.titleSmall)
                Text("₹${service.price / 100.0} · ${service.durationMin} min", style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = service.isActive, onCheckedChange = { viewModel.setActive(service.id, it) })
            Button(onClick = { viewModel.startEditing(service) }) { Text("Edit") }
        }
    }
}
