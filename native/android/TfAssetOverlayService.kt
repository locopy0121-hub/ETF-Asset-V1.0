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
import org.json.JSONObject
import kotlin.math.roundToInt

class TfAssetOverlayService:Service(){
  companion object{const val ACTION_START="TF_ASSET_MONITOR_START";const val ACTION_REFRESH="TF_ASSET_MONITOR_REFRESH"}
  private lateinit var wm:WindowManager
  private var root:LinearLayout?=null
  private var params:WindowManager.LayoutParams?=null
  private var mode="normal"
  private var downX=0f;private var downY=0f;private var startX=0;private var startY=0;private var lastTap=0L
  override fun onCreate(){super.onCreate();wm=getSystemService(WINDOW_SERVICE) as WindowManager}
  override fun onBind(intent:Intent?):IBinder?=null
  override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int{
    if(!Settings.canDrawOverlays(this))return START_NOT_STICKY
    ensureView();render();return START_STICKY
  }
  override fun onDestroy(){root?.let{runCatching{wm.removeView(it)}};root=null;super.onDestroy()}
  private fun ensureView(){
    if(root!=null)return
    val prefs=getSharedPreferences("tf_asset_native",0)
    val cfg=runCatching{JSONObject(prefs.getString("monitor_config","{}")?:"{}")}.getOrElse{JSONObject()}
    mode=cfg.optString("mode","normal")
    val layout=cfg.optJSONObject(if(mode=="mini")"miniLayout" else "normalLayout")?:JSONObject()
    params=WindowManager.LayoutParams(layout.optInt("width",if(mode=="mini")180 else 320),layout.optInt("height",if(mode=="mini")72 else 420),WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,PixelFormat.TRANSLUCENT).apply{
      gravity=Gravity.TOP or Gravity.START;x=layout.optInt("x",16);y=layout.optInt("y",120)
    }
    root=LinearLayout(this).apply{
      orientation=LinearLayout.VERTICAL;setPadding(18,14,18,14)
      addView(TextView(this@TfAssetOverlayService).apply{id=1001})
      addView(TextView(this@TfAssetOverlayService).apply{id=1002})
      addView(TextView(this@TfAssetOverlayService).apply{id=1003})
      setOnTouchListener(dragListener)
    }
    wm.addView(root,params)
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
    val cfg=runCatching{JSONObject(prefs.getString("monitor_config","{}")?:"{}")}.getOrElse{JSONObject()}
    mode=if(mode=="mini")"normal" else "mini"
    val layout=cfg.optJSONObject(if(mode=="mini")"miniLayout" else "normalLayout")?:return
    params?.let{it.width=layout.optInt("width",320);it.height=layout.optInt("height",120);it.x=layout.optInt("x",16);it.y=layout.optInt("y",120);root?.let{v->wm.updateViewLayout(v,it)}}
    render()
  }
  private fun savePosition(x:Int,y:Int){getSharedPreferences("tf_asset_native",0).edit().putInt("monitor_"+mode+"_x",x).putInt("monitor_"+mode+"_y",y).apply()}
  private fun render(){
    val r=root?:return
    val prefs=getSharedPreferences("tf_asset_native",0)
    val cfg=runCatching{JSONObject(prefs.getString("monitor_config","{}")?:"{}")}.getOrElse{JSONObject()}
    val snap=runCatching{JSONObject(prefs.getString("snapshot","{}")?:"{}")}.getOrElse{JSONObject()}
    val style=cfg.optJSONObject(if(mode=="mini")"miniStyle" else "normalStyle")?:JSONObject()
    val holdings=snap.optJSONArray("holdings");val first=if(holdings!=null&&holdings.length()>0)holdings.optJSONObject(0) else null
    val symbol=first?.optString("symbol","--")?:"--";val name=first?.optString("name","")?:"";val price=first?.optDouble("price",Double.NaN)?:Double.NaN;val pct=first?.optDouble("changePercent",Double.NaN)?:Double.NaN
    val text=color(style.optString("textColor","#FFFFFF"),Color.WHITE);val gain=color(style.optString("gainColor","#EF4444"),Color.RED);val loss=color(style.optString("lossColor","#10B981"),Color.GREEN)
    val fs=style.optDouble("fontScale",1.0).coerceIn(.7,1.8).toFloat();val vs=style.optDouble("valueFontScale",1.0).coerceIn(.7,2.0).toFloat()
    r.findViewById<TextView>(1001).apply{this.text=symbol+" "+name;setTextColor(text);textSize=12*fs}
    r.findViewById<TextView>(1002).apply{this.text=if(price.isFinite())String.format("%.2f",price) else "等待資料";setTextColor(text);textSize=20*vs}
    r.findViewById<TextView>(1003).apply{this.text=if(pct.isFinite())(if(pct>=0)"+" else "")+String.format("%.2f",pct)+"%" else "";setTextColor(if(pct>=0)gain else loss);textSize=12*fs}
    val bg=color(style.optString("backgroundColor","#0F172A"),Color.rgb(15,23,42));val a=(style.optDouble("backgroundOpacity",.92).coerceIn(.1,1.0)*255).roundToInt()
    r.setBackgroundColor(Color.argb(a,Color.red(bg),Color.green(bg),Color.blue(bg)))
  }
  private fun color(value:String,fallback:Int)=runCatching{Color.parseColor(value)}.getOrDefault(fallback)
}
