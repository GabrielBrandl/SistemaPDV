package com.pdvcashless.gateway

import android.net.Uri

class CieloGateway : PaymentGateway {
    override suspend fun activate(activationCode: String) =
        PaymentResult(false, null, "Use o flavor cielo neste terminal")

    override suspend fun doPayment(amountCents: Int, type: PaymentType, userReference: String) =
        PaymentResult(false, null, "Use o flavor cielo neste terminal")

    override suspend fun abort() = false

    fun onDeepLinkResult(uri: Uri?) {}
}
