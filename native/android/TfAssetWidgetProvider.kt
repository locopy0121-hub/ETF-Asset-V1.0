package com.tfasset.app

import android.app.PendingIntent
import android.content.ComponentName
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.text.Layout
import android.text.Spannable
import android.text.SpannableStringBuilder
import android.text.style.AbsoluteSizeSpan
import android.text.style.AlignmentSpan
import android.text.style.BackgroundColorSpan
import android.text.style.ForegroundColorSpan
import android.text.style.RelativeSizeSpan
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.ceil
import kotlin.math.roundToInt
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.ResolverStyle

class TfAssetWidgetProvider : AppWidgetProvider() {
  companion object{
    const val ACTION_FORCE_REFRESH="com.tfasset.app.WIDGET_FORCE_REFRESH"
    @Volatile private var refreshing=false
  }
  override fun onUpdate(context:Context,manager:AppWidgetManager,ids:IntArray){ ids.forEach { manager.updateAppWidget(it,buildViews(context,it,manager)) } }
  override fun onAppWidgetOptionsChanged(context:Context,manager:AppWidgetManager,appWidgetId:Int,newOptions:android.os.Bundle){
    manager.updateAppWidget(appWidgetId,buildViews(context,appWidgetId,manager))
  }
  /** TWSE MIS supplies the trade-date d and exchange-time t; HTTP receipt time is never a quote tick. */
  private fun sourceQuoteAt(row:JSONObject,now:Long):Long?{
    val d=row.optString("d","").trim()
    val t=row.optString("t","").trim()
    if(!Regex("^\\d{8}$").matches(d)||!Regex("^\\d{2}:\\d{2}:\\d{2}$").matches(t))return null
    val parsed=runCatching{
      LocalDateTime.parse("$d $t",DateTimeFormatter.ofPattern("uuuuMMdd HH:mm:ss").withResolverStyle(ResolverStyle.STRICT))
        .atZone(ZoneId.of("Asia/Taipei")).toInstant().toEpochMilli()
    }.getOrNull()?:return null
    return parsed.takeIf{it>0L&&it<=now+120_000L&&it>=now-31L*86_400_000L}
  }

  private fun parsedTimestamp(value:String):Long=
    runCatching{Instant.parse(value).toEpochMilli()}.getOrDefault(0L)

  private fun exchangeClock(value:Long):String=
    if(value<=0L)"--:--:--" else java.text.SimpleDateFormat("HH:mm:ss",java.util.Locale.TAIWAN)
      .apply{timeZone=java.util.TimeZone.getTimeZone("Asia/Taipei")}.format(java.util.Date(value))

  override fun onReceive(context:Context,intent:Intent){
    super.onReceive(context,intent)
    if(intent.action!=ACTION_FORCE_REFRESH)return
    synchronized(TfAssetWidgetProvider::class.java){
      if(refreshing)return
      refreshing=true
    }
    val manager=AppWidgetManager.getInstance(context)
    val ids=manager.getAppWidgetIds(ComponentName(context,TfAssetWidgetProvider::class.java))
    ids.forEach{id->
      val progress=RemoteViews(context.packageName,R.layout.tf_asset_widget)
      progress.setTextViewText(R.id.widget_refresh,"行情更新中…")
      progress.setTextViewText(R.id.widget_refresh_status,"統一資料中心正在查詢官方行情…")
      manager.partiallyUpdateAppWidget(id,progress)
    }
    val prefs=context.getSharedPreferences("tf_asset_native",0)
    prefs.edit().putLong("widget_force_refresh_requested_at",System.currentTimeMillis()).apply()
    val pending=goAsync()
    Thread{
      try{
        val oldSnapshot=JSONObject(prefs.getString("snapshot","{}")?:"{}")
        val config=JSONObject(prefs.getString("widget_config","{}")?:"{}")
        val symbols=orderedHoldings(oldSnapshot,config).map{it.optString("symbol","")}
          .filter{it.matches(Regex("[0-9A-Za-z]{4,8}"))}.distinct()
        if(symbols.isEmpty())throw IllegalStateException("目前無持股代號")
        // Widget has NO second API implementation. It calls exactly the same native
        // official fetcher + SQLite transactional store as MarketRuntime/React.
        val state=TfAssetMarketCenter(context).refresh(symbols)
        val rows=state.optJSONArray("quotes")?:JSONArray()
        val status=if(state.optInt("updatedCount",0)>0)
          "行情中心 v"+state.optLong("version")+"｜更新"+state.optInt("updatedCount")+"檔"
          else "行情中心 v"+state.optLong("version")+"｜無新行情"
        val missing=state.optJSONArray("missing")?:JSONArray()
        val detail=if(missing.length()>0)
          "｜待取得 "+(0 until minOf(3,missing.length())).joinToString(","){missing.optString(it)}
          else ""
        val newest=(0 until rows.length()).mapNotNull{rows.optJSONObject(it)?.optLong("sourceQuoteAt",0L)}
          .maxOrNull()?:0L
        val edit=prefs.edit().putString("widget_refresh_status",status+detail+"｜財務按 App 快照同步")
        if(newest>0L)edit.putLong("wall_market_source_at",newest)
        edit.apply()
      }catch(error:Exception){
        prefs.edit().putString("widget_refresh_status","行情資料中心查詢失敗｜保留已驗證資料").apply()
      }finally{
        refreshing=false
        try{ids.forEach{id->manager.updateAppWidget(id,buildViews(context,id,manager))}}
        finally{pending.finish()}
      }
    }.start()
  }

