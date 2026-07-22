package com.pdvcashless.nfc

fun ByteArray.toHexString(): String =
    joinToString("") { "%02X".format(it) }
