package com.pdvcashless.ui

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.pdvcashless.api.ApiClient
import com.pdvcashless.api.ExitCheckRequest
import com.pdvcashless.api.ExitReleaseRequest
import com.pdvcashless.databinding.ActivityExitBinding
import com.pdvcashless.nfc.NfcHelper
import kotlinx.coroutines.launch

class ExitActivity : AppCompatActivity() {
    private lateinit var binding: ActivityExitBinding
    private var nfc: NfcHelper? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityExitBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnCheck.setOnClickListener { check(binding.inputUid.text.toString()) }
        binding.btnRelease.setOnClickListener { release(binding.inputUid.text.toString()) }

        nfc = NfcHelper(this) { uid ->
            binding.inputUid.setText(uid)
            check(uid)
        }
    }

    override fun onResume() {
        super.onResume()
        nfc?.start()
    }

    override fun onPause() {
        nfc?.stop()
        super.onPause()
    }

    private fun check(uid: String) {
        if (uid.isBlank()) return
        lifecycleScope.launch {
            try {
                val res = ApiClient.get().exitCheck(ExitCheckRequest(uid.trim()))
                binding.txtDecision.text = when (res.decisao) {
                    "liberar" -> "LIBERAR"
                    "bloquear" -> "BLOQUEADO"
                    else -> res.decisao.uppercase()
                }
                binding.txtDecision.setTextColor(
                    when (res.decisao) {
                        "liberar" -> Color.parseColor("#10b981")
                        "bloquear" -> Color.parseColor("#ef4444")
                        else -> Color.parseColor("#f59e0b")
                    },
                )
                binding.txtMessage.text = res.mensagem
                binding.btnRelease.visibility = if (res.pode_liberar) View.VISIBLE else View.GONE
                binding.btnRelease.isEnabled = res.pode_liberar
            } catch (e: Exception) {
                Toast.makeText(this@ExitActivity, e.message, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun release(uid: String) {
        lifecycleScope.launch {
            try {
                ApiClient.get().exitRelease(ExitReleaseRequest(uid.trim()))
                Toast.makeText(this@ExitActivity, "Saída liberada", Toast.LENGTH_LONG).show()
                binding.btnRelease.isEnabled = false
                binding.txtDecision.text = "LIBERADO"
            } catch (e: Exception) {
                Toast.makeText(this@ExitActivity, e.message, Toast.LENGTH_LONG).show()
            }
        }
    }
}
