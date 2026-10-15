package com.tfasset.app
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
fun main(){
 val fit=TfAssetMonitorAutoFitLayout();val root=LinearLayout().apply{resources.displayMetrics.density=3f};val row=LinearLayout().apply{parent=root;orientation=LinearLayout.HORIZONTAL};val nested=LinearLayout().apply{parent=row}
 val a=TextView().apply{parent=row;width=100;paint.measuredAtMax=200f};val b=TextView().apply{parent=nested;width=120;paint.measuredAtMax=120f};val hidden=TextView()
 val config=JSONObject("""{"autoFit":{"enabled":true,"minFontSize":8,"maxFontSize":24,"rowHeight":32}}""")
 fit.begin(config);fit.register(a,1.2f);fit.register(b,1.2f);fit.register(hidden,1.2f);fit.schedule(root)
 check(root.viewTreeObserver.listeners.size==1);root.viewTreeObserver.draw();check(root.viewTreeObserver.listeners.isEmpty());check(a.textSize==12f&&b.textSize==12f);check(a.height==32);check(root.requests==1)
 fit.begin(config);fit.register(a,1.2f);fit.schedule(root);check(root.viewTreeObserver.listeners.size==1);fit.clear();check(root.viewTreeObserver.listeners.isEmpty())
 fit.begin(JSONObject());val manual=TextView().apply{parent=row;textSize=13f};fit.register(manual,1.2f);fit.schedule(root);check(manual.textSize==13f);check(root.viewTreeObserver.listeners.isEmpty())
 fit.begin(config);val narrow=TextView().apply{parent=row;width=1;compoundPaddingLeft=4;compoundPaddingTop=20;compoundPaddingBottom=20};fit.register(narrow,3f);fit.schedule(root);root.viewTreeObserver.draw();check(narrow.textSize==8f);check(narrow.height>=64)
 fit.begin(config);val paddedCell=LinearLayout().apply{parent=row;paddingTop=20;paddingBottom=20};val label=TextView().apply{parent=paddedCell;paint.measuredAtMax=10f};val value=TextView().apply{parent=paddedCell;paint.measuredAtMax=10f};fit.register(label,1.2f);fit.register(value,1.2f);fit.schedule(root);root.viewTreeObserver.draw();check(label.height==12&&value.height==12);check(label.textSize==10f&&value.textSize==10f)
 println("V4.0.60 production Android layout adapter: actual nested row consumer, fixed height, hidden clock, single listener/cancellation, minimum/overflow and OFF manual mode PASS")
}
