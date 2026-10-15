package android.view
open class View {
 var parent:ViewGroup?=null
 var width=100
 open var layoutParams=ViewGroup.LayoutParams(-1,32)
 val height:Int get()=layoutParams.height
 var minimumHeight=0
 var paddingTop=0;var paddingBottom=0
 val resources=android.content.res.Resources()
 val viewTreeObserver=ViewTreeObserver()
 var requests=0
 fun requestLayout(){requests++}
 fun invalidate(){}
}
open class ViewGroup:View(){class LayoutParams(var width:Int,var height:Int)}
class ViewTreeObserver {
 fun interface OnPreDrawListener {fun onPreDraw():Boolean}
 val listeners=ArrayList<OnPreDrawListener>();val isAlive=true
 fun addOnPreDrawListener(l:OnPreDrawListener){listeners.add(l)}
 fun removeOnPreDrawListener(l:OnPreDrawListener){listeners.remove(l)}
 fun draw(){listeners.toList().forEach{it.onPreDraw()}}
}
