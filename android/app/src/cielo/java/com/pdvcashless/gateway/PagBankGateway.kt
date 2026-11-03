package com.pdvcashless.gateway

/** Stub — PlugPag só existe no flavor pagbank. */
class PagBankGateway(@Suppress("UNUSED_PARAMETER") context: android.content.Context) : PaymentGateway {
    override suspend fun activate(activationCode: String) =
        PaymentResult(false, null, "Use o flavor pagbank neste terminal")

    override suspend fun doPayment(amountCents: Int, type: PaymentType, userReference: String) =
        PaymentResult(false, null, "Use o flavor pagbank neste terminal")

    override suspend fun abort() = false
}
