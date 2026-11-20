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

    private fun resolveClientId(): String =
        SoftPosSession.cieloClientId?.takeIf { it.isNotBlank() }
            ?: BuildConfig.CIELO_CLIENT_ID

    /** Token só no APK (BuildConfig) — backend não deve enviar accessToken. */
    private fun resolveAccessToken(): String =
        SoftPosSession.cieloAccessToken?.takeIf { it.isNotBlank() }
            ?: BuildConfig.CIELO_ACCESS_TOKEN

    override suspend fun activate(activationCode: String): PaymentResult {
        val ok = resolveClientId().isNotBlank() && resolveAccessToken().isNotBlank()
        return PaymentResult(
            success = ok,
            transactionId = null,
            message = if (ok) {
                "Terminal pronto (credenciais configuradas)"
            } else {
                "Credenciais do terminal ausentes no APK (Client ID / Access Token)"
            },
        )
    }

    override suspend fun doPayment(
        amountCents: Int,
        type: PaymentType,
        userReference: String,
    ): PaymentResult {
        val activity = TerminalActivityHolder.current
            ?: return PaymentResult(false, null, "Tela de pagamento não disponível")

        val clientId = resolveClientId()
        val accessToken = resolveAccessToken()
        if (clientId.isBlank() || accessToken.isBlank() ||
            clientId == "HOMOLOG_REPLACE_ME" || accessToken == "HOMOLOG_REPLACE_ME"
        ) {
            return PaymentResult(
                false,
                null,
                "Credenciais do terminal ausentes no APK (Client ID / Access Token)",
            )
        }
        if (amountCents <= 0) {
            return PaymentResult(false, null, "Valor inválido para pagamento")
        }

        val paymentCode = when (type) {
            PaymentType.DEBIT -> "DEBITO_AVISTA"
            PaymentType.CREDIT -> "CREDITO_AVISTA"
            PaymentType.PIX -> "PIX"
        }

        val sku = userReference.filter { it.isLetterOrDigit() }.take(20).ifBlank { "pdv" }
        val items = JSONArray().put(
            JSONObject()
                .put("name", "Comanda PDV")
                .put("quantity", 1)
                .put("sku", sku)
                .put("unitOfMeasure", "unidade")
                .put("unitPrice", amountCents),
        )

        // Formato oficial Deep Link (value em centavos; reference opcional).
        val payload = JSONObject()
            .put("accessToken", accessToken)
            .put("clientID", clientId)
            .put("reference", userReference.take(40))
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
                // Obrigatório pela Cielo: FGS ativo durante o app de pagamento.
                PaymentKeepAliveService.start(activity.applicationContext)
                activity.startActivity(
                    Intent(Intent.ACTION_VIEW, uri)
                        .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK),
                )
            } catch (e: Exception) {
                pending = null
                PaymentKeepAliveService.stop(activity.applicationContext)
                cont.resume(
                    PaymentResult(
                        false,
                        null,
                        e.message ?: "App de pagamento do terminal não encontrado",
                    ),
                )
            }
        }
    }

    override suspend fun abort(): Boolean {
        val activity = TerminalActivityHolder.current
        activity?.let { PaymentKeepAliveService.stop(it.applicationContext) }
        pending?.resume(PaymentResult(false, null, "Cancelado"))
        pending = null
        return true
    }

    fun onDeepLinkResult(uri: Uri?) {
        val cont = pending ?: return
        pending = null
        TerminalActivityHolder.current?.let {
            PaymentKeepAliveService.stop(it.applicationContext)
        }
        if (uri == null) {
            cont.resume(PaymentResult(false, null, "Sem retorno do terminal de pagamento"))
            return
        }
        try {
            val encoded = uri.getQueryParameter("response") ?: ""
            if (encoded.isBlank()) {
                cont.resume(PaymentResult(false, null, "Retorno do pagamento sem parâmetro response"))
                return
            }
            val json = String(Base64.decode(encoded, Base64.DEFAULT), Charsets.UTF_8)
            cont.resume(parsePaymentResponse(json))
        } catch (e: Exception) {
            cont.resume(PaymentResult(false, null, e.message ?: "Falha ao ler retorno do pagamento"))
        }
    }

    /**
     * Sucesso típico: Order com status ENTERED/PAID e array payments preenchido.
     * Erro: { "code": 2, "reason": "..." }.
     */
    private fun parsePaymentResponse(json: String): PaymentResult {
        val obj = JSONObject(json)

        if (obj.has("code") && !obj.has("payments") && !obj.has("paidAmount")) {
            val code = obj.optInt("code", -1)
            val reason = obj.optString("reason").ifBlank { obj.optString("message") }
            if (code != 0) {
                return PaymentResult(
                    false,
                    null,
                    reason.ifBlank { "Pagamento recusado (code=$code)" },
                    rawCode = code,
                )
            }
        }

        val payments = obj.optJSONArray("payments")
        val paidAmount = obj.optLong("paidAmount", -1)
        val status = obj.optString("status")
        val hasPayment = payments != null && payments.length() > 0
        val statusOk = status.equals("ENTERED", true) ||
            status.equals("PAID", true) ||
            status.equals("SUCCESS", true) ||
            status.equals("CLOSED", true)

        val codeStr = obj.optString("code", obj.optString("status", ""))
        val codeOk = codeStr.equals("SUCCESS", true) ||
            codeStr.equals("PAID", true) ||
            codeStr.equals("0", true) ||
            obj.optInt("code", -1) == 0

        val approved = hasPayment || (paidAmount > 0 && statusOk) || codeOk
        if (!approved) {
            return PaymentResult(
                false,
                null,
                obj.optString("reason").ifBlank {
                    obj.optString("message").ifBlank { "Pagamento não aprovado ($status)" }
                },
            )
        }

        var txId = obj.optString("id")
        if (hasPayment) {
            val first = payments!!.optJSONObject(0)
            if (first != null) {
                txId = first.optString("id").ifBlank {
                    first.optString("paymentTransactionId").ifBlank {
                        first.optString("cieloCode").ifBlank {
                            first.optString("authCode").ifBlank {
                                first.optJSONObject("paymentFields")
                                    ?.optString("paymentTransactionId")
                                    .orEmpty()
                            }
                        }
                    }
                }.ifBlank { txId }
            }
        }

        return PaymentResult(
            success = true,
            transactionId = txId.ifBlank { null },
            message = obj.optString("message").ifBlank { "Aprovado" },
        )
    }
}
