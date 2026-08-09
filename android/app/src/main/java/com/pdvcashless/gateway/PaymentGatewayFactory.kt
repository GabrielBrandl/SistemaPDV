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
        val g =
            if (BuildConfig.DEMO_PAYMENT || !BuildConfig.HAS_PLUGPAG) {
                DemoGateway()
            } else {
                PagBankGateway(appContext)
            }
        gateway = g
        return g
    }

    fun usePagBank() {
        gateway = PagBankGateway(appContext)
    }

    fun useDemo() {
        gateway = DemoGateway()
    }
}
