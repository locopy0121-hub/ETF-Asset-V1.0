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
  companion object{const val ACTION_FORCE_REFRESH="com.tfasset.app.WIDGET_FORCE_REFRESH"}
  override fun onUpdate(context:Context,manager:AppWidgetManager,ids:IntArray){ ids.forEach { manager.updateAppWidget(it,buildViews(context,it,manager)) } }
  override fun onAppWidgetOptionsChanged(context:Context,manager:AppWidgetManager,appWidgetId:Int,newOptions:android.os.Bundle){
    manager.updateAppWidget(appWidgetId,buildViews(context,appWidgetId,manager))
  }
  override fun onReceive(context:Context,intent:Intent){
    super.onReceive(context,intent)
    if(intent.action==ACTION_FORCE_REFRESH){
      context.getSharedPreferences("tf_asset_native",0).edit().putLong("widget_force_refresh_requested_at",System.currentTimeMillis()).apply()
      val launch=context.packageManager.getLaunchIntentForPackage(context.packageName)
      if(launch!=null){
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        launch.putExtra("tfasset_force_market_refresh",true)
        context.startActivity(launch)
      }
    }
  }

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

  private fun buildViews(context:Context,appWidgetId:Int,manager:AppWidgetManager):RemoteViews{
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
    val wallIds=intArrayOf(
      R.id.widget_wall_1,R.id.widget_wall_2,R.id.widget_wall_3,R.id.widget_wall_4,
      R.id.widget_wall_5,R.id.widget_wall_6,R.id.widget_wall_7,R.id.widget_wall_8,
      R.id.widget_wall_9,R.id.widget_wall_10,R.id.widget_wall_11,R.id.widget_wall_12,
      R.id.widget_wall_13,R.id.widget_wall_14,R.id.widget_wall_15,R.id.widget_wall_16
    )

    val text=parseColor(style.optString("textColor","#0F172A"),Color.rgb(15,23,42))
    val gain=parseColor(style.optString("gainColor","#EF4444"),Color.rgb(239,68,68))
    val loss=parseColor(style.optString("lossColor","#10B981"),Color.rgb(16,185,129))
    val neutral=parseColor(style.optString("neutralColor","#64748B"),Color.rgb(100,116,139))
    val densityScale=when(template){"minimal"->1.12;"compact"->.92;"advanced"->.9;else->1.0}
    val fs=style.optDouble("fontScale",1.0).coerceIn(.7,1.8)*densityScale
    val options=manager.getAppWidgetOptions(appWidgetId)
    val minWidth=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,220)
    val minHeight=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,110)
    val configuredColumns=config.optInt("wallColumns",4).coerceIn(1,4)
    val autoColumns=when{minWidth>=360->4;minWidth>=270->3;minWidth>=180->2;else->1}
    val wallColumns=minOf(configuredColumns,autoColumns)
    val wallRows=(minHeight/92).coerceIn(1,4)
    val wallCapacity=(wallColumns*wallRows).coerceIn(1,16)
    val profitFields=jsonStrings(config.optJSONArray("profitColorFields")).toSet()
    val titleFs=style.optDouble("titleFontScale",1.0).coerceIn(.7,1.8)*densityScale
    val align=when(style.optString("textAlign","left")){"center"->Gravity.CENTER;"right"->Gravity.END;else->Gravity.START}

    val wallMode=template=="quote-wall"
    views.setViewVisibility(R.id.widget_summary,if(wallMode)View.GONE else View.VISIBLE)
    views.setViewVisibility(R.id.widget_wall,if(wallMode)View.VISIBLE else View.GONE)
    views.setTextViewText(R.id.widget_title,if(wallMode)"持股行情牆" else "TF Asset")
    views.setTextColor(R.id.widget_title,text)
    views.setTextColor(R.id.widget_refresh,neutral)
    if(!wallMode){
      ids.forEachIndexed{index,id->
        val field=selectedFields.getOrNull(index)
        if(field==null){
          views.setViewVisibility(id,View.GONE)
        }else{
          val rendered=renderField(field,asset,first)
          views.setViewVisibility(id,View.VISIBLE)
          views.setTextViewText(id,rendered.first)
          val useProfit=profitFields.contains(field)
          views.setTextColor(id,when{
            !useProfit||!rendered.second.isFinite()->text
            rendered.second>0->gain
            rendered.second<0->loss
            else->neutral
          })
          views.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,((if(index==0)13*titleFs else 11.5*fs)).toFloat())
          views.setInt(id,"setGravity",align)
        }
      }
      wallIds.forEach{views.setViewVisibility(it,View.GONE)}
    }else{
      val rows=orderedHoldings(snapshot,config).take(wallCapacity)
      wallIds.forEachIndexed{index,id->
        val row=rows.getOrNull(index)
        if(row==null||index>=wallCapacity){
          views.setViewVisibility(id,View.GONE)
        }else{
          val pct=row.optDouble("changePercent",Double.NaN)
          val pnl=row.optDouble("pnl",Double.NaN)
          val roi=row.optDouble("roi",Double.NaN)
          val line=row.optString("name",row.optString("symbol","--"))+"\n"+
            row.optString("symbol","--")+"  "+number2(row,"price")+"  "+signed2(pct,"%")+"\n"+
            "持股損益 "+signedMoney(pnl)+"  報酬 "+signed2(roi,"%")
          views.setViewVisibility(id,View.VISIBLE)
          views.setTextViewText(id,line)
          views.setTextColor(id,if(pct>0)gain else if(pct<0)loss else text)
          views.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,(10.5*fs).toFloat())
        }
      }
    }

    val bg=parseColor(style.optString("backgroundColor","#FFFFFF"),Color.WHITE)
    val opacity=if(template=="transparent")minOf(style.optDouble("backgroundOpacity",.72),.72) else style.optDouble("backgroundOpacity",.94)
    val alpha=(opacity.coerceIn(.1,1.0)*255).roundToInt()
    views.setInt(R.id.widget_root,"setBackgroundColor",Color.argb(alpha,Color.red(bg),Color.green(bg),Color.blue(bg)))

    val launch=context.packageManager.getLaunchIntentForPackage(context.packageName)
    if(launch!=null){
      val pending=PendingIntent.getActivity(context,appWidgetId,launch,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      views.setOnClickPendingIntent(R.id.widget_root,pending)
    }
    val refreshIntent=Intent(context,TfAssetWidgetProvider::class.java).setAction(ACTION_FORCE_REFRESH)
    val refreshPending=PendingIntent.getBroadcast(context,10000+appWidgetId,refreshIntent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    views.setOnClickPendingIntent(R.id.widget_refresh,refreshPending)
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

  private fun signed2(v:Double,suffix:String="")=if(v.isFinite())((if(v>=0)"+" else "")+String.format("%.2f",v)+suffix) else "--"
  private fun signedMoney(v:Double)=if(v.isFinite())((if(v>=0)"+" else "")+String.format("%,.0f",v)) else "--"
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
