package com.glide.app.presentation.customer.checkout

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.glide.app.domain.model.PaymentOrder
import com.glide.app.ui.theme.CustomerColors
import com.razorpay.Checkout
import org.json.JSONObject

@Composable
fun PaymentScreen(
    bookingId: String,
    onCheckoutFinished: () -> Unit,
    viewModel: PaymentViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val activity = LocalContext.current as? Activity

    LaunchedEffect(bookingId) { viewModel.load(bookingId) }

    LaunchedEffect(uiState.order, activity) {
        val order = uiState.order ?: return@LaunchedEffect
        val currentActivity = activity ?: return@LaunchedEffect
        launchRazorpayCheckout(currentActivity, order)
    }

    LaunchedEffect(uiState.checkoutFinished) {
        if (uiState.checkoutFinished) onCheckoutFinished()
    }

    Scaffold { innerPadding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(innerPadding).padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            if (uiState.error != null && uiState.order == null) {
                Text(uiState.error ?: "", color = MaterialTheme.colorScheme.error)
            } else {
                CircularProgressIndicator(color = CustomerColors.Accent)
                Text(
                    "Opening secure checkout…",
                    modifier = Modifier.padding(top = 16.dp),
                    color = CustomerColors.MutedText,
                )
            }
        }
    }
}

/**
 * The client-side onPaymentSuccess/onPaymentError callback is a UI hint only — the real
 * confirmation is razorpay-webhook, server-side. This just opens the SDK's checkout form;
 * MainActivity's listener forwards whatever happens back through PaymentResultBus.
 */
private fun launchRazorpayCheckout(activity: Activity, order: PaymentOrder) {
    val checkout = Checkout()
    checkout.setKeyID(order.keyId)
    val options = JSONObject().apply {
        put("name", "GLIDE")
        put("description", "Salon booking")
        put("currency", "INR")
        put("order_id", order.orderId)
        put("amount", order.amount.toString())
    }
    runCatching { checkout.open(activity, options) }
}
