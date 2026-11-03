package com.pdvcashless.gateway

import android.net.Uri

class CieloGateway : PaymentGateway {
    override suspend fun activate(activationCode: String) =
        PaymentResult(true, null, "Demo Cielo")

    override suspend fun doPayment(amountCents: Int, type: PaymentType, userReference: String) =
        PaymentResult(true, "CIELO-DEMO-${System.currentTimeMillis()}", "Demo Cielo")

    override suspend fun abort() = true

    fun onDeepLinkResult(uri: Uri?) {}
}
