package com.tfasset.app
import org.json.JSONObject
fun main(){
  val palette=JSONObject("""{"gainColor":"#FF0000","lossColor":"#00FF00","neutralColor":"#FFFF00"}""")
  val item=JSONObject("""{"textColor":"#123456","format":{"fontWeight":"300","lineHeight":1.8,"profitColors":["backgroundColor","borderColor"]}}""")
  check(TfAssetMonitorFormatting.resolved(item,"backgroundColor","#000000",-1.0,palette)=="#00FF00")
  check(TfAssetMonitorFormatting.resolved(item,"borderColor","#000000",1.0,palette)=="#FF0000")
  check(TfAssetMonitorFormatting.resolved(item,"backgroundColor","#000000",0.0,palette)=="#FFFF00")
  check(TfAssetMonitorFormatting.resolved(item,"backgroundColor","#000000",Double.NaN,palette)=="#FFFF00")
  check(TfAssetMonitorFormatting.resolved(item,"textColor","#000000",-1.0,palette)=="#123456")
  check(TfAssetMonitorFormatting.weight(item,null)==300)
  check(TfAssetMonitorFormatting.lineHeight(item,null)==1.8f)
  val inherited=TfAssetMonitorFormatting.inherited(JSONObject("""{"format":{"lineHeight":2.0}}"""),item)
  check(TfAssetMonitorFormatting.weight(JSONObject(),inherited)==300)
  check(TfAssetMonitorFormatting.lineHeight(JSONObject(),inherited)==2f)
  check(TfAssetMonitorFormatting.lineHeight(JSONObject("""{"format":{"lineHeight":100}}"""),null)==3f)
  check(TfAssetMonitorFormatting.weight(JSONObject("""{"format":{"fontWeight":"invalid"}}"""),null)==null)
  check(TfAssetMonitorFormatting.resolved(JSONObject(),"textColor","#123456",null,palette)=="#123456")
  println("V4.0.59 production Monitor format: signed/null colors, fixed-color preservation, typography inheritance and clamping PASS")
}
