package com.glide.app.data.repository

import com.glide.app.domain.model.PaymentOrder
import com.glide.app.domain.repository.PaymentRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
private data class CreatePaymentOrderRequest(@SerialName("booking_id") val bookingId: String)

@Serializable
private data class PaymentOrderResponse(
    val orderId: String? = null,
    val amount: Long? = null,
    val keyId: String? = null,
    val error: String? = null,
)

private val json = Json { ignoreUnknownKeys = true }

@Singleton
class SupabasePaymentRepository @Inject constructor(
    private val supabase: SupabaseClient,
) : PaymentRepository {

    override suspend fun createPaymentOrder(bookingId: String): PaymentOrder {
        val response = supabase.functions.invoke("create-payment-order") {
            contentType(ContentType.Application.Json)
            setBody(json.encodeToString(CreatePaymentOrderRequest.serializer(), CreatePaymentOrderRequest(bookingId)))
        }
        val text = response.bodyAsText()
        val decoded = runCatching { json.decodeFromString(PaymentOrderResponse.serializer(), text) }.getOrNull()
        if (decoded?.error != null) throw IllegalStateException(decoded.error)
        val orderId = decoded?.orderId
        val amount = decoded?.amount
        val keyId = decoded?.keyId
        if (orderId == null || amount == null || keyId == null) {
            throw IllegalStateException("Unexpected response from server: $text")
        }
        return PaymentOrder(orderId, amount, keyId)
    }
}
