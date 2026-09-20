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
    if(!Settings.canDrawOverlays(this))return START_NOT_STICKY
    ensureView()
    render()
    return START_STICKY
  }
  override fun onDestroy(){root?.let{runCatching{wm.removeView(it)}};root=null;super.onDestroy()}

  private fun readConfig():JSONObject{
    val prefs=getSharedPreferences("tf_asset_native",0)
    return runCatching{JSONObject(prefs.getString("monitor_config","{}")?:"{}")}.getOrElse{JSONObject()}
  }

  private fun activeLayout(cfg:JSONObject):JSONObject=
    cfg.optJSONObject(if(mode=="mini")"miniLayout" else "normalLayout")?:JSONObject()

  private fun ensureView(){
    if(root!=null)return
    val prefs=getSharedPreferences("tf_asset_native",0)
    val cfg=readConfig()
    mode=cfg.optString("mode","normal").let{if(it=="mini")"mini" else "normal"}
    val layout=activeLayout(cfg)
    val pxKey="monitor_"+mode+"_x";val pyKey="monitor_"+mode+"_y"
    val x=if(prefs.contains(pxKey))prefs.getInt(pxKey,layout.optInt("x",16)) else layout.optInt("x",16)
    val y=if(prefs.contains(pyKey))prefs.getInt(pyKey,layout.optInt("y",120)) else layout.optInt("y",120)
    params=WindowManager.LayoutParams(
      layout.optInt("width",if(mode=="mini")180 else 320),
      layout.optInt("height",if(mode=="mini")72 else 420),
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
      PixelFormat.TRANSLUCENT
    ).apply{gravity=Gravity.TOP or Gravity.START;this.x=x;this.y=y}
    lastLayoutSignature=layoutSignature(cfg)
    root=LinearLayout(this).apply{
      orientation=LinearLayout.VERTICAL;setPadding(18,14,18,14)
      addView(TextView(this@TfAssetOverlayService).apply{id=1001})
      addView(TextView(this@TfAssetOverlayService).apply{id=1002})
      addView(TextView(this@TfAssetOverlayService).apply{id=1003})
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
    p.width=nextLayout.optInt("width",if(mode=="mini")180 else 320)
    p.height=nextLayout.optInt("height",if(mode=="mini")72 else 420)
    p.x=nextLayout.optInt("x",16)
    p.y=nextLayout.optInt("y",120)
    getSharedPreferences("tf_asset_native",0).edit()
      .putInt("monitor_"+mode+"_x",p.x)
      .putInt("monitor_"+mode+"_y",p.y)
      .apply()
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
    val prefs=getSharedPreferences("tf_asset_native",0)
    val cfg=readConfig()
    mode=if(mode=="mini")"normal" else "mini"
    val layout=activeLayout(cfg)
    val p=params?:return
    p.width=layout.optInt("width",if(mode=="mini")180 else 320)
    p.height=layout.optInt("height",if(mode=="mini")72 else 420)
    val pxKey="monitor_"+mode+"_x";val pyKey="monitor_"+mode+"_y"
    p.x=if(prefs.contains(pxKey))prefs.getInt(pxKey,layout.optInt("x",16)) else layout.optInt("x",16)
    p.y=if(prefs.contains(pyKey))prefs.getInt(pyKey,layout.optInt("y",120)) else layout.optInt("y",120)
    root?.let{wm.updateViewLayout(it,p)}
    lastLayoutSignature=mode+"|"+layout.toString()
    render()
  }

  private fun savePosition(x:Int,y:Int){
    getSharedPreferences("tf_asset_native",0).edit()
      .putInt("monitor_"+mode+"_x",x)
      .putInt("monitor_"+mode+"_y",y)
      .apply()
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
    val prefs=getSharedPreferences("tf_asset_native",0)
    val cfg=readConfig()
    applyConfiguredLayoutIfChanged(cfg)
    val snap=runCatching{JSONObject(prefs.getString("snapshot","{}")?:"{}")}.getOrElse{JSONObject()}
    val style=cfg.optJSONObject(if(mode=="mini")"miniStyle" else "normalStyle")?:JSONObject()
    val first=orderedHoldings(snap,cfg).firstOrNull()
    val symbol=first?.optString("symbol","--")?:"--"
    val name=first?.optString("name","")?:""
    val price=first?.optDouble("price",Double.NaN)?:Double.NaN
    val pct=first?.optDouble("changePercent",Double.NaN)?:Double.NaN
    val text=color(style.optString("textColor","#FFFFFF"),Color.WHITE)
    val gain=color(style.optString("gainColor","#EF4444"),Color.RED)
    val loss=color(style.optString("lossColor","#10B981"),Color.GREEN)
    val neutral=color(style.optString("neutralColor","#94A3B8"),Color.GRAY)
    val fs=style.optDouble("fontScale",1.0).coerceIn(.7,1.8).toFloat()
    val vs=style.optDouble("valueFontScale",1.0).coerceIn(.7,2.0).toFloat()
    r.findViewById<TextView>(1001).apply{this.text=symbol+" "+name;setTextColor(text);textSize=12*fs}
    r.findViewById<TextView>(1002).apply{this.text=if(price.isFinite())String.format("%.2f",price) else "等待資料";setTextColor(text);textSize=20*vs}
    r.findViewById<TextView>(1003).apply{
      this.text=if(pct.isFinite())(if(pct>=0)"+" else "")+String.format("%.2f",pct)+"%" else ""
      setTextColor(if(!pct.isFinite())neutral else if(pct>=0)gain else loss)
      textSize=12*fs
    }
    val bg=color(style.optString("backgroundColor","#0F172A"),Color.rgb(15,23,42))
    val a=(style.optDouble("backgroundOpacity",.92).coerceIn(.1,1.0)*255).roundToInt()
    r.setBackgroundColor(Color.argb(a,Color.red(bg),Color.green(bg),Color.blue(bg)))
  }

  private fun color(value:String,fallback:Int)=runCatching{Color.parseColor(value)}.getOrDefault(fallback)
}
