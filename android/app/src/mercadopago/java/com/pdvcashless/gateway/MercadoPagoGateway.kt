package com.pdvcashless.gateway

import android.content.Intent
import android.net.Uri
import kotlin.coroutines.Continuation
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

/**
 * Mercado Pago Point Smart.
 * 1) Tenta o app nativo do terminal (scheme mercadopago://point).
 * 2) Se o app não abrir, a cobrança segue pela API Point no backend
 *    (order enviada ao terminal_id) — o PDV consulta o status.
 *
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/mp-point/overview
 */
class MercadoPagoGateway : PaymentGateway {
    @Volatile
    private var pending: Continuation<PaymentResult>? = null

    override suspend fun activate(activationCode: String): PaymentResult {
        return PaymentResult(
            true,
            null,
            "Point Smart: terminal em modo PDV + Access Token no backend",
        )
    }

    override suspend fun doPayment(
        amountCents: Int,
        type: PaymentType,
        userReference: String,
    ): PaymentResult {
        val activity = TerminalActivityHolder.current
            ?: return PaymentResult(
                false,
                null,
                "Pague no Point — cobrança enviada ao terminal",
                awaitRemote = true,
            )

        val amount = "%.2f".format(amountCents / 100.0)
        val method = when (type) {
            PaymentType.DEBIT -> "debit_card"
            PaymentType.CREDIT -> "credit_card"
            PaymentType.PIX -> "qr"
        }

        val uri = Uri.parse("mercadopago://point")
            .buildUpon()
            .appendQueryParameter("amount", amount)
            .appendQueryParameter("method", method)
            .appendQueryParameter("external_reference", userReference)
            .appendQueryParameter("callback", "pdvcashless://mp-point")
            .build()

        return suspendCoroutine { cont ->
            pending = cont
            try {
                activity.startActivity(Intent(Intent.ACTION_VIEW, uri))
            } catch (_: Exception) {
                try {
                    val fallback = Intent("com.mercadopago.PAYMENT").apply {
                        putExtra("amount", amountCents)
                        putExtra("payment_method", method)
                        putExtra("external_reference", userReference)
                    }
                    activity.startActivity(fallback)
                } catch (_: Exception) {
                    pending = null
                    cont.resume(
                        PaymentResult(
                            success = false,
                            transactionId = null,
                            message = "Pague no Point — a cobrança já foi enviada ao terminal",
                            awaitRemote = true,
                        ),
                    )
                }
            }
        }
    }

    override suspend fun abort(): Boolean {
        pending?.resume(PaymentResult(false, null, "Cancelado"))
        pending = null
        return true
    }

    fun onResult(intent: Intent?) {
        val cont = pending ?: return
        pending = null
        val approved = intent?.getBooleanExtra("approved", false) == true ||
            intent?.data?.getQueryParameter("status") == "approved"
        val tx = intent?.getStringExtra("payment_id")
            ?: intent?.data?.getQueryParameter("payment_id")
        cont.resume(
            PaymentResult(
                success = approved,
                transactionId = tx,
                message = if (approved) "Aprovado no Point" else "Não aprovado no Point",
            ),
        )
    }

    fun onDeepLinkResult(uri: android.net.Uri?) {
        onResult(Intent(Intent.ACTION_VIEW, uri))
    }
}
