package com.tfasset.app
import org.json.JSONObject
import java.util.Locale

/** Display only; source volume is never summed or used to trigger price updates. */
internal object TfAssetMonitorFields{
 fun section(field:String)=when(field){"name","symbol"->"header";"price","change","changePercent"->"quote";else->"detail"}
 fun value(row:JSONObject,field:String):String?=if(row.optBoolean("watchOnly")&&field in listOf("shares","avgCost","marketValue","weight","pnl","roi","comprehensivePnl")) "--" else when(field){
  "volume"->{val value=row.optDouble(field,Double.NaN);if(value.isFinite()&&value>=0)String.format(Locale.US,"%,.0f",value) else "--"}
  "previousClose"->{val value=row.optDouble(field,Double.NaN);if(row.optBoolean("previousCloseKnown",true)&&value.isFinite()&&value>0)String.format(Locale.US,"%.2f",value) else "--"}
  "quoteStatus"->row.optString(field,"--").takeIf{it.isNotBlank()&&it!="null"}?:"--"
  else->null
 }
}
