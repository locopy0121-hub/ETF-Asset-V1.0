package com.tfasset.app

import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.roundToInt

class TfAssetOverlayService:Service(){
  companion object{const val ACTION_START="TF_ASSET_MONITOR_START";const val ACTION_REFRESH="TF_ASSET_MONITOR_REFRESH"}
  private lateinit var wm:WindowManager
  private var root:LinearLayout?=null
  private var params:WindowManager.LayoutParams?=null
  private var mode="normal"
  private var lastLayoutSignature:String?=null
  private var downX=0f;private var downY=0f;private var startX=0;private var startY=0;private var lastTap=0L

  override fun onCreate(){super.onCreate();wm=getSystemService(WINDOW_SERVICE) as WindowManager}
  override fun onBind(intent:Intent?):IBinder?=null
  override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int{
    if(!Settings.canDrawOverlays(this)){writeRuntimeStatus(false,null);return START_NOT_STICKY}
    ensureView();render();return START_STICKY
  }
  override fun onDestroy(){
    root?.let{runCatching{wm.removeView(it)}};root=null
    writeRuntimeStatus(false,null)
    super.onDestroy()
  }

  private fun prefs()=getSharedPreferences("tf_asset_native",0)
  private fun readConfig()=runCatching{JSONObject(prefs().getString("monitor_config","{}")?:"{}")}.getOrElse{JSONObject()}
  private fun readSnapshot()=runCatching{JSONObject(prefs().getString("snapshot","{}")?:"{}")}.getOrElse{JSONObject()}
  private fun activeLayout(cfg:JSONObject)=cfg.optJSONObject(if(mode=="mini")"miniLayout" else "normalLayout")?:JSONObject()

  private fun ensureView(){
    if(root!=null)return
    val cfg=readConfig()
    mode=cfg.optString("mode","normal").let{if(it=="mini")"mini" else "normal"}
    val layout=activeLayout(cfg)
    val pxKey="monitor_"+mode+"_x";val pyKey="monitor_"+mode+"_y"
    val x=if(prefs().contains(pxKey))prefs().getInt(pxKey,layout.optInt("x",16)) else layout.optInt("x",16)
    val y=if(prefs().contains(pyKey))prefs().getInt(pyKey,layout.optInt("y",120)) else layout.optInt("y",120)
    params=WindowManager.LayoutParams(
      layout.optInt("width",if(mode=="mini")360 else 320),
      layout.optInt("height",if(mode=="mini")330 else 420),
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
      PixelFormat.TRANSLUCENT
    ).apply{gravity=Gravity.TOP or Gravity.START;this.x=x;this.y=y}
    lastLayoutSignature=layoutSignature(cfg)
    root=LinearLayout(this).apply{
      orientation=LinearLayout.VERTICAL
      setOnTouchListener(dragListener)
    }
    wm.addView(root,params)
  }

  private fun layoutSignature(cfg:JSONObject):String{
    val configMode=cfg.optString("mode","normal").let{if(it=="mini")"mini" else "normal"}
    val layout=cfg.optJSONObject(if(configMode=="mini")"miniLayout" else "normalLayout")?:JSONObject()
    return configMode+"|"+layout.toString()
  }

  private fun applyConfiguredLayoutIfChanged(cfg:JSONObject){
    val nextMode=cfg.optString("mode","normal").let{if(it=="mini")"mini" else "normal"}
    val nextLayout=cfg.optJSONObject(if(nextMode=="mini")"miniLayout" else "normalLayout")?:JSONObject()
    val signature=nextMode+"|"+nextLayout.toString()
    if(signature==lastLayoutSignature)return
    mode=nextMode
    val p=params?:return
    p.width=nextLayout.optInt("width",if(mode=="mini")360 else 320)
    p.height=nextLayout.optInt("height",if(mode=="mini")330 else 420)
    p.x=nextLayout.optInt("x",16);p.y=nextLayout.optInt("y",120)
    prefs().edit().putInt("monitor_"+mode+"_x",p.x).putInt("monitor_"+mode+"_y",p.y).apply()
    root?.let{wm.updateViewLayout(it,p)}
    lastLayoutSignature=signature
  }

