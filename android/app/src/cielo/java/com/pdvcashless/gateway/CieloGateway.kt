package com.pdvcashless.gateway

import android.content.Intent
import android.net.Uri
import android.util.Base64
import com.pdvcashless.BuildConfig
import org.json.JSONArray
import org.json.JSONObject
import kotlin.coroutines.Continuation
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

/**
 * Cielo Smart (LIO / DX) via Deep Link — sem SDK legado.
 * Docs: https://docs.cielo.com.br/cielo-smart/docs/integracao-via-deep-link
 *
 * Chama lio://payment?request=<base64>&urlCallback=order://response
 * e a Cielo devolve o resultado em PayActivity (scheme order://response).
 */
class CieloGateway : PaymentGateway {
    @Volatile
    private var pending: Continuation<PaymentResult>? = null

    override suspend fun activate(activationCode: String): PaymentResult {
        val ok = BuildConfig.CIELO_CLIENT_ID.isNotBlank() &&
            BuildConfig.CIELO_ACCESS_TOKEN.isNotBlank()
        return PaymentResult(
            success = ok,
            transactionId = null,
            message = if (ok) {
                "Cielo Smart pronta (Client ID configurado)"
            } else {
                "Defina CIELO_CLIENT_ID e CIELO_ACCESS_TOKEN no flavor cielo"
            },
        )
    }

    override suspend fun doPayment(
        amountCents: Int,
        type: PaymentType,
        userReference: String,
    ): PaymentResult {
        val activity = TerminalActivityHolder.current
            ?: return PaymentResult(false, null, "Activity Cielo não disponível")

        val clientId = BuildConfig.CIELO_CLIENT_ID
        val accessToken = BuildConfig.CIELO_ACCESS_TOKEN
        if (clientId.isBlank() || accessToken.isBlank()) {
            return PaymentResult(
                false,
                null,
                "Configure CIELO_CLIENT_ID e CIELO_ACCESS_TOKEN no flavor cielo",
            )
        }

        val paymentCode = when (type) {
            PaymentType.DEBIT -> "DEBITO_AVISTA"
            PaymentType.CREDIT -> "CREDITO_AVISTA"
            PaymentType.PIX -> "PIX"
        }

        val items = JSONArray().put(
            JSONObject()
                .put("name", "Comanda PDV")
                .put("quantity", 1)
                .put("sku", userReference.take(10))
                .put("unitOfMeasure", "unidade")
                .put("unitPrice", amountCents)
                .put("price", amountCents),
        )

        val payload = JSONObject()
            .put("accessToken", accessToken)
            .put("clientID", clientId)
            .put("reference", userReference)
            .put("installments", 0)
            .put("items", items)
            .put("paymentCode", paymentCode)
            .put("value", amountCents)

        val base64 = Base64.encodeToString(
            payload.toString().toByteArray(Charsets.UTF_8),
            Base64.NO_WRAP,
        )
        val uri = Uri.parse("lio://payment?request=$base64&urlCallback=order://response")

        return suspendCoroutine { cont ->
            pending = cont
            try {
                activity.startActivity(
                    Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP),
                )
            } catch (e: Exception) {
                pending = null
                cont.resume(
                    PaymentResult(
                        false,
                        null,
                        e.message ?: "App Cielo Smart não encontrado neste terminal",
                    ),
                )
            }
        }
    }

    override suspend fun abort(): Boolean {
        pending?.resume(PaymentResult(false, null, "Cancelado"))
        pending = null
        return true
    }

    fun onDeepLinkResult(uri: Uri?) {
        val cont = pending ?: return
        pending = null
        if (uri == null) {
            cont.resume(PaymentResult(false, null, "Sem retorno da Cielo"))
            return
        }
        try {
            val encoded = uri.getQueryParameter("response") ?: ""
            val json = String(Base64.decode(encoded, Base64.DEFAULT), Charsets.UTF_8)
            val obj = JSONObject(json)
            val code = obj.optString("code", obj.optString("status", ""))
            val approved = code.equals("SUCCESS", true) ||
                code.equals("PAID", true) ||
                code.equals("0", true) ||
                obj.optInt("code", -1) == 0
            cont.resume(
                PaymentResult(
                    success = approved,
                    transactionId = obj.optString("id").ifBlank {
                        obj.optString("cieloCode").ifBlank { obj.optString("authCode") }
                    },
                    message = obj.optString("message").ifBlank { json.take(180) },
                ),
            )
        } catch (e: Exception) {
            cont.resume(PaymentResult(false, null, e.message ?: "Falha ao ler retorno Cielo"))
        }
    }
}
