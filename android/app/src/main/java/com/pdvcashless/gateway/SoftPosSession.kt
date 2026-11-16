package com.pdvcashless.gateway

/**
 * Credenciais Cielo vindas do backend (softpos_request.cielo) para a sessão atual.
 * O flavor cielo usa estes valores se não vazios; senão cai no BuildConfig do APK.
 */
object SoftPosSession {
    @Volatile
    var cieloClientId: String? = null

    @Volatile
    var cieloAccessToken: String? = null

    fun applyCielo(clientId: String?, accessToken: String?) {
        cieloClientId = clientId?.trim()?.takeIf { it.isNotEmpty() }
        cieloAccessToken = accessToken?.trim()?.takeIf { it.isNotEmpty() }
    }

    fun clear() {
        cieloClientId = null
        cieloAccessToken = null
    }
}
