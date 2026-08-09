package com.pdvcashless.gateway

import kotlinx.coroutines.delay

/** Simula aprovações fora do terminal PagBank (emulador / homologação de UI). */
class DemoGateway : PaymentGateway {
    override suspend fun activate(activationCode: String): PaymentResult {
        delay(400)
        return PaymentResult(true, null, "Demo: ativação simulada")
    }

    override suspend fun doPayment(
        amountCents: Int,
        type: PaymentType,
        userReference: String,
    ): PaymentResult {
        delay(1200)
        return PaymentResult(
            success = true,
            transactionId = "DEMO-${System.currentTimeMillis()}",
            message = "Demo: ${type.name} R$ ${"%.2f".format(amountCents / 100.0)} aprovado",
        )
    }

    override suspend fun abort(): Boolean = true
}
