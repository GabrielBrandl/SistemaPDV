package com.pdvcashless.data.local

data class SyncQueueItem(
    val id: String,
    val operacao: String,
    val payload: String,
    val tentativas: Int = 0,
    val sincronizado: Boolean = false,
    val criadoEm: Long = System.currentTimeMillis(),
)
