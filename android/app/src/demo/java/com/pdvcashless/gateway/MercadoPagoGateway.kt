package com.pdvcashless.gateway

import android.content.Intent

class MercadoPagoGateway : PaymentGateway {
    override suspend fun activate(activationCode: String) =
        PaymentResult(true, null, "Demo Point")

    override suspend fun doPayment(amountCents: Int, type: PaymentType, userReference: String) =
        PaymentResult(true, "MP-DEMO-${System.currentTimeMillis()}", "Demo Point")

    override suspend fun abort() = true

    fun onResult(intent: Intent?) {}
}
