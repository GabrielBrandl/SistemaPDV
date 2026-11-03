package com.pdvcashless.gateway

import android.content.Context
import com.pdvcashless.BuildConfig

object PaymentGatewayFactory {
    private lateinit var appContext: Context
    private var gateway: PaymentGateway? = null

    fun init(context: Context) {
        appContext = context.applicationContext
    }

    fun get(): PaymentGateway {
        gateway?.let { return it }
        val g = when {
            BuildConfig.DEMO_PAYMENT -> DemoGateway()
            BuildConfig.HAS_PLUGPAG -> PagBankGateway(appContext)
            BuildConfig.HAS_CIELO -> CieloGateway()
            BuildConfig.HAS_MERCADOPAGO -> MercadoPagoGateway()
            else -> DemoGateway()
        }
        gateway = g
        return g
    }

    fun usePagBank() {
        gateway = PagBankGateway(appContext)
    }

    fun useCielo() {
        gateway = CieloGateway()
    }

    fun useMercadoPago() {
        gateway = MercadoPagoGateway()
    }

    fun useDemo() {
        gateway = DemoGateway()
    }
}
