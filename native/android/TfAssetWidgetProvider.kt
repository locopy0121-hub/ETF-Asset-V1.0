package com.tfasset.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.roundToInt

class TfAssetWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context:Context,manager:AppWidgetManager,ids:IntArray){ ids.forEach { manager.updateAppWidget(it,buildViews(context)) } }

  private fun jsonStrings(array:JSONArray?):List<String>{
    if(array==null)return emptyList()
    return (0 until array.length()).mapNotNull{array.optString(it,"").trim().takeIf(String::isNotEmpty)}
  }

  private fun compareNumber(a:Double,b:Double):Int{
    val aa=if(a.isFinite())a else Double.POSITIVE_INFINITY
    val bb=if(b.isFinite())b else Double.POSITIVE_INFINITY
    return aa.compareTo(bb)
  }

  private fun orderedHoldings(snapshot:JSONObject,config:JSONObject):List<JSONObject>{
    val array=snapshot.optJSONArray("holdings")?:return emptyList()
    val all=(0 until array.length()).mapNotNull{array.optJSONObject(it)}
    val selected=jsonStrings(config.optJSONArray("selectedSymbols")).map{it.uppercase()}.toSet()
    val rows=(if(selected.isEmpty())all else all.filter{selected.contains(it.optString("symbol","").uppercase())}).toMutableList()
    val sort=config.optJSONObject("sort")?:JSONObject()
    val key=sort.optString("key","manual")
    val direction=if(sort.optString("direction","asc")=="desc")-1 else 1
    if(key=="manual"){
      val rank=jsonStrings(sort.optJSONArray("manualSymbols")).map{it.uppercase()}.withIndex().associate{it.value to it.index}
      rows.sortWith(compareBy{rank[it.optString("symbol","").uppercase()]?:Int.MAX_VALUE})
      return rows
    }
    rows.sortWith(Comparator{a,b->
      val result=when(key){
        "symbol"->a.optString("symbol","").compareTo(b.optString("symbol",""))
        "price"->compareNumber(a.optDouble("price",Double.NaN),b.optDouble("price",Double.NaN))
        else->compareNumber(a.optDouble("changePercent",Double.NaN),b.optDouble("changePercent",Double.NaN))
      }
      result*direction
    })
    return rows
  }

  private fun buildViews(context:Context):RemoteViews{
    val prefs=context.getSharedPreferences("tf_asset_native",0)
    val config=runCatching{JSONObject(prefs.getString("widget_config","{}")?:"{}")}.getOrElse{JSONObject()}
    val snapshot=runCatching{JSONObject(prefs.getString("snapshot","{}")?:"{}")}.getOrElse{JSONObject()}
    val style=config.optJSONObject("style")?:JSONObject()
    val asset=snapshot.optJSONObject("asset")?:JSONObject()
    val first=orderedHoldings(snapshot,config).firstOrNull()
    val template=config.optString("template","asset-summary")
    val capacity=when(template){"minimal"->2;"compact"->3;"quote-summary","transparent"->4;"asset-summary"->5;else->6}
    val selectedFields=jsonStrings(config.optJSONArray("fields")).ifEmpty{listOf("appName","totalAssets","symbol","price","changePercent")}.take(capacity)
    val views=RemoteViews(context.packageName,R.layout.tf_asset_widget)
    val ids=intArrayOf(R.id.widget_line1,R.id.widget_line2,R.id.widget_line3,R.id.widget_line4,R.id.widget_line5,R.id.widget_line6)

    val text=parseColor(style.optString("textColor","#0F172A"),Color.rgb(15,23,42))
    val gain=parseColor(style.optString("gainColor","#EF4444"),Color.rgb(239,68,68))
    val loss=parseColor(style.optString("lossColor","#10B981"),Color.rgb(16,185,129))
    val neutral=parseColor(style.optString("neutralColor","#64748B"),Color.rgb(100,116,139))
    val densityScale=when(template){"minimal"->1.12;"compact"->.92;"advanced"->.9;else->1.0}
    val fs=style.optDouble("fontScale",1.0).coerceIn(.7,1.8)*densityScale
    val titleFs=style.optDouble("titleFontScale",1.0).coerceIn(.7,1.8)*densityScale
    val align=when(style.optString("textAlign","left")){"center"->Gravity.CENTER;"right"->Gravity.END;else->Gravity.START}

    ids.forEachIndexed{index,id->
      val field=selectedFields.getOrNull(index)
      if(field==null){
        views.setViewVisibility(id,View.GONE)
      }else{
        val rendered=renderField(field,asset,first)
        views.setViewVisibility(id,View.VISIBLE)
        views.setTextViewText(id,rendered.first)
        views.setTextColor(id,when{
          !rendered.second.isFinite()->neutral
          rendered.second>0->gain
          rendered.second<0->loss
          else->text
        })
        views.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,((if(index==0)13*titleFs else 11.5*fs)).toFloat())
        views.setInt(id,"setGravity",align)
      }
    }

    val bg=parseColor(style.optString("backgroundColor","#FFFFFF"),Color.WHITE)
    val opacity=if(template=="transparent")minOf(style.optDouble("backgroundOpacity",.72),.72) else style.optDouble("backgroundOpacity",.94)
    val alpha=(opacity.coerceIn(.1,1.0)*255).roundToInt()
    views.setInt(R.id.widget_root,"setBackgroundColor",Color.argb(alpha,Color.red(bg),Color.green(bg),Color.blue(bg)))

    val launch=context.packageManager.getLaunchIntentForPackage(context.packageName)
    if(launch!=null){
      val pending=PendingIntent.getActivity(context,0,launch,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      views.setOnClickPendingIntent(R.id.widget_root,pending)
    }
    return views
  }

  private fun renderField(field:String,asset:JSONObject,holding:JSONObject?):Pair<String,Double>{
    val neutral=Double.NaN
    fun money(v:Double)=if(v.isFinite())String.format("%,.0f",v) else "--"
    fun signedMoney(v:Double)=if(v.isFinite())((if(v>=0)"+" else "")+String.format("%,.0f",v)) else "--"
    fun signed2(v:Double,suffix:String="")=if(v.isFinite())((if(v>=0)"+" else "")+String.format("%.2f",v)+suffix) else "--"
    return when(field){
      "appName"->"TF Asset" to neutral
      "totalAssets"->("總資產 NT$ "+money(asset.optDouble("totalAssets",Double.NaN))) to neutral
      "marketValue"->("總市值 NT$ "+money(asset.optDouble("marketValue",Double.NaN))) to neutral
      "cash"->("現金 NT$ "+money(asset.optDouble("cash",Double.NaN))) to neutral
      "unrealizedPnl"->asset.optDouble("unrealizedPnl",Double.NaN).let{("未實現 "+signedMoney(it)) to it}
      "realizedPnl"->asset.optDouble("realizedPnl",Double.NaN).let{("已實現 "+signedMoney(it)) to it}
      "dividendIncome"->("股息 "+money(asset.optDouble("dividendIncome",Double.NaN))) to neutral
      "totalReturn"->asset.optDouble("totalReturn",Double.NaN).let{("總報酬 "+signedMoney(it)) to it}
      "symbol"->(holding?.optString("symbol","--")?:"--") to neutral
      "name"->(holding?.optString("name","--")?:"--") to neutral
      "price"->("價格 "+number2(holding,"price")) to neutral
      "change"->valuePair("漲跌 ",holding,"change",false)
      "changePercent"->valuePair("漲跌% ",holding,"changePercent",true)
      "shares"->("股數 "+integer(holding,"shares")) to neutral
      "avgCost"->("成本均 "+number2(holding,"avgCost")) to neutral
      "holdingMarketValue"->("單檔市值 "+integer(holding,"marketValue")) to neutral
      "pnl"->valuePair("持股損益 ",holding,"pnl",false,true)
      "roi"->valuePair("報酬% ",holding,"roi",true)
      "comprehensivePnl"->valuePair("含息損益 ",holding,"comprehensivePnl",false,true)
      "marketStatus"->("狀態 "+(holding?.optString("marketStatus","--")?:"--")) to neutral
      "updatedAt"->("更新 "+timeText(holding?.optString("updatedAt","")?:"")) to neutral
      "dailyPnl"->valuePair("當日損益 ",holding,"change",false)
      "quote"->{
        val symbol=holding?.optString("symbol","--")?:"--"
        val price=number2(holding,"price")
        val pct=holding?.optDouble("changePercent",Double.NaN)?:Double.NaN
        (symbol+" "+price+" "+signed2(pct,"%")) to pct
      }
      else->"--" to neutral
    }
  }

  private fun valuePair(prefix:String,row:JSONObject?,key:String,percent:Boolean,money:Boolean=false):Pair<String,Double>{
    val v=row?.optDouble(key,Double.NaN)?:Double.NaN
    val text=if(!v.isFinite())"--" else if(money)(if(v>=0)"+" else "")+String.format("%,.0f",v) else (if(v>=0)"+" else "")+String.format("%.2f",v)+(if(percent)"%" else "")
    return (prefix+text) to v
  }
  private fun number2(row:JSONObject?,key:String):String{val v=row?.optDouble(key,Double.NaN)?:Double.NaN;return if(v.isFinite())String.format("%.2f",v) else "--"}
  private fun integer(row:JSONObject?,key:String):String{val v=row?.optDouble(key,Double.NaN)?:Double.NaN;return if(v.isFinite())String.format("%,.0f",v) else "--"}
  private fun timeText(value:String)=if(value.length>=16)value.substring(11,16) else "--"
  private fun parseColor(value:String,fallback:Int)=runCatching{Color.parseColor(value)}.getOrDefault(fallback)
}
