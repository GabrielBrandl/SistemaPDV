package com.pdvcashless.gateway

/**
 * SoftPOS / Tap to Phone no celular Android.
 * Providers: Stone SoftPOS, PagBank Tap on Phone, Mercado Pago, Cielo SoftPOS.
 * O PDV web chama POST /payments/card e o app nativo processa softposRequest.
 */
enum class PaymentType {
    DEBIT, CREDIT, PIX
}

data class PaymentResult(
    val success: Boolean,
    val transactionId: String?,
    val message: String?
)

enum class TransactionStatus {
    PENDING, APPROVED, DECLINED, CANCELLED
}

interface PaymentGateway {
    /** Cartão contactless via NFC do telefone (SoftPOS) */
    suspend fun processContactless(amountCents: Long, type: PaymentType): PaymentResult

    /** PIX — preferir fluxo web/API; mantido para app nativo */
    suspend fun processPix(amountCents: Long): PaymentResult

    suspend fun cancelPayment(transactionId: String): Boolean
    suspend fun getTransactionStatus(id: String): TransactionStatus
}
