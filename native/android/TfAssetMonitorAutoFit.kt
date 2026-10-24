package com.tfasset.app
import org.json.JSONObject
import kotlin.math.floor
object TfAssetMonitorAutoFit {
 data class Options(val enabled:Boolean=false,val minFontSize:Double=8.0,val maxFontSize:Double=24.0,val rowHeight:Double=32.0)
 data class Cell(val width:Double,val height:Double,val naturalWidth:Double,val naturalHeight:Double)
 fun options(raw:JSONObject?):Options {
  fun bounded(key:String,min:Double,max:Double,fallback:Double):Double {val n=raw?.opt(key);return if(n is Number&&n.toDouble().isFinite())n.toDouble().coerceIn(min,max) else fallback}
  val min=bounded("minFontSize",6.0,48.0,8.0)
  return Options(raw?.opt("enabled")==true,min,bounded("maxFontSize",min,72.0,maxOf(24.0,min)),bounded("rowHeight",16.0,160.0,32.0))
 }
 fun fit(o:Options,cells:List<Cell>):Double {
  var size=o.maxFontSize
  for(c in cells){if(!listOf(c.width,c.height,c.naturalWidth,c.naturalHeight).all{it.isFinite()}||c.width<=0||c.height<=0)return o.minFontSize
   val ratio=minOf(if(c.naturalWidth>0)c.width/c.naturalWidth else 1.0,if(c.naturalHeight>0)c.height/c.naturalHeight else 1.0,1.0)
   size=minOf(size,maxOf(o.minFontSize,o.maxFontSize*ratio))
  }
  return maxOf(o.minFontSize,minOf(o.maxFontSize,floor((size+1e-6)*10)/10))
 }
}