  private fun jsonStrings(array:JSONArray?):List<String>{
    if(array==null)return emptyList()
    return (0 until array.length()).mapNotNull{array.optString(it,"").trim().takeIf(String::isNotEmpty)}
  }

  private fun fieldStyles(config:JSONObject):Map<String,JSONObject>{
    val array=config.optJSONArray("fieldStyles")?:return emptyMap()
    return (0 until array.length()).mapNotNull{array.optJSONObject(it)}
      .mapNotNull{item->item.optString("field","").takeIf(String::isNotBlank)?.let{it to item}}
      .toMap()
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
    val center=TfAssetMarketCenter(context)
    val stored=center.snapshot()
    val version=stored.optLong("version",0L)
    val rows=stored.optJSONArray("quotes")?:JSONArray()
    val bySymbol=(0 until rows.length()).mapNotNull{rows.optJSONObject(it)}
      .associateBy{it.optString("symbol","")}
    val canonical=orderedHoldings(snapshot,config)
    val canonicalVersion=snapshot.optLong("marketDataVersion",-1L)
    val hasAllQuotes=canonical.all{bySymbol.containsKey(it.optString("symbol",""))}
    val pricesMatch=canonical.all{original->
      val quote=bySymbol[original.optString("symbol","")]?:return@all false
      kotlin.math.abs(quote.optDouble("currentPrice",Double.NaN)-
        original.optDouble("price",Double.NaN))<0.0001
    }
    val financeSynchronized=canonicalVersion==version&&hasAllQuotes&&pricesMatch
    val asset=JSONObject((snapshot.optJSONObject("asset")?:JSONObject()).toString()).apply{
      if(!financeSynchronized){
        listOf("totalAssets","marketValue","unrealizedPnl","totalReturn").forEach{put(it,JSONObject.NULL)}
      }
    }
    val holdings=canonical.map{original->
      val quote=bySymbol[original.optString("symbol","")]
      JSONObject(original.toString()).apply{
        if(quote==null){
          listOf("price","previousClose","change","changePercent","updatedAt","marketValue",
            "pnl","roi","comprehensivePnl").forEach{put(it,JSONObject.NULL)}
          put("marketStatus","待取得")
        }else{
          val price=quote.optDouble("currentPrice",Double.NaN)
          val close=quote.optDouble("previousClose",Double.NaN)
          put("price",price)
          put("previousClose",if(close>0)close else JSONObject.NULL)
          put("change",if(close>0)price-close else JSONObject.NULL)
          put("changePercent",if(close>0)(price-close)/close*100 else JSONObject.NULL)
          put("updatedAt",Instant.ofEpochMilli(quote.optLong("sourceQuoteAt")).toString())
          put("marketStatus",if(quote.optString("quality")=="trade")"實際成交" else "官方收盤參考")
          if(!financeSynchronized){
            listOf("marketValue","pnl","roi","comprehensivePnl").forEach{put(it,JSONObject.NULL)}
          }
        }
      }
    }
    val first=holdings.firstOrNull()
    val template=config.optString("template","asset-summary")
    val capacity=when(template){"minimal"->2;"compact"->3;"quote-summary","transparent"->4;"asset-summary"->5;else->6}
    val configuredFields=jsonStrings(config.optJSONArray("fields")).ifEmpty{listOf("appName","totalAssets","symbol","price","changePercent")}
    val selectedFields=configuredFields.take(capacity)
    val styles=fieldStyles(config)
    val views=RemoteViews(context.packageName,R.layout.tf_asset_widget)
    val ids=intArrayOf(R.id.widget_line1,R.id.widget_line2,R.id.widget_line3,R.id.widget_line4,R.id.widget_line5,R.id.widget_line6)
    val wallGrid=arrayOf(
      intArrayOf(R.id.widget_wall_1,R.id.widget_wall_2,R.id.widget_wall_3,R.id.widget_wall_4),
      intArrayOf(R.id.widget_wall_5,R.id.widget_wall_6,R.id.widget_wall_7,R.id.widget_wall_8),
      intArrayOf(R.id.widget_wall_9,R.id.widget_wall_10,R.id.widget_wall_11,R.id.widget_wall_12),
      intArrayOf(R.id.widget_wall_13,R.id.widget_wall_14,R.id.widget_wall_15,R.id.widget_wall_16)
    )
    val wallRowIds=intArrayOf(R.id.widget_wall_row_1,R.id.widget_wall_row_2,R.id.widget_wall_row_3,R.id.widget_wall_row_4)
    val wallIds=wallGrid.flatMap{it.toList()}

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
    val perColumnDp=minWidth.toDouble()/wallColumns
    val wallFontFactor=(perColumnDp/120.0).coerceIn(0.7,1.0)
    val maxWallRows=(minHeight/92).coerceIn(1,4)
    val wallCapacity=(wallColumns*maxWallRows).coerceIn(1,16)
    // Four native grid slots per row; empty last-row cells remain invisible so columns never expand.
    val legacyProfitFields=jsonStrings(config.optJSONArray("profitColorFields")).toSet()
    val titleFs=style.optDouble("titleFontScale",1.0).coerceIn(.7,1.8)*densityScale
    val align=gravityFor(style.optString("textAlign","left"))
    val density=context.resources.displayMetrics.density

    val wallMode=template=="quote-wall"
    views.setViewVisibility(R.id.widget_summary,if(wallMode)View.GONE else View.VISIBLE)
    views.setViewVisibility(R.id.widget_wall,if(wallMode)View.VISIBLE else View.GONE)
    views.setTextViewText(R.id.widget_title,if(wallMode&&holdings.size>wallCapacity)"持股行情牆 · ${wallCapacity}/${holdings.size}" else if(wallMode)"持股行情牆" else "TF Asset")
    views.setTextColor(R.id.widget_title,text)
    views.setTextColor(R.id.widget_refresh,neutral)
    views.setTextViewText(R.id.widget_refresh,"↻ 更新")
    views.setTextColor(R.id.widget_refresh_status,neutral)
    views.setTextViewText(R.id.widget_refresh_status,prefs.getString("widget_refresh_status","行情尚未核實｜點擊更新")?:"行情尚未核實｜點擊更新")
    val forceRefreshEnabled=config.optBoolean("forceRefreshOnTap",true)
    views.setViewVisibility(R.id.widget_refresh,if(forceRefreshEnabled)View.VISIBLE else View.GONE)

    if(!wallMode){
      ids.forEachIndexed{index,id->
        val field=selectedFields.getOrNull(index)
        if(field==null){
          views.setViewVisibility(id,View.GONE)
        }else{
          val fieldConfig=styles[field]?:JSONObject()
          val visual=fieldConfig.optJSONObject("visual")?:JSONObject()
          val label=fieldConfig.optString("label",defaultLabel(field))
          val rendered=renderField(field,asset,first,label)
          val useProfit=if(visual.has("useProfitColor"))visual.optBoolean("useProfitColor",false) else legacyProfitFields.contains(field)
          val customText=visual.optString("textColor","").takeIf(String::isNotBlank)?.let{parseColor(it,text)}
          val tone=when{
            useProfit&&rendered.second.isFinite()&&rendered.second>0->gain
            useProfit&&rendered.second.isFinite()&&rendered.second<0->loss
            useProfit&&rendered.second.isFinite()->neutral
            customText!=null->customText
            else->text
          }
          val itemScale=visual.optDouble("fontScale",1.0).coerceIn(.7,2.0)
          val itemAlign=visual.optString("textAlign","").takeIf(String::isNotBlank)?.let(::gravityFor)?:align
          val gap=if(visual.has("lineGap")&&!visual.isNull("lineGap"))visual.optInt("lineGap",style.optInt("rowGap",6)).coerceIn(0,32) else style.optInt("rowGap",6).coerceIn(0,32)
          val paddingY=visual.optInt("paddingY",0).coerceIn(0,16)
          val bg=visual.optString("backgroundColor","").takeIf(String::isNotBlank)?.let{parseColor(it,Color.TRANSPARENT)}?:Color.TRANSPARENT
          views.setViewVisibility(id,View.VISIBLE)
          views.setTextViewText(id,rendered.first)
          views.setTextColor(id,tone)
          views.setInt(id,"setBackgroundColor",bg)
          val staticBounceScale=bounceScale(visual,rendered.second)
          views.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,(((if(index==0)13*titleFs else 11.5*fs))*itemScale*staticBounceScale).toFloat())
          views.setInt(id,"setGravity",itemAlign)
          val top=((if(index==0)0 else gap)+paddingY)*density
          views.setViewPadding(id,0,top.roundToInt(),0,(paddingY*density).roundToInt())
          applyStaticEffect(views,id,visual,rendered.second)
        }
      }
      wallIds.forEach{views.setViewVisibility(it,View.GONE)}
      wallRowIds.forEach{views.setViewVisibility(it,View.GONE)}
    }else{
      ids.forEach{views.setViewVisibility(it,View.GONE)}
      wallIds.forEach{views.setViewVisibility(it,View.GONE)}
      wallRowIds.forEach{views.setViewVisibility(it,View.GONE)}
      val rows=holdings.take(wallCapacity)
      val visibleRows=if(rows.isEmpty())1 else ceil(rows.size.toDouble()/wallColumns).toInt().coerceIn(1,maxWallRows)
      repeat(visibleRows){views.setViewVisibility(wallRowIds[it],View.VISIBLE)}
      val supported=setOf("symbol","name","price","change","changePercent","shares","avgCost","holdingMarketValue","pnl","roi","comprehensivePnl","marketStatus","updatedAt","dailyPnl","quote")
      val wallFields=configuredFields.filter{supported.contains(it)}.take(4).ifEmpty{listOf("name","symbol","price","changePercent")}
      // Preserve a fixed column grid: hidden columns are GONE, empty trailing cells INVISIBLE.
      repeat(visibleRows){r->repeat(4){c->
        views.setViewVisibility(wallGrid[r][c],if(c>=wallColumns)View.GONE else View.INVISIBLE)
      }}
      rows.forEachIndexed{index,row->
        val rowIndex=index/wallColumns
        val columnIndex=index%wallColumns
        val id=wallGrid[rowIndex][columnIndex]
        val card=buildWallCard(row,asset,wallFields,styles,text,gain,loss,neutral,legacyProfitFields,style.optInt("rowGap",6),style.optString("textAlign","left"))
        views.setViewVisibility(id,View.VISIBLE)
        views.setTextViewText(id,card)
        views.setTextColor(id,text)
        views.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,(10.5*fs*wallFontFactor).toFloat())
      }
    }

    val bg=parseColor(style.optString("backgroundColor","#FFFFFF"),Color.WHITE)
    val opacity=if(template=="transparent")minOf(style.optDouble("backgroundOpacity",.72),.72) else style.optDouble("backgroundOpacity",.94)
    val alpha=(opacity.coerceIn(.1,1.0)*255).roundToInt()
    views.setInt(R.id.widget_root,"setBackgroundColor",Color.argb(alpha,Color.red(bg),Color.green(bg),Color.blue(bg)))

    if(forceRefreshEnabled){
      val refreshIntent=Intent(context,TfAssetWidgetProvider::class.java).setAction(ACTION_FORCE_REFRESH)
      val refreshPending=PendingIntent.getBroadcast(context,10000+appWidgetId,refreshIntent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      views.setOnClickPendingIntent(R.id.widget_root,refreshPending)
      views.setOnClickPendingIntent(R.id.widget_refresh,refreshPending)
      wallIds.forEach{views.setOnClickPendingIntent(it,refreshPending)}
    }
    return views
  }

  private fun buildWallCard(
    holding:JSONObject,
    asset:JSONObject,
    fields:List<String>,
    styles:Map<String,JSONObject>,
    text:Int,
    gain:Int,
    loss:Int,
    neutral:Int,
    legacyProfitFields:Set<String>,
    globalGap:Int,
    globalAlign:String
  ):CharSequence{
    val out=SpannableStringBuilder()
    fields.forEachIndexed{index,field->
      val fieldConfig=styles[field]?:JSONObject()
      val visual=fieldConfig.optJSONObject("visual")?:JSONObject()
      val label=fieldConfig.optString("label",defaultLabel(field))
      val rendered=renderField(field,asset,holding,label)
      val paddingY=visual.optInt("paddingY",0).coerceIn(0,16)
      if(paddingY>0){
        val topPadStart=out.length
        out.append("\u200B\n")
        out.setSpan(AbsoluteSizeSpan(paddingY,true),topPadStart,out.length,Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
      }
      val start=out.length
      out.append(rendered.first)
      val end=out.length
      val useProfit=if(visual.has("useProfitColor"))visual.optBoolean("useProfitColor",false) else legacyProfitFields.contains(field)
      val customText=visual.optString("textColor","").takeIf(String::isNotBlank)?.let{parseColor(it,text)}
      val tone=when{
        useProfit&&rendered.second.isFinite()&&rendered.second>0->gain
        useProfit&&rendered.second.isFinite()&&rendered.second<0->loss
        useProfit&&rendered.second.isFinite()->neutral
        customText!=null->customText
        else->text
      }
      val effectTone=withAlpha(tone,staticEffectAlpha(visual,rendered.second))
      out.setSpan(ForegroundColorSpan(effectTone),start,end,Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
      val scale=visual.optDouble("fontScale",1.0).coerceIn(.7,2.0).toFloat()*bounceScale(visual,rendered.second)
      out.setSpan(RelativeSizeSpan(scale),start,end,Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
      val bg=visual.optString("backgroundColor","")
      if(bg.isNotBlank())out.setSpan(BackgroundColorSpan(parseColor(bg,Color.TRANSPARENT)),start,end,Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
      val alignment=when(visual.optString("textAlign","").takeIf(String::isNotBlank)?:globalAlign){
        "center"->Layout.Alignment.ALIGN_CENTER
        "right"->Layout.Alignment.ALIGN_OPPOSITE
        else->Layout.Alignment.ALIGN_NORMAL
      }
      out.setSpan(AlignmentSpan.Standard(alignment),start,end,Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
      if(index<fields.lastIndex){
        out.append("\n")
        val gap=if(visual.has("lineGap")&&!visual.isNull("lineGap"))visual.optInt("lineGap",globalGap).coerceIn(0,32) else globalGap.coerceIn(0,32)
        val spacerHeight=(gap+paddingY).coerceIn(0,48)
        if(spacerHeight>0){
          val spacerStart=out.length
          out.append("\u200B\n")
          out.setSpan(AbsoluteSizeSpan(spacerHeight,true),spacerStart,out.length,Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
      }else if(paddingY>0){
        val bottomPadStart=out.length
        out.append("\n\u200B")
        out.setSpan(AbsoluteSizeSpan(paddingY,true),bottomPadStart,out.length,Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
      }
    }
    return out
  }

  private fun staticEffectActive(effect:JSONObject,numeric:Double):Boolean{
    return when(effect.optString("trigger","change")){
      "gain"->numeric.isFinite()&&numeric>0
      "loss"->numeric.isFinite()&&numeric<0
      "alert"->false
      else->true
    }
  }

  private fun bounceScale(visual:JSONObject,numeric:Double):Float{
    val effect=visual.optJSONObject("effect")?:return 1f
    if(effect.optString("kind","none")!="bounce"||!staticEffectActive(effect,numeric))return 1f
    return when(effect.optString("intensity","medium")){
      "soft"->1.04f
      "strong"->1.12f
      else->1.08f
    }
  }

  private fun staticEffectAlpha(visual:JSONObject,numeric:Double):Float{
    val effect=visual.optJSONObject("effect")?:return 1f
    val kind=effect.optString("kind","none")
    if(kind=="none"||!staticEffectActive(effect,numeric))return 1f
    val intensity=effect.optString("intensity","medium")
    return when(kind){
      "fade"->when(intensity){"soft"->.94f;"strong"->.72f;else->.84f}
      "pulse"->when(intensity){"soft"->.96f;"strong"->.78f;else->.88f}
      "flash-on-change"->when(intensity){"soft"->.92f;"strong"->.68f;else->.80f}
      "bounce"->1f
      else->1f
    }
  }

  private fun withAlpha(tone:Int,alpha:Float):Int{
    val a=(Color.alpha(tone)*alpha.coerceIn(0f,1f)).roundToInt().coerceIn(0,255)
    return Color.argb(a,Color.red(tone),Color.green(tone),Color.blue(tone))
  }

  private fun applyStaticEffect(views:RemoteViews,id:Int,visual:JSONObject,numeric:Double){
    views.setFloat(id,"setAlpha",staticEffectAlpha(visual,numeric))
  }

  private fun defaultLabel(field:String)=when(field){
    "appName"->"App 名稱";"totalAssets"->"總資產";"marketValue"->"總市值";"cash"->"現金"
    "unrealizedPnl"->"未實現";"realizedPnl"->"已實現";"dividendIncome"->"股息";"totalReturn"->"總報酬"
    "symbol"->"代號";"name"->"名稱";"price"->"價格";"change"->"漲跌";"changePercent"->"漲跌%"
    "shares"->"股數";"avgCost"->"成本均";"holdingMarketValue"->"單檔市值";"pnl"->"持股損益";"roi"->"報酬%"
    "comprehensivePnl"->"含息損益";"marketStatus"->"狀態";"updatedAt"->"更新";"dailyPnl"->"當日損益";"quote"->"行情"
    else->field
  }

  private fun renderField(field:String,asset:JSONObject,holding:JSONObject?,label:String):Pair<String,Double>{
    val neutral=Double.NaN
    fun money(v:Double)=if(v.isFinite())String.format("%,.0f",v) else "--"
    fun signedMoney(v:Double)=if(v.isFinite())((if(v>=0)"+" else "")+String.format("%,.0f",v)) else "--"
    fun signed2(v:Double,suffix:String="")=if(v.isFinite())((if(v>=0)"+" else "")+String.format("%.2f",v)+suffix) else "--"
    return when(field){
      "appName"->"TF Asset" to neutral
      "totalAssets"->("$label NT$ "+money(asset.optDouble("totalAssets",Double.NaN))) to neutral
      "marketValue"->("$label NT$ "+money(asset.optDouble("marketValue",Double.NaN))) to neutral
      "cash"->("$label NT$ "+money(asset.optDouble("cash",Double.NaN))) to neutral
      "unrealizedPnl"->asset.optDouble("unrealizedPnl",Double.NaN).let{("$label "+signedMoney(it)) to it}
      "realizedPnl"->asset.optDouble("realizedPnl",Double.NaN).let{("$label "+signedMoney(it)) to it}
      "dividendIncome"->("$label "+money(asset.optDouble("dividendIncome",Double.NaN))) to neutral
      "totalReturn"->asset.optDouble("totalReturn",Double.NaN).let{("$label "+signedMoney(it)) to it}
      "symbol"->(holding?.optString("symbol","--")?:"--") to neutral
      "name"->(holding?.optString("name","--")?:"--") to neutral
      "price"->("$label "+number2(holding,"price")) to neutral
      "change"->valuePair("$label ",holding,"change",false)
      "changePercent"->valuePair("$label ",holding,"changePercent",true)
      "shares"->("$label "+integer(holding,"shares")) to neutral
      "avgCost"->("$label "+number2(holding,"avgCost")) to neutral
      "holdingMarketValue"->("$label "+integer(holding,"marketValue")) to neutral
      "pnl"->valuePair("$label ",holding,"pnl",false,true)
      "roi"->valuePair("$label ",holding,"roi",true)
      "comprehensivePnl"->valuePair("$label ",holding,"comprehensivePnl",false,true)
      "marketStatus"->("$label "+(holding?.optString("marketStatus","--")?:"--")) to neutral
      "updatedAt"->("$label "+timeText(holding?.optString("updatedAt","")?:"")) to neutral
      "dailyPnl"->valuePair("$label ",holding,"change",false)
      "quote"->{
        val symbol=holding?.optString("symbol","--")?:"--"
        val price=number2(holding,"price")
        val pct=holding?.optDouble("changePercent",Double.NaN)?:Double.NaN
        (symbol+" "+price+" "+signed2(pct,"%")) to pct
      }
      else->"--" to neutral
    }
  }

  private fun gravityFor(value:String)=when(value){"center"->Gravity.CENTER;"right"->Gravity.END;else->Gravity.START}
  private fun signed2(v:Double,suffix:String="")=if(v.isFinite())((if(v>=0)"+" else "")+String.format("%.2f",v)+suffix) else "--"
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
