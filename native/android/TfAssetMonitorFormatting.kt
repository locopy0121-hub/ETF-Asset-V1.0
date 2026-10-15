package com.tfasset.app

import org.json.JSONObject

/** Display-only settings. Never derives or changes snapshot financial values. */
object TfAssetMonitorFormatting {
  fun bound(target:JSONObject?,key:String):Boolean {
    val keys=target?.optJSONObject("format")?.optJSONArray("profitColors")?:return false
    return (0 until keys.length()).any{keys.optString(it)==key}
  }
  fun tone(n:Double?,palette:JSONObject):String=when {
    n==null||!n.isFinite()||n==0.0->palette.optString("neutralColor","#94A3B8")
    n>0->palette.optString("gainColor","#EF4444")
    else->palette.optString("lossColor","#10B981")
  }
  fun resolved(target:JSONObject,key:String,fallback:String,n:Double?,palette:JSONObject):String=
    if(bound(target,key))tone(n,palette) else target.optString(key,"").takeIf{it.isNotBlank()&&it!="null"}?:fallback
  fun weight(target:JSONObject?,base:JSONObject?):Int? {
    val raw=target?.optJSONObject("format")?.optString("fontWeight","").orEmpty().ifBlank{base?.optJSONObject("format")?.optString("fontWeight","").orEmpty()}
    return raw.toIntOrNull()?.takeIf{it in 100..900&&it%100==0}
  }
  fun lineHeight(target:JSONObject?,base:JSONObject?):Float? {
    val own=target?.optJSONObject("format")?.optDouble("lineHeight",Double.NaN)?:Double.NaN
    val n=if(own.isFinite())own else base?.optJSONObject("format")?.optDouble("lineHeight",Double.NaN)?:Double.NaN
    return n.takeIf{it.isFinite()}?.coerceIn(1.0,3.0)?.toFloat()
  }
  fun inherited(target:JSONObject,base:JSONObject):JSONObject {
    val result=JSONObject(base.toString());val format=JSONObject(base.optJSONObject("format")?.toString()?:"{}")
    target.optJSONObject("format")?.let{own->own.keys().forEach{key->if(key!="profitColors")format.put(key,own.get(key))}}
    result.put("format",format);return result
  }
}
