package com.pdvcashless.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.pdvcashless.BuildConfig
import com.pdvcashless.api.ApiClient
import com.pdvcashless.api.LoginRequest
import com.pdvcashless.api.SessionStore
import com.pdvcashless.databinding.ActivityLoginBinding
import com.pdvcashless.gateway.PaymentGatewayFactory
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.inputApi.setText(SessionStore.apiBaseUrl)

        binding.btnLogin.setOnClickListener {
            val api = binding.inputApi.text.toString().trim()
            val email = binding.inputEmail.text.toString().trim()
            val pass = binding.inputPassword.text.toString()
            val activation = binding.inputActivation.text.toString().trim()

            if (api.isBlank() || email.isBlank() || pass.isBlank()) {
                showError("Preencha API, e-mail e senha")
                return@setOnClickListener
            }

            binding.btnLogin.isEnabled = false
            binding.txtError.visibility = View.GONE

            lifecycleScope.launch {
                try {
                    SessionStore.apiBaseUrl = api
                    ApiClient.rebuild(SessionStore.apiBaseUrl)
                    val res = ApiClient.get().login(LoginRequest(email, pass))
                    SessionStore.token = res.access_token
                    SessionStore.userName = res.user.name
                    SessionStore.userRole = res.user.role

                    if (!BuildConfig.DEMO_PAYMENT && activation.isNotBlank()) {
                        PaymentGatewayFactory.usePagBank()
                        val act = PaymentGatewayFactory.get().activate(activation)
                        if (!act.success) {
                            showError(act.message ?: "Falha ao ativar terminal PagBank")
                            binding.btnLogin.isEnabled = true
                            return@launch
                        }
                    }

                    when (res.user.role) {
                        "exit" -> startActivity(Intent(this@LoginActivity, ExitActivity::class.java))
                        else -> startActivity(Intent(this@LoginActivity, PosActivity::class.java))
                    }
                    finish()
                } catch (e: Exception) {
                    showError(e.message ?: "Falha no login")
                    binding.btnLogin.isEnabled = true
                }
            }
        }
    }

    private fun showError(msg: String) {
        binding.txtError.text = msg
        binding.txtError.visibility = View.VISIBLE
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
    }
}
