package com.pdvcashless.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.pdvcashless.R
import com.pdvcashless.api.AddItemDto
import com.pdvcashless.api.AddItemsRequest
import com.pdvcashless.api.ApiClient
import com.pdvcashless.api.ComandaDto
import com.pdvcashless.api.NfcTapRequest
import com.pdvcashless.api.ProductDto
import com.pdvcashless.databinding.ActivityPosBinding
import com.pdvcashless.nfc.NfcHelper
import kotlinx.coroutines.launch

class PosActivity : AppCompatActivity() {
    private lateinit var binding: ActivityPosBinding
    private var nfc: NfcHelper? = null
    private var comanda: ComandaDto? = null
    private var products: List<ProductDto> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPosBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.listProducts.layoutManager = GridLayoutManager(this, 2)
        binding.inputUid.setText("04A3B2112233")

        binding.btnTap.setOnClickListener { tap(binding.inputUid.text.toString()) }
        binding.btnPay.setOnClickListener {
            val c = comanda ?: return@setOnClickListener
            startActivity(
                Intent(this, PayActivity::class.java)
                    .putExtra(PayActivity.EXTRA_COMANDA_ID, c.id)
                    .putExtra(PayActivity.EXTRA_AMOUNT, c.restante),
            )
        }
        binding.btnExitMode.setOnClickListener {
            startActivity(Intent(this, ExitActivity::class.java))
        }

        nfc = NfcHelper(this) { uid ->
            binding.inputUid.setText(uid)
            tap(uid)
        }

        lifecycleScope.launch {
            try {
                products = ApiClient.get().products().filter { it.ativo }
                binding.listProducts.adapter = ProductAdapter(products) { addProduct(it) }
            } catch (e: Exception) {
                toast(e.message ?: "Erro ao carregar produtos")
            }
        }
    }

    override fun onResume() {
        super.onResume()
        nfc?.start()
        comanda?.id?.let { refreshComanda(it) }
    }

    override fun onPause() {
        nfc?.stop()
        super.onPause()
    }

    private fun tap(uid: String) {
        if (uid.isBlank()) return
        lifecycleScope.launch {
            try {
                val res = ApiClient.get().nfcTap(NfcTapRequest(uid_nfc = uid.trim()))
                comanda = res.comanda
                bindComanda()
                toast("Comanda #${res.comanda.numero}")
            } catch (e: Exception) {
                toast(e.message ?: "Falha NFC")
            }
        }
    }

    private fun addProduct(p: ProductDto) {
        val c = comanda ?: run {
            toast("Aproxime a pulseira primeiro")
            return
        }
        lifecycleScope.launch {
            try {
                comanda = ApiClient.get().addItems(
                    c.id,
                    AddItemsRequest(listOf(AddItemDto(p.id, 1))),
                )
                bindComanda()
            } catch (e: Exception) {
                toast(e.message ?: "Erro ao adicionar")
            }
        }
    }

    private fun refreshComanda(id: String) {
        lifecycleScope.launch {
            try {
                comanda = ApiClient.get().getComanda(id)
                bindComanda()
            } catch (_: Exception) {
            }
        }
    }

    private fun bindComanda() {
        val c = comanda
        if (c == null) {
            binding.txtComanda.text = "Nenhuma comanda"
            binding.txtTotal.text = "Total: R$ 0,00"
            binding.btnPay.isEnabled = false
            return
        }
        binding.txtComanda.text =
            "Comanda #${c.numero} · ${c.cliente_nome ?: c.card_uid} · ${c.status}"
        binding.txtTotal.text = "Restante: R$ %.2f".format(c.restante)
        binding.btnPay.isEnabled = c.restante > 0.009 && c.status != "paid"
    }

    private fun toast(msg: String) =
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()

    private class ProductAdapter(
        private val items: List<ProductDto>,
        private val onClick: (ProductDto) -> Unit,
    ) : RecyclerView.Adapter<ProductAdapter.VH>() {
        class VH(val root: ViewGroup) : RecyclerView.ViewHolder(root)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val v = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_product, parent, false) as ViewGroup
            return VH(v)
        }

        override fun getItemCount() = items.size

        override fun onBindViewHolder(holder: VH, position: Int) {
            val p = items[position]
            holder.root.findViewById<TextView>(R.id.txtName).text = p.nome
            holder.root.findViewById<TextView>(R.id.txtPrice).text =
                "R$ %.2f".format(p.preco)
            holder.root.setOnClickListener { onClick(p) }
        }
    }
}
