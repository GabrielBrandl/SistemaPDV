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
)

interface PaymentGateway {
    /** Ativa o terminal PagBank (código de ativação do estabelecimento). */
    suspend fun activate(activationCode: String): PaymentResult

    /** Débito/crédito/PIX via PlugPag no terminal SmartPOS. */
    suspend fun doPayment(
        amountCents: Int,
        type: PaymentType,
        userReference: String,
    ): PaymentResult

    suspend fun abort(): Boolean
}
