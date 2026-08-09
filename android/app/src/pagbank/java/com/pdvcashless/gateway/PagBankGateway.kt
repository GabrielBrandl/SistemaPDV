package com.pdvcashless.gateway

import android.content.Context
import android.util.Log
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPag
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentData
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Integração oficial PagBank SmartPOS (Moderninha) via PlugPagServiceWrapper.
 * Compilado apenas no flavor `pagbank`.
 */
class PagBankGateway(context: Context) : PaymentGateway {
    private val plugPag = PlugPag(context)

    override suspend fun activate(activationCode: String): PaymentResult =
        withContext(Dispatchers.IO) {
            try {
                val result = plugPag.initializeAndActivatePinpad(
                    PlugPagActivationData(activationCode),
                )
                if (result.result == PlugPag.RET_OK) {
                    PaymentResult(true, null, "Terminal ativado")
                } else {
                    PaymentResult(false, null, result.message ?: "Falha na ativação", result.result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "activate", e)
                PaymentResult(false, null, e.message)
            }
        }

    override suspend fun doPayment(
        amountCents: Int,
        type: PaymentType,
        userReference: String,
    ): PaymentResult =
        withContext(Dispatchers.IO) {
            try {
                val plugType = when (type) {
                    PaymentType.DEBIT -> PlugPag.TYPE_DEBITO
                    PaymentType.CREDIT -> PlugPag.TYPE_CREDITO
                    PaymentType.PIX -> resolvePixType()
                }
                val data = PlugPagPaymentData(
                    type = plugType,
                    amount = amountCents,
                    installmentType = PlugPag.INSTALLMENT_TYPE_A_VISTA,
                    installments = 1,
                    userReference = userReference.take(10),
                    printReceipt = true,
                )
                val result = plugPag.doPayment(data)
                if (result.result == PlugPag.RET_OK) {
                    PaymentResult(
                        success = true,
                        transactionId = result.transactionCode
                            ?: result.transactionId
                            ?: "OK",
                        message = "Aprovado",
                        rawCode = result.result,
                    )
                } else {
                    PaymentResult(
                        success = false,
                        transactionId = result.transactionCode,
                        message = result.message ?: "Negado/cancelado",
                        rawCode = result.result,
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "doPayment", e)
                PaymentResult(false, null, e.message)
            }
        }

    override suspend fun abort(): Boolean =
        withContext(Dispatchers.IO) {
            try {
                plugPag.abort()
                true
            } catch (_: Exception) {
                false
            }
        }

    private fun resolvePixType(): Int {
        return try {
            PlugPag::class.java.getField("TYPE_PIX").getInt(null)
        } catch (_: Exception) {
            try {
                PlugPag::class.java.getField("TYPE_QRCODE").getInt(null)
            } catch (_: Exception) {
                PlugPag.TYPE_DEBITO
            }
        }
    }

    companion object {
        private const val TAG = "PagBankGateway"
    }
}
