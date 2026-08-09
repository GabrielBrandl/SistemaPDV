package com.pdvcashless

import android.app.Application
import com.pdvcashless.api.SessionStore
import com.pdvcashless.gateway.PaymentGatewayFactory

class PdvApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SessionStore.init(this)
        PaymentGatewayFactory.init(this)
    }
}
