package com.pdvcashless.gateway

import android.content.Intent

class MercadoPagoGateway : PaymentGateway {
    override suspend fun activate(activationCode: String) =
        PaymentResult(false, null, "Use o flavor mercadopago neste terminal")

    override suspend fun doPayment(amountCents: Int, type: PaymentType, userReference: String) =
        PaymentResult(false, null, "Use o flavor mercadopago neste terminal")

    override suspend fun abort() = false

    fun onResult(intent: Intent?) {}
}
