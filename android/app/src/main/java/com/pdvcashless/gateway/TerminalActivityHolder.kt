package com.pdvcashless.gateway

import android.app.Activity

object TerminalActivityHolder {
    @Volatile
    var current: Activity? = null
}
