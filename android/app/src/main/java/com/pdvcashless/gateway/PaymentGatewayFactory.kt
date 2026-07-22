package com.pdvcashless.gateway

enum class Acquirer {
    STONE, CIELO, PAGSEGURO, GENERIC
}

object PaymentGatewayFactory {
    fun create(acquirer: Acquirer = Acquirer.STONE): PaymentGateway = when (acquirer) {
        Acquirer.STONE -> StoneGateway()
        Acquirer.CIELO -> CieloGateway()
        Acquirer.PAGSEGURO -> PagSeguroGateway()
        Acquirer.GENERIC -> GenericTEFGateway()
    }
}

class CieloGateway : PaymentGateway {
    override suspend fun processPayment(amount: Long, type: PaymentType) =
        PaymentResult(true, "CIELO-${System.currentTimeMillis()}", null)
    override suspend fun cancelPayment(transactionId: String) = true
    override suspend fun getTransactionStatus(id: String) = TransactionStatus.APPROVED
}

class PagSeguroGateway : PaymentGateway {
    override suspend fun processPayment(amount: Long, type: PaymentType) =
        PaymentResult(true, "PAGSEGURO-${System.currentTimeMillis()}", null)
    override suspend fun cancelPayment(transactionId: String) = true
    override suspend fun getTransactionStatus(id: String) = TransactionStatus.APPROVED
}

class GenericTEFGateway : PaymentGateway {
    override suspend fun processPayment(amount: Long, type: PaymentType) =
        PaymentResult(false, null, "Adquirente não configurado")
    override suspend fun cancelPayment(transactionId: String) = false
    override suspend fun getTransactionStatus(id: String) = TransactionStatus.DECLINED
}
