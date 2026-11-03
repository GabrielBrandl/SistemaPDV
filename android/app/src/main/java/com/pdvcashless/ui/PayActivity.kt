package com.pdvcashless.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.pdvcashless.BuildConfig
import com.pdvcashless.api.ApiClient
import com.pdvcashless.api.ConfirmPaymentRequest
import com.pdvcashless.api.CreateCardPaymentRequest
import com.pdvcashless.api.CreatePixPaymentRequest
import com.pdvcashless.databinding.ActivityPayBinding
import com.pdvcashless.gateway.CieloGateway
import com.pdvcashless.gateway.MercadoPagoGateway
import com.pdvcashless.gateway.PaymentGatewayFactory
import com.pdvcashless.gateway.PaymentType
import com.pdvcashless.gateway.TerminalActivityHolder
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class PayActivity : AppCompatActivity() {
    private lateinit var binding: ActivityPayBinding
    private lateinit var comandaId: String
    private var amount: Double = 0.0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPayBinding.inflate(layoutInflater)
        setContentView(binding.root)
        TerminalActivityHolder.current = this

        comandaId = intent.getStringExtra(EXTRA_COMANDA_ID) ?: run {
            finish()
            return
        }
        amount = intent.getDoubleExtra(EXTRA_AMOUNT, 0.0)
        binding.txtPayAmount.text = "R$ %.2f".format(amount)

        binding.btnBack.setOnClickListener { finish() }
        binding.btnPix.setOnClickListener { pay(PaymentType.PIX, "pix") }
        binding.btnDebit.setOnClickListener { pay(PaymentType.DEBIT, "debito") }
        binding.btnCredit.setOnClickListener { pay(PaymentType.CREDIT, "credito") }

        handleCallback(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleCallback(intent)
    }

    override fun onDestroy() {
        if (TerminalActivityHolder.current === this) {
            TerminalActivityHolder.current = null
        }
        super.onDestroy()
    }

    private fun handleCallback(intent: Intent?) {
        val data = intent?.data ?: return
        val gateway = PaymentGatewayFactory.get()
        when (data.scheme) {
            "order" -> if (gateway is CieloGateway) gateway.onDeepLinkResult(data)
            "pdvcashless" -> if (gateway is MercadoPagoGateway) gateway.onResult(intent)
        }
    }

    private fun pay(type: PaymentType, forma: String) {
        setBusy(true)
        binding.txtPayStatus.text = "Iniciando ${type.name} no terminal..."

        lifecycleScope.launch {
            try {
                val provider = BuildConfig.PAYMENT_PROVIDER
                val intentDto = if (type == PaymentType.PIX) {
                    ApiClient.get().createPix(
                        CreatePixPaymentRequest(comanda_id = comandaId, provider = provider),
                    )
                } else {
                    ApiClient.get().createCard(
                        CreateCardPaymentRequest(
                            comanda_id = comandaId,
                            forma = forma,
                            provider = provider,
                        ),
                    )
                }

                val cents = (Math.round(intentDto.valor * 100)).toInt()
                val terminal = PaymentGatewayFactory.get().doPayment(
                    amountCents = cents,
                    type = type,
                    userReference = intentDto.id.take(10),
                )

                if (terminal.awaitRemote) {
                    binding.txtPayStatus.text = terminal.message
                        ?: "Confirme o pagamento na maquininha..."
                    val approved = pollApproved(intentDto.id)
                    if (!approved) {
                        binding.txtPayStatus.text = "Tempo esgotado. Tente de novo."
                        setBusy(false)
                        return@launch
                    }
                } else if (!terminal.success) {
                    binding.txtPayStatus.text = terminal.message ?: "Pagamento não aprovado"
                    setBusy(false)
                    return@launch
                } else {
                    binding.txtPayStatus.text = "Confirmando no servidor..."
                    ApiClient.get().confirmPayment(
                        intentDto.id,
                        ConfirmPaymentRequest(
                            softpos_transaction_id = terminal.transactionId,
                            provider_ref = terminal.transactionId,
                        ),
                    )
                }

                binding.txtPayStatus.text = "Pago!"
                Toast.makeText(this@PayActivity, "Pagamento aprovado", Toast.LENGTH_LONG).show()
                finish()
            } catch (e: Exception) {
                binding.txtPayStatus.text = e.message ?: "Erro"
                setBusy(false)
            }
        }
    }

    private suspend fun pollApproved(paymentId: String): Boolean {
        repeat(60) {
            delay(2000)
            try {
                val status = ApiClient.get().getPayment(paymentId)
                if (status.status == "approved") return true
                if (status.status == "cancelled" || status.status == "expired") return false
            } catch (_: Exception) {
            }
        }
        return false
    }

    private fun setBusy(busy: Boolean) {
        binding.progress.visibility = if (busy) View.VISIBLE else View.GONE
        binding.btnPix.isEnabled = !busy
        binding.btnDebit.isEnabled = !busy
        binding.btnCredit.isEnabled = !busy
    }

    companion object {
        const val EXTRA_COMANDA_ID = "comanda_id"
        const val EXTRA_AMOUNT = "amount"
    }
}
