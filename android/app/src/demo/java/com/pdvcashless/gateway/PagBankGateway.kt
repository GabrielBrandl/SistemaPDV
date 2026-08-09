package com.pdvcashless.gateway

import android.content.Context

/**
 * Stub do flavor demo — PagBank real só no flavor `pagbank`.
 */
class PagBankGateway(context: Context) : PaymentGateway by DemoGateway() {
    init {
        // context reserved for API parity with pagbank flavor
        context.applicationContext
    }
}