  private val dragListener=View.OnTouchListener{_,e->
    val p=params?:return@OnTouchListener false
    when(e.action){
      MotionEvent.ACTION_DOWN->{downX=e.rawX;downY=e.rawY;startX=p.x;startY=p.y;true}
      MotionEvent.ACTION_MOVE->{p.x=startX+(e.rawX-downX).roundToInt();p.y=startY+(e.rawY-downY).roundToInt();root?.let{wm.updateViewLayout(it,p)};true}
      MotionEvent.ACTION_UP->{val now=System.currentTimeMillis();if(now-lastTap<320){toggleMode()}else{savePosition(p.x,p.y)};lastTap=now;true}
      else->false
    }
  }

  private fun toggleMode(){
    val cfg=readConfig()
    mode=if(mode=="mini")"normal" else "mini"
    val layout=activeLayout(cfg)
    val p=params?:return
    p.width=layout.optInt("width",if(mode=="mini")360 else 320)
    p.height=layout.optInt("height",if(mode=="mini")330 else 420)
    val pxKey="monitor_"+mode+"_x";val pyKey="monitor_"+mode+"_y"
    p.x=if(prefs().contains(pxKey))prefs().getInt(pxKey,layout.optInt("x",16)) else layout.optInt("x",16)
    p.y=if(prefs().contains(pyKey))prefs().getInt(pyKey,layout.optInt("y",120)) else layout.optInt("y",120)
    root?.let{wm.updateViewLayout(it,p)}
    lastLayoutSignature=mode+"|"+layout.toString()
    render()
  }
  private fun savePosition(x:Int,y:Int){
    prefs().edit().putInt("monitor_"+mode+"_x",x).putInt("monitor_"+mode+"_y",y).apply()
    writeRuntimeStatus(true,prefs().getString("monitor_display_symbol",null))
  }

  private fun jsonStrings(array:JSONArray?):List<String>{
    if(array==null)return emptyList()
    return (0 until array.length()).mapNotNull{array.optString(it,"").trim().uppercase().takeIf(String::isNotEmpty)}
  }

