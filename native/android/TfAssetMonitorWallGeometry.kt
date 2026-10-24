package com.tfasset.app
/** Keep each stock at the one-column size. Only the viewport is screen-bounded. */
object TfAssetMonitorWallGeometry {
 data class Geometry(val cardWidth:Int,val windowWidth:Int,val contentWidth:Int)
 fun normalizeColumns(value:Double):Int = if(value.isFinite()&&value>=1&&value<=Int.MAX_VALUE&&value%1.0==0.0)value.toInt() else 2
 fun calculate(baseWidth:Int,padding:Int,columns:Int,gap:Int,screenWidth:Int,rowCount:Int):Geometry {
  val count=columns.coerceAtLeast(1)
  val card=(baseWidth.toLong()-2L*padding).coerceIn(1,16777215).toInt()
  val occupied=minOf(count,rowCount.coerceAtLeast(1))
  val desired=2L*padding+count.toLong()*card+(count-1L)*gap
  val content=(occupied.toLong()*card+(occupied-1L)*gap).coerceIn(1,16777215).toInt()
  return Geometry(card,desired.coerceIn(1,screenWidth.coerceAtLeast(1).toLong()).toInt(),content)
 }
}
