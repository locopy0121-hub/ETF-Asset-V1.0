package com.tfasset.app
fun main(){
 check(TfAssetMarketPresentation.sourceTimeLabel("2026-10-14T04:55:07Z")=="12:55:07"){"External quote time must include HH:mm:ss in Taipei"}
 check(TfAssetMarketPresentation.sourceTimeLabel("2026-10-13T16:00:09Z")=="00:00:09")
 check(TfAssetMarketPresentation.sourceTimeLabel("invalid")=="--")
 val rows=listOf(org.json.JSONObject().put("updatedAt","2026-10-14T04:55:07Z"),org.json.JSONObject().put("updatedAt","2026-10-14T04:56:08Z"),org.json.JSONObject().put("updatedAt","invalid"))
 check(TfAssetMarketPresentation.sourceClockLabel(rows)=="12:56:08")
 check(TfAssetMarketPresentation.sourceClockLabel(rows.reversed())=="12:56:08")
 check(TfAssetMarketPresentation.sourceClockLabel(emptyList())=="--:--:--")
 check(TfAssetMarketPresentation.sourceClockLabel(listOf(org.json.JSONObject().put("generatedAt","2026-10-14T05:00:00Z")))=="--:--:--"){"Render time must not masquerade as quote time"}
 println("V4.0.57 Taipei source clock HH:mm:ss PASS")
}
