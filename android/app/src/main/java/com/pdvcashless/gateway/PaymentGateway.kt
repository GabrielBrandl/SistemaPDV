package com.pdvcashless.gateway

enum class PaymentType {
    DEBIT,
    CREDIT,
    PIX,
}

data class PaymentResult(
    val success: Boolean,
    val transactionId: String?,
    val message: String?,
    val rawCode: Int? = null,
    /** Cobrança já foi ao terminal (Point API). O app deve consultar o backend. */
    val awaitRemote: Boolean = false,
)

interface PaymentGateway {
    /** Ativa o terminal (código PagBank / credenciais Cielo / login Point). */
    suspend fun activate(activationCode: String): PaymentResult

    /** Débito/crédito/PIX no terminal (PlugPag, Cielo Deep Link ou Point). */
    suspend fun doPayment(
        amountCents: Int,
        type: PaymentType,
        userReference: String,
    ): PaymentResult

    suspend fun abort(): Boolean
}
