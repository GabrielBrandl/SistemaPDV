package com.pdvcashless.nfc

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle

fun ByteArray.toHexString(): String =
    joinToString("") { "%02X".format(it) }

class NfcHelper(
    private val activity: Activity,
    private val onUid: (String) -> Unit,
) {
    private val adapter: NfcAdapter? = NfcAdapter.getDefaultAdapter(activity)

    val available: Boolean get() = adapter != null
    val enabled: Boolean get() = adapter?.isEnabled == true

    fun start() {
        val nfc = adapter ?: return
        val flags =
            NfcAdapter.FLAG_READER_NFC_A or
                NfcAdapter.FLAG_READER_NFC_B or
                NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK
        nfc.enableReaderMode(activity, { tag: Tag ->
            val uid = tag.id.toHexString()
            activity.runOnUiThread { onUid(uid) }
        }, flags, Bundle())
    }

    fun stop() {
        adapter?.disableReaderMode(activity)
    }
}
