package com.tfasset.app
import android.text.TextUtils
import android.view.ViewTreeObserver
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import kotlin.math.ceil
/** One measured fit per rendered surface. No timers, quote work or persistent view listeners. */
class TfAssetMonitorAutoFitLayout {
 private var options=TfAssetMonitorAutoFit.Options()
 private val texts=ArrayList<Pair<TextView,Float>>()
 private var observer:ViewTreeObserver?=null
 private var listener:ViewTreeObserver.OnPreDrawListener?=null
 fun clear(){listener?.let{if(observer?.isAlive==true)observer?.removeOnPreDrawListener(it)};observer=null;listener=null;texts.clear()}
 fun begin(style:JSONObject){clear();options=TfAssetMonitorAutoFit.options(style.optJSONObject("autoFit"))}
 fun register(view:TextView,ratio:Float){if(!options.enabled)return;texts.add(view to ratio);view.textSize=options.maxFontSize.toFloat()}
 fun schedule(root:LinearLayout){
  if(!options.enabled||texts.isEmpty())return
  val current=texts.filter{it.first.parent!=null&&it.first.layoutParams!=null}
  if(current.isEmpty())return
  val density=root.resources.displayMetrics.density
  val counts=HashMap<android.view.ViewGroup,Int>()
  fun reserve(view:TextView):Double {
   var parent=view.parent;var reserved=0.0
   while(parent is android.view.ViewGroup&&parent!==root){
    if(parent is LinearLayout&&parent.orientation==LinearLayout.HORIZONTAL)break
    val container=parent
    val count=counts.getOrPut(container){current.count{(text,_)->var p=text.parent;while(p!=null&&p!==container)p=p.parent;p===container}.coerceAtLeast(1)}
    reserved+=(container.paddingTop+container.paddingBottom).toDouble()/count
    parent=container.parent
   }
   return reserved
  }
  for((view,ratio) in current){
   val metric=view.paint.fontMetrics
   val natural=maxOf(metric.bottom-metric.top,view.textSize*ratio)
   val minimum=natural*options.minFontSize/options.maxFontSize+view.compoundPaddingTop+view.compoundPaddingBottom
   view.layoutParams=view.layoutParams.apply{height=ceil(maxOf(options.rowHeight*density-reserve(view),minimum)).toInt()}
   view.minimumHeight=0;view.maxLines=1;view.ellipsize=TextUtils.TruncateAt.END
  }
  val callback=object:ViewTreeObserver.OnPreDrawListener {
   override fun onPreDraw():Boolean {
    if(root.viewTreeObserver.isAlive)root.viewTreeObserver.removeOnPreDrawListener(this)
    listener=null;observer=null
    val byRow=LinkedHashMap<android.view.View,MutableList<Triple<TextView,Float,Int>>>()
    val counts=HashMap<android.view.ViewGroup,Int>()
  fun reserve(view:TextView):Double {
   var parent=view.parent;var reserved=0.0
   while(parent is android.view.ViewGroup&&parent!==root){
    if(parent is LinearLayout&&parent.orientation==LinearLayout.HORIZONTAL)break
    val container=parent
    val count=counts.getOrPut(container){current.count{(text,_)->var p=text.parent;while(p!=null&&p!==container)p=p.parent;p===container}.coerceAtLeast(1)}
    reserved+=(container.paddingTop+container.paddingBottom).toDouble()/count
    parent=container.parent
   }
   return reserved
  }
  for((view,ratio) in current){
     var parent=view.parent
     var key:android.view.View=view
     while(parent is android.view.ViewGroup&&parent!==root){if(parent is LinearLayout&&parent.orientation==LinearLayout.HORIZONTAL){key=parent;break};parent=parent.parent}
     byRow.getOrPut(key){arrayListOf()}.add(Triple(view,ratio,0))
    }
    val groups=byRow.values
    for(group in groups){
     val cells=group.map{(view,ratio,_)->val metrics=view.paint.fontMetrics;TfAssetMonitorAutoFit.Cell((view.width-view.compoundPaddingLeft-view.compoundPaddingRight).toDouble(),(view.height-view.compoundPaddingTop-view.compoundPaddingBottom).toDouble(),view.paint.measureText(view.text.toString()).toDouble(),maxOf(metrics.bottom-metrics.top,view.textSize*ratio).toDouble())}
     val size=TfAssetMonitorAutoFit.fit(options,cells).toFloat()
     for((view,ratio,_) in group){view.textSize=size;if(android.os.Build.VERSION.SDK_INT>=28)view.setLineHeight(ceil(view.textSize*ratio).toInt()) else view.setLineSpacing(0f,ratio)}
    }
    root.requestLayout();root.invalidate();return false
   }
  }
  observer=root.viewTreeObserver;listener=callback;observer?.addOnPreDrawListener(callback)
 }
}