  private fun orderedHoldings(snapshot:JSONObject,cfg:JSONObject):List<JSONObject>{
    val array=snapshot.optJSONArray("holdings")?:return emptyList()
    val all=(0 until array.length()).mapNotNull{array.optJSONObject(it)}
    val selected=jsonStrings(cfg.optJSONArray("selectedSymbols")).toSet()
    val rows=(if(selected.isEmpty())all else all.filter{selected.contains(it.optString("symbol","").uppercase())}).toMutableList()
    val sort=cfg.optJSONObject("sort")?:JSONObject()
    val key=sort.optString("key","manual")
    val direction=if(sort.optString("direction","asc")=="desc")-1 else 1
    if(key=="manual"){
      val rank=jsonStrings(sort.optJSONArray("manualSymbols")).withIndex().associate{it.value to it.index}
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

  private fun compareNumber(a:Double,b:Double):Int{
    val aa=if(a.isFinite())a else Double.POSITIVE_INFINITY
    val bb=if(b.isFinite())b else Double.POSITIVE_INFINITY
    return aa.compareTo(bb)
  }

  private fun render(){
    val r=root?:return
    val cfg=readConfig()
    applyConfiguredLayoutIfChanged(cfg)
    val snap=readSnapshot()
    val style=cfg.optJSONObject(if(mode=="mini")"miniStyle" else "normalStyle")?:JSONObject()
    r.removeAllViews()
    val padding=style.optInt("padding",if(mode=="mini")6 else 12)
    r.setPadding(padding,padding,padding,padding)
    val bg=color(style.optString("backgroundColor","#0F172A"),Color.rgb(15,23,42))
    val alpha=(style.optDouble("backgroundOpacity",.92).coerceIn(.1,1.0)*255).roundToInt()
    r.setBackgroundColor(Color.argb(alpha,Color.red(bg),Color.green(bg),Color.blue(bg)))
    if(mode=="mini")renderMini(r,cfg,snap,style) else renderNormal(r,cfg,snap,style)
    val first=orderedHoldings(snap,cfg).firstOrNull()
    writeRuntimeStatus(true,first?.optString("symbol",""))
  }

  private fun renderNormal(root:LinearLayout,cfg:JSONObject,snap:JSONObject,style:JSONObject){
    val first=orderedHoldings(snap,cfg).firstOrNull()
    val symbol=first?.optString("symbol","--")?:"--";val name=first?.optString("name","")?:""
    val price=first?.optDouble("price",Double.NaN)?:Double.NaN;val pct=first?.optDouble("changePercent",Double.NaN)?:Double.NaN
    val text=color(style.optString("textColor","#FFFFFF"),Color.WHITE);val gain=color(style.optString("gainColor","#EF4444"),Color.RED);val loss=color(style.optString("lossColor","#10B981"),Color.GREEN);val neutral=color(style.optString("neutralColor","#94A3B8"),Color.GRAY)
    val fs=style.optDouble("fontScale",1.0).coerceIn(.7,1.8).toFloat();val vs=style.optDouble("valueFontScale",1.0).coerceIn(.7,2.0).toFloat()
    root.addView(textView(symbol+" "+name,text,12*fs,Gravity.START))
    root.addView(textView(if(price.isFinite())String.format("%.2f",price) else "等待資料",text,20*vs,Gravity.START))
    root.addView(textView(if(pct.isFinite())(if(pct>=0)"+" else "")+String.format("%.2f",pct)+"%" else "",if(!pct.isFinite())neutral else if(pct>=0)gain else loss,12*fs,Gravity.START))
  }

  private fun renderMini(root:LinearLayout,cfg:JSONObject,snap:JSONObject,style:JSONObject){
    val columnsJson=cfg.optJSONArray("miniColumns")
    val columns=(0 until (columnsJson?.length()?:0)).mapNotNull{columnsJson?.optJSONObject(it)}.filter{it.optBoolean("enabled",true)}
    val header=cfg.optJSONObject("miniHeader")?:JSONObject()
    if(header.optBoolean("visible",true)&&columns.isNotEmpty()){
      val headerRow=LinearLayout(this).apply{
        orientation=LinearLayout.HORIZONTAL
        gravity=Gravity.CENTER_VERTICAL
        minimumHeight=header.optInt("height",30)
        val headerBg=color(header.optString("backgroundColor","#111827"),Color.rgb(17,24,39))
        val headerAlpha=(header.optDouble("backgroundOpacity",.96).coerceIn(.1,1.0)*255).roundToInt()
        setBackgroundColor(Color.argb(headerAlpha,Color.red(headerBg),Color.green(headerBg),Color.blue(headerBg)))
      }
      val headerText=color(header.optString("textColor","#CBD5E1"),Color.LTGRAY)
      val headerScale=header.optDouble("fontScale",.9).coerceIn(.7,1.6).toFloat()
      columns.forEach{column->
        headerRow.addView(textView(column.optString("label",column.optString("field","")),headerText,11*headerScale,gravityFor(column.optString("align","left"))),weighted(column.optDouble("widthPercent",20.0).toFloat()))
      }
      root.addView(headerRow)
    }

    val rows=orderedHoldings(snap,cfg)
    val text=color(style.optString("textColor","#FFFFFF"),Color.WHITE)
    val gain=color(style.optString("gainColor","#EF4444"),Color.RED)
    val loss=color(style.optString("lossColor","#10B981"),Color.GREEN)
    val neutral=color(style.optString("neutralColor","#94A3B8"),Color.GRAY)
    val baseScale=style.optDouble("fontScale",.9).coerceIn(.7,1.8).toFloat()
    rows.forEach{holding->
      val row=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL;gravity=Gravity.CENTER_VERTICAL;minimumHeight=28}
      columns.forEach{column->
        val field=column.optString("field","symbol")
        val valueText=miniValue(holding,field)
        val numeric=miniNumeric(holding,field)
        val useProfit=column.optBoolean("useProfitColor",false)
        val tone=if(!useProfit||numeric==null)text else if(numeric>0)gain else if(numeric<0)loss else neutral
        val scale=(baseScale*column.optDouble("fontScale",1.0).coerceIn(.7,1.6)).toFloat()
        row.addView(textView(valueText,tone,11*scale,gravityFor(column.optString("align","left"))),weighted(column.optDouble("widthPercent",20.0).toFloat()))
      }
      root.addView(row)
    }
    if(rows.isEmpty())root.addView(textView("尚無持股資料",neutral,11*baseScale,Gravity.START))
  }

  private fun weighted(weight:Float)=LinearLayout.LayoutParams(0,LinearLayout.LayoutParams.WRAP_CONTENT,weight.coerceAtLeast(1f))
  private fun textView(value:String,tone:Int,size:Float,gravity:Int)=TextView(this).apply{
    text=value;setTextColor(tone);textSize=size;this.gravity=gravity;maxLines=1;setPadding(3,2,3,2)
  }
  private fun gravityFor(value:String)=when(value){"center"->Gravity.CENTER;"right"->Gravity.END;else->Gravity.START}

  private fun miniNumeric(row:JSONObject,field:String):Double?=when(field){
    "change"->row.optDouble("change",Double.NaN)
    "changePercent"->row.optDouble("changePercent",Double.NaN)
    "pnl"->row.optDouble("pnl",Double.NaN)
    "roi"->row.optDouble("roi",Double.NaN)
    "comprehensivePnl"->row.optDouble("comprehensivePnl",Double.NaN)
    else->Double.NaN
  }.takeIf{it.isFinite()}

  private fun miniValue(row:JSONObject,field:String):String=when(field){
    "symbol"->row.optString("symbol","--")
    "name"->row.optString("name","")
    "price"->number2(row,"price")
    "change"->signed2(row,"change")
    "changePercent"->signed2(row,"changePercent")+"%"
    "shares"->integer(row,"shares")
    "avgCost"->number2(row,"avgCost")
    "marketValue"->integer(row,"marketValue")
    "pnl"->signedInteger(row,"pnl")
    "roi"->signed2(row,"roi")+"%"
    "comprehensivePnl"->signedInteger(row,"comprehensivePnl")
    "marketStatus"->row.optString("marketStatus","--")
    "updatedAt"->row.optString("updatedAt","").let{if(it.length>=16)it.substring(11,16) else "--"}
    else->"--"
  }
  private fun number2(row:JSONObject,key:String):String{val v=row.optDouble(key,Double.NaN);return if(v.isFinite())String.format("%.2f",v) else "--"}
  private fun signed2(row:JSONObject,key:String):String{val v=row.optDouble(key,Double.NaN);return if(v.isFinite())(if(v>=0)"+" else "")+String.format("%.2f",v) else "--"}
  private fun integer(row:JSONObject,key:String):String{val v=row.optDouble(key,Double.NaN);return if(v.isFinite())String.format("%,.0f",v) else "--"}
  private fun signedInteger(row:JSONObject,key:String):String{val v=row.optDouble(key,Double.NaN);return if(v.isFinite())(if(v>=0)"+" else "")+String.format("%,.0f",v) else "--"}
  private fun writeRuntimeStatus(running:Boolean,symbol:String?){
    val p=params
    prefs().edit()
      .putBoolean("monitor_running",running)
      .putString("monitor_runtime_mode",mode)
      .putInt("monitor_runtime_x",p?.x?:0)
      .putInt("monitor_runtime_y",p?.y?:0)
      .putInt("monitor_runtime_width",p?.width?:0)
      .putInt("monitor_runtime_height",p?.height?:0)
      .putLong("monitor_last_sync_at",System.currentTimeMillis())
      .putString("monitor_display_symbol",symbol?:"")
      .apply()
  }
  private fun color(value:String,fallback:Int)=runCatching{Color.parseColor(value)}.getOrDefault(fallback)
}
