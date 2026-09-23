package com.glide.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.glide.app.core.payments.PaymentResultBus
import com.glide.app.domain.model.PaymentCheckoutResult
import com.glide.app.navigation.AppNavHost
import com.glide.app.ui.theme.GlideTheme
import com.razorpay.Checkout
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity(), PaymentResultWithDataListener {

    @Inject lateinit var paymentResultBus: PaymentResultBus

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Faster Checkout form load — recommended to call as early as possible.
        Checkout.preload(applicationContext)
        setContent {
            GlideTheme {
                AppNavHost()
            }
        }
    }

    // The Razorpay SDK's success/error callbacks land here (the launching Activity), not on
    // whatever screen is visible — this is a UI hint only, forwarded to whoever's listening.
    // The real confirmation is razorpay-webhook flipping the booking server-side.
    override fun onPaymentSuccess(razorpayPaymentId: String?, data: PaymentData?) {
        paymentResultBus.emit(PaymentCheckoutResult.Success(razorpayPaymentId ?: ""))
    }

    override fun onPaymentError(code: Int, response: String?, data: PaymentData?) {
        paymentResultBus.emit(PaymentCheckoutResult.Failed(code, response))
    }
}
