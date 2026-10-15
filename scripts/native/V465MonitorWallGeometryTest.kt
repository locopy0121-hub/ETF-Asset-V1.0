package com.tfasset.app
fun main(){
 val one=TfAssetMonitorWallGeometry.calculate(320,12,1,8,1080,6)
 check(one.cardWidth==296&&one.windowWidth==320&&one.contentWidth==296)
 for(n in listOf(2,3,5,12)){
  val g=TfAssetMonitorWallGeometry.calculate(320,12,n,8,1080,20)
  check(g.cardWidth==one.cardWidth)
  check(g.windowWidth==minOf(1080,24+n*296+(n-1)*8))
  check(g.contentWidth==n*296+(n-1)*8)
 }
 val partial=TfAssetMonitorWallGeometry.calculate(320,12,5,8,1080,7)
 check(partial.contentWidth==1512) // trailing row does not stretch its two cards
 val huge=TfAssetMonitorWallGeometry.calculate(1200,32,Int.MAX_VALUE,32,700,9)
 check(huge.windowWidth==700&&huge.cardWidth==1136&&huge.contentWidth==10480)
 val narrow=TfAssetMonitorWallGeometry.calculate(320,12,2,8,200,3)
 check(narrow.windowWidth==200&&narrow.cardWidth==296&&narrow.contentWidth==600)
 check(TfAssetMonitorWallGeometry.normalizeColumns(0.0)==2)
 check(TfAssetMonitorWallGeometry.normalizeColumns(5.0)==5)
 check(TfAssetMonitorWallGeometry.normalizeColumns(2.2)==2)
 check(TfAssetMonitorWallGeometry.normalizeColumns(Double.NaN)==2)
 println("V4.0.65 compiled native geometry: fixed card width, expansion, viewport, partial row, large counts PASS")
}
