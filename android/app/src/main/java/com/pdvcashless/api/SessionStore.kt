package com.pdvcashless.api

import android.content.Context
import android.content.SharedPreferences

object SessionStore {
    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences("pdv_session", Context.MODE_PRIVATE)
    }

    var token: String?
        get() = prefs.getString("token", null)
        set(value) = prefs.edit().putString("token", value).apply()

    var userName: String?
        get() = prefs.getString("user_name", null)
        set(value) = prefs.edit().putString("user_name", value).apply()

    var userRole: String?
        get() = prefs.getString("user_role", null)
        set(value) = prefs.edit().putString("user_role", value).apply()

    var apiBaseUrl: String
        get() = prefs.getString("api_base", null) ?: BuildConfigDefaults.apiBaseUrl
        set(value) = prefs.edit().putString("api_base", value.trimEnd('/')).apply()

    fun clear() {
        prefs.edit().clear().apply()
    }
}

/** Evita import circular do BuildConfig em object estático no init */
internal object BuildConfigDefaults {
    val apiBaseUrl: String
        get() = try {
            Class.forName("com.pdvcashless.BuildConfig")
                .getField("API_BASE_URL")
                .get(null) as String
        } catch (_: Exception) {
            "http://10.0.2.2:3001/api/v1"
        }
}
