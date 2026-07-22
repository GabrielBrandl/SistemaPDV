package com.pdvcashless.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sync_queue")
data class SyncQueueItem(
    @PrimaryKey val id: String,
    val operacao: String,
    val payload: String,
    val tentativas: Int = 0,
    val sincronizado: Boolean = false,
    val criadoEm: Long = System.currentTimeMillis()
)
