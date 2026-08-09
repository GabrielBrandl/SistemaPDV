package com.pdvcashless.api

data class LoginRequest(val email: String, val password: String)

data class LoginResponse(
    val access_token: String,
    val user: UserDto,
)

data class UserDto(
    val id: String,
    val email: String,
    val name: String,
    val role: String,
)

data class ProductDto(
    val id: String,
    val nome: String,
    val preco: Double,
    val categoria: String?,
    val ativo: Boolean,
)

data class NfcTapRequest(
    val uid_nfc: String,
    val event_id: String? = null,
)

data class NfcTapResponse(
    val acao: String,
    val cartao: CartaoDto,
    val comanda: ComandaDto,
)

data class CartaoDto(
    val uid: String,
    val nome: String?,
    val status: String,
    val session_token: String? = null,
)

data class ComandaDto(
    val id: String,
    val numero: Int,
    val status: String,
    val total: Double,
    val total_pago: Double,
    val restante: Double,
    val itens: List<ComandaItemDto> = emptyList(),
    val cliente_nome: String? = null,
    val card_uid: String? = null,
)

data class ComandaItemDto(
    val id: String,
    val nome: String,
    val qtd: Int,
    val total: Double,
)

data class AddItemsRequest(val itens: List<AddItemDto>)
data class AddItemDto(val produto_id: String, val qtd: Int)

data class CreateCardPaymentRequest(
    val comanda_id: String,
    val forma: String,
)

data class CreatePixPaymentRequest(
    val comanda_id: String,
)

data class PaymentIntentDto(
    val id: String,
    val channel: String,
    val forma: String,
    val valor: Double,
    val status: String,
    val provider: String,
    val softpos_request: SoftPosRequestDto? = null,
    val pix_copia_cola: String? = null,
    val demo_mode: Boolean? = null,
)

data class SoftPosRequestDto(
    val amount: Int,
    val type: String,
    val reference: String,
    val provider: String,
)

data class ConfirmPaymentRequest(
    val softpos_transaction_id: String? = null,
    val provider_ref: String? = null,
)

data class ConfirmPaymentResponse(
    val status: String,
    val mensagem: String?,
    val comanda: ComandaDto?,
)

data class ExitCheckRequest(val uid_nfc: String)
data class ExitReleaseRequest(val uid_nfc: String)

data class ExitCheckResponse(
    val decisao: String,
    val pode_liberar: Boolean,
    val mensagem: String,
    val resumo: ExitResumoDto?,
)

data class ExitResumoDto(
    val pendencia: Double,
    val total_consumido: Double,
)
