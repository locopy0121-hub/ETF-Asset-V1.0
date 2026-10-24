package com.tfasset.app
import org.json.JSONObject
/** Accept equal market versions for ledger/config changes, reject older price versions. */
internal fun acceptsSurfaceSnapshot(existing:JSONObject,incoming:JSONObject):Boolean =
    incoming.optLong("marketDataVersion",0L)>=existing.optLong("marketDataVersion",0L)
