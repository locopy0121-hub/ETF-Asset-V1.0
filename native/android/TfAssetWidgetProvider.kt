package com.tfasset.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.util.TypedValue
import android.widget.RemoteViews
import org.json.JSONObject
import kotlin.math.roundToInt

class TfAssetWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context:Context,manager:AppWidgetManager,ids:IntArray){ ids.forEach { manager.updateAppWidget(it,buildViews(context)) } }
  private fun buildViews(context:Context):RemoteViews{
    val prefs=context.getSharedPreferences("tf_asset_native",0)
    val config=runCatching{JSONObject(prefs.getString("widget_config","{}")?:"{}")}.getOrElse{JSONObject()}
    val snapshot=runCatching{JSONObject(prefs.getString("snapshot","{}")?:"{}")}.getOrElse{JSONObject()}
    val style=config.optJSONObject("style")?:JSONObject(); val asset=snapshot.optJSONObject("asset")?:JSONObject(); val holdings=snapshot.optJSONArray("holdings")
    val views=RemoteViews(context.packageName,R.layout.tf_asset_widget)
    val total=asset.optDouble("totalAssets",Double.NaN)
    views.setTextViewText(R.id.widget_title,"TF Asset")
    views.setTextViewText(R.id.widget_total,if(total.isFinite()) "NT$ "+String.format("%,.0f",total) else "等待資料")
    val first=if(holdings!=null&&holdings.length()>0)holdings.optJSONObject(0) else null
    val symbol=first?.optString("symbol","")?:""; val price=first?.optDouble("price",Double.NaN)?:Double.NaN; val pct=first?.optDouble("changePercent",Double.NaN)?:Double.NaN
    val quoteText=if(symbol.isNotBlank()&&price.isFinite()) symbol+"  "+String.format("%.2f",price)+"  "+(if(pct>=0) "+" else "")+String.format("%.2f",pct)+"%" else "尚無行情"
    views.setTextViewText(R.id.widget_quote,quoteText)
    val text=parseColor(style.optString("textColor","#0F172A"),Color.rgb(15,23,42)); val gain=parseColor(style.optString("gainColor","#EF4444"),Color.rgb(239,68,68)); val loss=parseColor(style.optString("lossColor","#10B981"),Color.rgb(16,185,129))
    views.setTextColor(R.id.widget_title,text); views.setTextColor(R.id.widget_total,text); views.setTextColor(R.id.widget_quote,if(pct>=0)gain else loss)
    val fs=style.optDouble("fontScale",1.0).coerceIn(.7,1.8); val vs=style.optDouble("valueFontScale",1.0).coerceIn(.7,2.0)
    views.setTextViewTextSize(R.id.widget_title,TypedValue.COMPLEX_UNIT_SP,(13*fs).toFloat()); views.setTextViewTextSize(R.id.widget_total,TypedValue.COMPLEX_UNIT_SP,(20*vs).toFloat()); views.setTextViewTextSize(R.id.widget_quote,TypedValue.COMPLEX_UNIT_SP,(12*fs).toFloat())
    val bg=parseColor(style.optString("backgroundColor","#FFFFFF"),Color.WHITE); val alpha=(style.optDouble("backgroundOpacity",.94).coerceIn(.1,1.0)*255).roundToInt()
    views.setInt(R.id.widget_root,"setBackgroundColor",Color.argb(alpha,Color.red(bg),Color.green(bg),Color.blue(bg)))
    val launch=context.packageManager.getLaunchIntentForPackage(context.packageName)
    if(launch!=null){ val pending=PendingIntent.getActivity(context,0,launch,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE); views.setOnClickPendingIntent(R.id.widget_root,pending) }
    return views
  }
  private fun parseColor(value:String,fallback:Int)=runCatching{Color.parseColor(value)}.getOrDefault(fallback)
}
