package com.glide.app.core.sms

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status

private val OTP_REGEX = Regex("\\d{6}")

/**
 * Free (no added cost, no READ_SMS/RECEIVE_SMS permission needed) auto-read of an
 * incoming OTP SMS via Google Play Services' SMS User Consent API. The user still sees
 * a one-tap system dialog per message ("Allow [app] to read this SMS?") — this cannot
 * silently read SMS in the background. Falls back to nothing (manual entry still
 * works) if Play Services isn't available or the user declines the dialog.
 */
@Composable
fun SmsAutoReadEffect(onCodeDetected: (String) -> Unit) {
    val context = LocalContext.current
    val currentOnCodeDetected by rememberUpdatedState(onCodeDetected)

    // The consent Intent handed back by SmsRetriever is a plain Intent meant for
    // startActivityForResult, not an IntentSender/PendingIntent — StartActivityForResult
    // is the correct contract here, not StartIntentSenderForResult.
    val consentLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val message = result.data?.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE)
            val code = message?.let { OTP_REGEX.find(it)?.value }
            if (code != null) currentOnCodeDetected(code)
        }
    }

    DisposableEffect(Unit) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(receiverContext: Context, intent: Intent) {
                if (intent.action != SmsRetriever.SMS_RETRIEVED_ACTION) return
                val extras = intent.extras ?: return
                val status = extras.get(SmsRetriever.EXTRA_STATUS) as? Status ?: return
                if (status.statusCode == CommonStatusCodes.SUCCESS) {
                    val consentIntent = extras.getParcelable<Intent>(SmsRetriever.EXTRA_CONSENT_INTENT)
                    consentIntent?.let { runCatching { consentLauncher.launch(it) } }
                }
            }
        }

        val filter = IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION)
        ContextCompat.registerReceiver(context, receiver, filter, ContextCompat.RECEIVER_EXPORTED)
        SmsRetriever.getClient(context).startSmsUserConsent(null)

        onDispose { context.unregisterReceiver(receiver) }
    }
}
