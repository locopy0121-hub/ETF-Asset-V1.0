package com.tfasset.app
import org.json.JSONObject
fun main(){
 val o=TfAssetMonitorAutoFit.options(JSONObject("""{"enabled":true,"minFontSize":8,"maxFontSize":24,"rowHeight":32}"""))
 check(TfAssetMonitorAutoFit.fit(o,listOf(TfAssetMonitorAutoFit.Cell(100.0,32.0,200.0,24.0)))==12.0)
 check(TfAssetMonitorAutoFit.fit(o,listOf(TfAssetMonitorAutoFit.Cell(100.0,32.0,200.0,24.0),TfAssetMonitorAutoFit.Cell(120.0,16.0,120.0,32.0)))==12.0)
 check(TfAssetMonitorAutoFit.fit(o,listOf(TfAssetMonitorAutoFit.Cell(100.0,32.0,1000.0,24.0)))==8.0)
 check(TfAssetMonitorAutoFit.fit(o,listOf(TfAssetMonitorAutoFit.Cell(300.0,64.0,100.0,24.0)))==24.0)
 check(!TfAssetMonitorAutoFit.options(null).enabled)
 check(TfAssetMonitorAutoFit.options(JSONObject("""{"minFontSize":48,"maxFontSize":5,"rowHeight":999}""")).maxFontSize==48.0)
 println("V4.0.60 production native row-fit width/height budgets, common size, limits and migration PASS")
}
