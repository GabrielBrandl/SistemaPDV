package com.pdvcashless.gateway

/** Stub SoftPOS Stone — plugar SDK oficial Tap to Phone / SoftPOS */
class StoneGateway : PaymentGateway {
    override suspend fun processContactless(amountCents: Long, type: PaymentType): PaymentResult {
        // TODO: Stone SoftPOS SDK
        return PaymentResult(true, "STONE-SOFTPOS-${System.currentTimeMillis()}", null)
    }

    override suspend fun processPix(amountCents: Long): PaymentResult {
        return PaymentResult(true, "STONE-PIX-${System.currentTimeMillis()}", null)
    }

    override suspend fun cancelPayment(transactionId: String): Boolean = true

    override suspend fun getTransactionStatus(id: String): TransactionStatus =
        TransactionStatus.APPROVED
}
