package com.pdvcashless.api

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

interface PdvApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @GET("products")
    suspend fun products(): List<ProductDto>

    @POST("comandas/nfc/tap")
    suspend fun nfcTap(@Body body: NfcTapRequest): NfcTapResponse

    @POST("comandas/{id}/items")
    suspend fun addItems(@Path("id") id: String, @Body body: AddItemsRequest): ComandaDto

    @GET("comandas/{id}")
    suspend fun getComanda(@Path("id") id: String): ComandaDto

    @POST("comandas/{id}/close")
    suspend fun closeComanda(@Path("id") id: String, @Body body: Map<String, String> = emptyMap()): ComandaDto

    @POST("payments/pix")
    suspend fun createPix(@Body body: CreatePixPaymentRequest): PaymentIntentDto

    @POST("payments/card")
    suspend fun createCard(@Body body: CreateCardPaymentRequest): PaymentIntentDto

    @POST("payments/{id}/confirm")
    suspend fun confirmPayment(
        @Path("id") id: String,
        @Body body: ConfirmPaymentRequest,
    ): ConfirmPaymentResponse

    @POST("exit/check")
    suspend fun exitCheck(@Body body: ExitCheckRequest): ExitCheckResponse

    @POST("exit/release")
    suspend fun exitRelease(@Body body: ExitReleaseRequest): Map<String, Any>
}

object ApiClient {
    @Volatile
    private var api: PdvApi? = null

    fun get(): PdvApi {
        val base = SessionStore.apiBaseUrl.ensureSlash()
        val current = api
        if (current != null && lastBase == base) return current
        return rebuild(base)
    }

    fun rebuild(baseUrl: String = SessionStore.apiBaseUrl): PdvApi {
        lastBase = baseUrl.ensureSlash()
        val auth = Interceptor { chain ->
            val req = chain.request().newBuilder()
            SessionStore.token?.let { req.header("Authorization", "Bearer $it") }
            chain.proceed(req.build())
        }
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        val client = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .addInterceptor(auth)
            .addInterceptor(logging)
            .build()
        val retrofit = Retrofit.Builder()
            .baseUrl(lastBase)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        return retrofit.create(PdvApi::class.java).also { api = it }
    }

    private var lastBase: String = ""

    private fun String.ensureSlash(): String =
        if (endsWith("/")) this else "$this/"
}
