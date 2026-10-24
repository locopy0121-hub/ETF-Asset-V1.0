package android.graphics
class Paint {
 var size=24f;var measuredAtMax=200f
 class FontMetrics(val bottom:Float,val top:Float)
 val fontMetrics:FontMetrics get()=FontMetrics(size*1.2f,0f)
 fun measureText(s:String)=measuredAtMax*size/24f
}
