package android.widget
class LinearLayout:android.view.ViewGroup(){var orientation=VERTICAL;companion object{const val HORIZONTAL=0;const val VERTICAL=1}}
class TextView:android.view.View(){
 val paint=android.graphics.Paint()
 var text:CharSequence="text"
 var textSize=24f
  set(value){field=value;paint.size=value}
 var maxLines=1
 var ellipsize:android.text.TextUtils.TruncateAt?=null
 var compoundPaddingTop=0;var compoundPaddingBottom=0;var compoundPaddingLeft=0;var compoundPaddingRight=0
 var actualLineHeight=0
 fun setLineHeight(n:Int){actualLineHeight=n}
 fun setLineSpacing(a:Float,b:Float){}
}
