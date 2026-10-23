package com.tfasset.app

import android.app.Service
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.view.animation.TranslateAnimation
import android.widget.LinearLayout
import android.widget.LinearLayout.LayoutParams as LinearLayoutParams
import android.widget.HorizontalScrollView
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.roundToInt

class TfAssetOverlayService:Service(){
  companion object{@Volatile private var running=false;@Volatile private var active:TfAssetOverlayService?=null;fun requestRefresh(){active?.renderQueue?.request()};val isRunning:Boolean get()=running;const val ACTION_START="TF_ASSET_MONITOR_START";const val ACTION_REFRESH="TF_ASSET_MONITOR_REFRESH";const val ACTION_BACKGROUND_REFRESH="TF_ASSET_MONITOR_BACKGROUND_REFRESH"}
  private val fontFit=TfAssetMonitorAutoFitLayout()
  private val expiryHandler=Handler(Looper.getMainLooper())
  private val expiryRefresh=Runnable{if(root!=null)render()}
  private fun scheduleExpiry(){
    expiryHandler.removeCallbacks(expiryRefresh)
    val raw=runCatching{JSONObject(prefs().getString("snapshot","{}")?:"{}")}.getOrElse{JSONObject()}
    val now=System.currentTimeMillis()
    val until=TfAssetMarketPresentation.nextExpiry(raw,now)?:return
    // Short rechecks also handle wall-clock changes while the floating view is visible.
    expiryHandler.postDelayed(expiryRefresh,(until-now).coerceAtLeast(1L))
  }
  private lateinit var wm:WindowManager
  private var root:LinearLayout?=null
  private val renderHandler=Handler(Looper.getMainLooper())
  private val renderQueue=LatestSurfaceRenderQueue({renderHandler.postDelayed(it,if(TfAssetMarketOwner.uiActive)100L else 250L)}){
    if(backgroundMonitorRefreshAllowed(root!=null&&running,prefs().getBoolean("monitor_user_closed",false))){
      applyConfiguredLayoutIfChanged(readConfig());render()
    }
  }
  private fun captureFlow(reason:String,probeLagMs:Long=0L){
    val raw=TfAssetMarketFlowDiagnostics.checkpoint(reason,TfAssetMarketOwner.uiActive,TfAssetMarketOwner.widgetActive,probeLagMs)
    sendBroadcast(Intent(TfAssetMarketFlowDiagnostics.ACTION).setPackage(packageName).putExtra("payload",raw))
  }
  private var params:WindowManager.LayoutParams?=null
  private var mode="normal"
  private var lastLayoutSignature:String?=null
  private var wallHorizontal:HorizontalScrollView?=null
  private var wallScrollX=0
  private var wallScrollY=0
  private var animationsEnabled=true
  private val previousEffectValues=mutableMapOf<String,Double?>()
  private var downX=0f;private var downY=0f;private var startX=0;private var startY=0;private var lastTap=0L

  override fun onCreate(){super.onCreate();wm=getSystemService(WINDOW_SERVICE) as WindowManager}
  override fun onBind(intent:Intent?):IBinder?=null
  override fun onConfigurationChanged(newConfig:Configuration){
    super.onConfigurationChanged(newConfig)
    if(root!=null){applyConfiguredLayoutIfChanged(readConfig());render()}
  }
  override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int{
    val cfg=readConfig()
    if(intent?.action==ACTION_BACKGROUND_REFRESH&&!backgroundMonitorRefreshAllowed(root!=null&&running,prefs().getBoolean("monitor_user_closed",false))){
      if(root==null)stopSelf(startId)
      return START_NOT_STICKY
    }
    if(!cfg.optBoolean("enabled",false)){
      root?.let{runCatching{wm.removeViewImmediate(it)}};root=null
      writeRuntimeStatus(false,null)
      stopSelf()
      return START_NOT_STICKY
    }
    if(!Settings.canDrawOverlays(this)){writeRuntimeStatus(false,null);stopSelf();return START_NOT_STICKY}
    val newlyOpened=root==null
    ensureView();applyConfiguredLayoutIfChanged(cfg);render()
    running=true;active=this
    if(newlyOpened){
      // The first render runs before the overlay has been measured. Render one
      // more frame after attachment so Mini rows are visible without editing a status item.
      root?.post { if(root!=null&&running)renderQueue.request() }
      captureFlow("monitor-open")
      val due=System.currentTimeMillis()+2000L
      // One bounded diagnostic sample; never requests prices or repeats.
      renderHandler.postDelayed({captureFlow("monitor-sample",(System.currentTimeMillis()-due).coerceAtLeast(0L))},2000L)
    }
    TfAssetWidgetLiveService.ensureStarted(this)
    return START_STICKY
  }
  override fun onDestroy(){
    fontFit.clear()
    running=false;active=null;renderQueue.close()
    captureFlow("monitor-close")
    renderHandler.postDelayed({captureFlow("monitor-after-close")},1500L)
    if(!TfAssetWidgetLiveService.hasWidgets(this))stopService(Intent(this,TfAssetWidgetLiveService::class.java))
    expiryHandler.removeCallbacks(expiryRefresh)
    root?.let{runCatching{wm.removeViewImmediate(it)}};root=null
    writeRuntimeStatus(false,null)
    super.onDestroy()
  }

  private fun prefs()=getSharedPreferences("tf_asset_native",0)
  private fun readConfig()=runCatching{JSONObject(prefs().getString("monitor_config","{}")?:"{}")}.getOrElse{JSONObject()}
  private fun readSnapshot()=runCatching{TfAssetMarketPresentation.decorate(this,TfAssetMonitorQuoteLists.withSubscriptionCoverage(JSONObject(prefs().getString("snapshot","{}")?:"{}"),TfAssetMarketOwner.subscriptionLimitedSymbols()))}.getOrElse{JSONObject()}
  private fun effectiveMode(cfg:JSONObject)=prefs().getString("monitor_runtime_mode_override",null)?.let{if(it=="mini")"mini" else "normal"}?:cfg.optString("mode","normal").let{if(it=="mini")"mini" else "normal"}
  private fun activeLayout(cfg:JSONObject)=cfg.optJSONObject(if(mode=="mini")"miniLayout" else "normalLayout")?:JSONObject()

  private fun wallGeometry(cfg:JSONObject,rowCount:Int=0):TfAssetMonitorWallGeometry.Geometry {
    val layout=cfg.optJSONObject("normalLayout")?:JSONObject()
    val style=cfg.optJSONObject("normalStyle")?:JSONObject()
    val wall=cfg.optJSONObject("normalWallLayout")?:JSONObject()
    return TfAssetMonitorWallGeometry.calculate(layout.optInt("width",320),style.optInt("padding",12).coerceIn(0,32),TfAssetMonitorWallGeometry.normalizeColumns(wall.optDouble("columns",2.0)),wall.optInt("columnGap",8).coerceIn(0,32),resources.displayMetrics.widthPixels,rowCount)
  }
  private fun configuredWidth(cfg:JSONObject,configMode:String):Int =
    if(configMode=="normal"&&cfg.optString("template")=="market-wall")wallGeometry(cfg).windowWidth
    else (cfg.optJSONObject(if(configMode=="mini")"miniLayout" else "normalLayout")?:JSONObject()).optInt("width",if(configMode=="mini")360 else 320)
  private fun layoutSignatureFor(cfg:JSONObject,configMode:String):String {
    val layout=cfg.optJSONObject(if(configMode=="mini")"miniLayout" else "normalLayout")?:JSONObject()
    return configMode+"|"+layout.toString()+"|"+configuredWidth(cfg,configMode)
  }

  private fun ensureView(){
    if(root!=null)return
    val cfg=readConfig()
    mode=effectiveMode(cfg)
    val layout=activeLayout(cfg)
    val pxKey="monitor_"+mode+"_x";val pyKey="monitor_"+mode+"_y"
    val x=if(prefs().contains(pxKey))prefs().getInt(pxKey,layout.optInt("x",16)) else layout.optInt("x",16)
    val y=if(prefs().contains(pyKey))prefs().getInt(pyKey,layout.optInt("y",120)) else layout.optInt("y",120)
    params=WindowManager.LayoutParams(
      configuredWidth(cfg,mode),
      layout.optInt("height",if(mode=="mini")330 else 420),
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
      PixelFormat.TRANSLUCENT
    ).apply{gravity=Gravity.TOP or Gravity.START;this.x=x;this.y=y}
    lastLayoutSignature=layoutSignature(cfg)
    root=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setOnTouchListener(dragListener)}
    wm.addView(root,params)
  }

  private fun layoutSignature(cfg:JSONObject):String{
    return layoutSignatureFor(cfg,effectiveMode(cfg))
  }

  private fun applyConfiguredLayoutIfChanged(cfg:JSONObject){
    val nextMode=effectiveMode(cfg)
    val nextLayout=cfg.optJSONObject(if(nextMode=="mini")"miniLayout" else "normalLayout")?:JSONObject()
    val signature=layoutSignatureFor(cfg,nextMode)
    if(signature==lastLayoutSignature)return
    val retainPosition=lastLayoutSignature?.startsWith(nextMode+"|"+nextLayout.toString()+"|")==true
    mode=nextMode
    val p=params?:return
    p.width=configuredWidth(cfg,mode)
    p.height=nextLayout.optInt("height",if(mode=="mini")330 else 420)
    if(!retainPosition){p.x=nextLayout.optInt("x",16);p.y=nextLayout.optInt("y",120)}
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
    prefs().edit().putString("monitor_runtime_mode_override",mode).apply()
    val layout=activeLayout(cfg)
    val p=params?:return
    p.width=configuredWidth(cfg,mode)
    p.height=layout.optInt("height",if(mode=="mini")330 else 420)
    val pxKey="monitor_"+mode+"_x";val pyKey="monitor_"+mode+"_y"
    p.x=if(prefs().contains(pxKey))prefs().getInt(pxKey,layout.optInt("x",16)) else layout.optInt("x",16)
    p.y=if(prefs().contains(pyKey))prefs().getInt(pyKey,layout.optInt("y",120)) else layout.optInt("y",120)
    root?.let{wm.updateViewLayout(it,p)}
    lastLayoutSignature=layoutSignatureFor(cfg,mode)
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
  private fun jsonRawStrings(array:JSONArray?):List<String>{
    if(array==null)return emptyList()
    return (0 until array.length()).mapNotNull{array.optString(it,"").trim().takeIf(String::isNotEmpty)}
  }
  private fun jsonObjects(array:JSONArray?):List<JSONObject>{
    if(array==null)return emptyList()
    return (0 until array.length()).mapNotNull{array.optJSONObject(it)}
  }
  private fun objectMap(array:JSONArray?,key:String):Map<String,JSONObject> = jsonObjects(array).mapNotNull{obj->obj.optString(key,"").takeIf(String::isNotBlank)?.let{it to obj}}.toMap()

  private fun orderedHoldings(snapshot:JSONObject,cfg:JSONObject):List<JSONObject>{
    val all=TfAssetMonitorQuoteLists.select(snapshot,cfg.optString("quoteListSource","holdings"))
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
      if(key in listOf("price","changePercent","pnl","marketValue","volume","roi")){val av=a.optDouble(key,Double.NaN);val bv=b.optDouble(key,Double.NaN);if(!av.isFinite()||!bv.isFinite())return@Comparator if(av.isFinite())-1 else if(bv.isFinite())1 else 0}
      val result=when(key){
        "symbol"->a.optString("symbol","").compareTo(b.optString("symbol",""))
        "pnl","marketValue","volume","roi"->compareNumber(a.optDouble(key,Double.NaN),b.optDouble(key,Double.NaN))
        "price"->compareNumber(a.optDouble("price",Double.NaN),b.optDouble("price",Double.NaN))
        else->compareNumber(a.optDouble("changePercent",Double.NaN),b.optDouble("changePercent",Double.NaN))
      }
      result*direction
    })
    return rows
  }
  private fun withWeights(rows:List<JSONObject>,snapshot:JSONObject):List<JSONObject>{
    val canonicalTotal=(snapshot.optJSONObject("asset")?:JSONObject()).optDouble("marketValue",Double.NaN)
    val fallbackTotal=rows.sumOf{row->row.optDouble("marketValue",0.0).takeIf{it.isFinite()&&it>0}?:0.0}
    val total=if(canonicalTotal.isFinite()&&canonicalTotal>0)canonicalTotal else fallbackTotal
    return rows.map{row->
      val copy=JSONObject(row.toString())
      val marketValue=row.optDouble("marketValue",Double.NaN)
      if(total>0&&marketValue.isFinite())copy.put("weight",(marketValue/total)*100.0)
      copy
    }
  }

  private fun compareNumber(a:Double,b:Double):Int{
    val aa=if(a.isFinite())a else Double.POSITIVE_INFINITY
    val bb=if(b.isFinite())b else Double.POSITIVE_INFINITY
    return aa.compareTo(bb)
  }

  private fun render(){
    val began=System.nanoTime()
    try{renderContents()}finally{TfAssetMarketFlowDiagnostics.rendered(System.nanoTime()-began)}
  }
  private fun renderContents(){
    val r=root?:return
    scheduleExpiry()
    val cfg=readConfig()
    animationsEnabled=monitorAnimationsAllowed(
      (cfg.optJSONObject("effects")?:JSONObject()).optBoolean("animationsEnabled",true),
      TfAssetMarketOwner.uiActive,
    )
    val snap=readSnapshot()
    val style=cfg.optJSONObject(if(mode=="mini")"miniStyle" else "normalStyle")?:JSONObject()
    val aggregate=snap.optJSONObject("asset")?.optDouble("totalReturn",Double.NaN)?.takeIf{it.isFinite()}
    val resolvedStyle=JSONObject(style.toString())
    listOf("backgroundColor","textColor","secondaryTextColor","borderColor").forEach{key->resolvedStyle.put(key,TfAssetMonitorFormatting.resolved(style,key,style.optString(key,"#94A3B8"),aggregate,style))}
    fontFit.begin(style)
    wallScrollX=wallHorizontal?.scrollX?:wallScrollX
    wallHorizontal=null
    r.removeAllViews()
    val padding=style.optInt("padding",if(mode=="mini")6 else 12)
    r.setPadding(padding,padding,padding,padding)
    val bg=color(resolvedStyle.optString("backgroundColor","#0F172A"),Color.rgb(15,23,42))
    val alpha=(style.optDouble("backgroundOpacity",.92).coerceIn(.1,1.0)*255).roundToInt()
    r.setBackgroundColor(Color.argb(alpha,Color.red(bg),Color.green(bg),Color.blue(bg)))
    renderWindowControls(r,resolvedStyle,TfAssetMarketPresentation.sourceClockLabel(orderedHoldings(snap,cfg)),cfg,aggregate)
    val limitedCount=orderedHoldings(snap,cfg).count{it.optBoolean("subscriptionLimited",false)}
    if(limitedCount>0)r.addView(TextView(this).apply{
      text="$limitedCount 檔超出目前訂閱額度（保留最後行情）";textSize=11f
      setTextColor(Color.rgb(251,191,36));setPadding(4,4,4,4)
    },LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
    if(mode=="mini")renderMini(r,cfg,snap,resolvedStyle) else renderNormal(r,cfg,snap,resolvedStyle)
    applyMonitorFormat(r,style,style,aggregate,style,false)
    fontFit.schedule(r)
    val first=orderedHoldings(snap,cfg).firstOrNull()
    writeRuntimeStatus(true,first?.optString("symbol",""))
  }

  private fun renderWindowControls(root:LinearLayout,style:JSONObject,quoteClock:String,cfg:JSONObject,aggregate:Double?){
    val clock=cfg.optJSONObject(if(mode=="mini")"miniClock" else "normalClock")?:JSONObject()
    val row=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL;gravity=Gravity.END or Gravity.CENTER_VERTICAL}
    val text=color(style.optString("secondaryTextColor","#CBD5E1"),Color.LTGRAY)
    fun control(label:String,onClick:()->Unit):TextView=TextView(this).apply{
      this.text=label;setTextColor(text);textSize=10f;setPadding(12,7,12,7);setOnClickListener{onClick()}
    }
    val clockView=TextView(this).apply{
      this.text=quoteClock;setTextColor(color(TfAssetMonitorFormatting.resolved(clock,"textColor",style.optString("secondaryTextColor","#CBD5E1"),aggregate,style),text));textSize=10f*clock.optDouble("fontScale",1.0).coerceIn(.7,2.0).toFloat();gravity=gravityFor(clock.optString("align","left"))
      val py=clock.optInt("paddingY",2).coerceIn(0,16);setPadding(4,py,2,py)
      val bg=TfAssetMonitorFormatting.resolved(clock,"backgroundColor","",aggregate,style);if(bg.isNotBlank())setBackgroundColor(color(bg,Color.TRANSPARENT))
      contentDescription="行情資料更新時間 $quoteClock"
    }
    applyMonitorFormat(clockView,clock,style,aggregate,style)
    if(clock.optBoolean("visible",true))root.addView(clockView,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
    row.addView(control("↻ 更新行情"){
      prefs().edit().putLong("monitor_force_refresh_requested_at",System.currentTimeMillis()).apply()
      sendBroadcast(Intent(TfAssetNativeModule.ACTION_MARKET_REFRESH_REQUESTED).setPackage(packageName))
      render()
    })
    row.addView(control(if(mode=="mini")"□ 放大" else "— 縮小"){toggleMode()})
    row.addView(control("× 關閉"){running=false;prefs().edit().putBoolean("monitor_user_closed",true).apply();writeRuntimeStatus(false,null);stopSelf()})
    root.addView(row,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
  }

  private fun renderNormal(root:LinearLayout,cfg:JSONObject,snap:JSONObject,style:JSONObject){
    val rows=withWeights(orderedHoldings(snap,cfg),snap)
    val text=color(style.optString("textColor","#FFFFFF"),Color.WHITE)
    val secondary=color(style.optString("secondaryTextColor","#CBD5E1"),Color.LTGRAY)
    val gain=color(style.optString("gainColor","#EF4444"),Color.RED)
    val loss=color(style.optString("lossColor","#10B981"),Color.GREEN)
    val neutral=color(style.optString("neutralColor","#94A3B8"),Color.GRAY)
    val fs=style.optDouble("fontScale",1.0).coerceIn(.7,1.8).toFloat()
    val template=cfg.optString("template","portfolio")
    val selectedFields=jsonRawStrings(cfg.optJSONArray("fields")).ifEmpty{listOf("symbol","price","changePercent","pnl")}
    val itemMap=objectMap(cfg.optJSONArray("normalItems"),"field")

    fun addConfigured(container:LinearLayout,row:JSONObject,field:String,baseSize:Float=11f){
      val item=itemMap[field]?:JSONObject().put("field",field).put("label",defaultMonitorLabel(field))
      val visual=item.optJSONObject("visual")?:JSONObject()
      val numeric=miniNumeric(row,field)
      val useProfit=visual.optBoolean("useProfitColor",defaultProfitField(field))
      val customText=visual.optString("textColor","").takeIf(String::isNotBlank)?.let{color(it,text)}
      val tone=when{
        useProfit&&numeric!=null&&numeric>0->gain
        useProfit&&numeric!=null&&numeric<0->loss
        useProfit&&numeric!=null->neutral
        customText!=null->customText
        else->text
      }
      val scale=visual.optDouble("fontScale",1.0).coerceIn(.7,2.0).toFloat()
      val valueScale=if(isMonitorValueField(field))style.optDouble("valueFontScale",1.0).coerceIn(.7,2.0).toFloat() else 1f
      val view=textView(normalValue(row,field,item.optString("label",defaultMonitorLabel(field))),tone,baseSize*fs*valueScale*scale,gravityFor(visual.optString("textAlign",style.optString("textAlign","left"))))
      val bg=visual.optString("backgroundColor","")
      if(bg.isNotBlank())view.setBackgroundColor(color(bg,Color.TRANSPARENT))
      val gap=if(visual.has("lineGap")&&!visual.isNull("lineGap"))visual.optInt("lineGap",style.optInt("rowGap",6)).coerceIn(0,32) else style.optInt("rowGap",6).coerceIn(0,32)
      val py=visual.optInt("paddingY",0).coerceIn(0,16)
      view.setPadding(3,gap+py,3,py)
      applyMonitorFormat(view,visual,style,numeric,style)
      applyItemEffect(view,visual.optJSONObject("effect"),numeric,isAlert(row,cfg),"normal:${row.optString("symbol","")}:$field")
      container.addView(view,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
    }
    fun addFields(container:LinearLayout,row:JSONObject,fields:List<String>,limit:Int=fields.size,baseSize:Float=11f){
      fields.take(limit).forEach{addConfigured(container,row,it,baseSize)}
    }

    when(template){
      "compact"->{
        val first=rows.firstOrNull()
        if(first==null)root.addView(textView("等待資料",neutral,12*fs,Gravity.START)) else addFields(root,first,selectedFields,3,12f)
      }
      "quotes"->{
        if(rows.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        rows.take(4).forEach{row->
          val line=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL;gravity=Gravity.CENTER_VERTICAL}
          selectedFields.take(4).forEach{field->
            val cell=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL}
            addConfigured(cell,row,field,10f)
            line.addView(cell,LinearLayoutParams(0,android.view.ViewGroup.LayoutParams.WRAP_CONTENT,1f))
          }
          root.addView(line)
        }
      }
      "dual"->{
        if(rows.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        rows.take(2).forEach{row->val card=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL};addFields(card,row,selectedFields,4,11f);root.addView(card)}
      }
      "advanced"->{
        val first=rows.firstOrNull()
        if(first==null)root.addView(textView("等待資料",neutral,12*fs,Gravity.START)) else addFields(root,first,selectedFields,selectedFields.size,12f)
      }
      "single"->{
        val first=rows.firstOrNull()
        if(first==null)root.addView(textView("等待資料",neutral,12*fs,Gravity.START)) else addFields(root,first,selectedFields,selectedFields.size,14f)
      }
      "market-wall"->{
        val wall=cfg.optJSONObject("normalWall")?:JSONObject()
        val wallStyle=wall.optJSONObject("style")?:JSONObject()
        val wallHeader=wall.optJSONObject("header")?:JSONObject()
        val wallFields=wall.optJSONArray("fields")?:JSONArray()
        val wallLayout=cfg.optJSONObject("normalWallLayout")?:JSONObject()
        val wallColumns=TfAssetMonitorWallGeometry.normalizeColumns(wallLayout.optDouble("columns",2.0))
        val geometry=wallGeometry(cfg,rows.size)
        val wallColumnGap=wallLayout.optInt("columnGap",8).coerceIn(0,32)
        val wallRowGap=wallLayout.optInt("rowGap",8).coerceIn(0,32)
        val wallText=color(wallStyle.optString("textColor",style.optString("textColor","#FFFFFF")),text)
        val wallSecondary=color(wallStyle.optString("secondaryTextColor",style.optString("secondaryTextColor","#CBD5E1")),secondary)
        val wallGain=color(wallStyle.optString("gainColor",style.optString("gainColor","#EF4444")),gain)
        val wallLoss=color(wallStyle.optString("lossColor",style.optString("lossColor","#10B981")),loss)
        val wallBorder=color(wallStyle.optString("borderColor",style.optString("borderColor","#334155")),Color.DKGRAY)
        val wallBackground=color(wallStyle.optString("backgroundColor",style.optString("backgroundColor","#0F172A")),Color.rgb(15,23,42))
        val wallPadding=wallStyle.optInt("padding",12).coerceIn(0,32)
        val wallGap=wallStyle.optInt("rowGap",8).coerceIn(0,32)
        val wallBorderWidth=wallStyle.optInt("borderWidth",1).coerceIn(0,6)
        val wallCorner=wallStyle.optInt("cornerRadius",16).coerceIn(0,40)
        val enabled=(0 until wallFields.length()).mapNotNull{wallFields.optJSONObject(it)}.filter{it.optBoolean("enabled",true)}
        val headerFields=enabled.filter{TfAssetMonitorFields.section(it.optString("field"))=="header"}
        val quoteFields=enabled.filter{TfAssetMonitorFields.section(it.optString("field"))=="quote"}
        val footerFields=enabled.filter{TfAssetMonitorFields.section(it.optString("field"))=="detail"}
        val body=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL}
        if(rows.isEmpty())body.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        var wallLine:LinearLayout?=null
        rows.forEachIndexed{rowIndex,row->
          val rowNumeric=row.optDouble("changePercent",Double.NaN).takeIf{it.isFinite()}
          val wallStyle=resolveMonitorColors(wall.optJSONObject("style")?:JSONObject(),rowNumeric,style)
          val wallHeader=resolveMonitorColors(wall.optJSONObject("header")?:JSONObject(),rowNumeric,style)
          val wallText=color(wallStyle.optString("textColor",style.optString("textColor","#FFFFFF")),text)
          val wallSecondary=color(wallStyle.optString("secondaryTextColor",style.optString("secondaryTextColor","#CBD5E1")),secondary)
          val wallBorder=color(wallStyle.optString("borderColor",style.optString("borderColor","#334155")),Color.DKGRAY)
          val wallBackground=color(wallStyle.optString("backgroundColor",style.optString("backgroundColor","#0F172A")),Color.rgb(15,23,42))
          if(rowIndex%wallColumns==0){
            wallLine=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL;gravity=Gravity.TOP}
            body.addView(wallLine,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT).apply{bottomMargin=wallRowGap})
          }
          val card=LinearLayout(this).apply{
            orientation=LinearLayout.VERTICAL
            setPadding(wallPadding,wallPadding,wallPadding,wallPadding)
            background=GradientDrawable().apply{setColor(wallBackground);cornerRadius=wallCorner.toFloat();if(wallBorderWidth>0)setStroke(wallBorderWidth,wallBorder)}
          }

          applyMonitorFormat(card,wallStyle,style,row.optDouble("changePercent",Double.NaN).takeIf{it.isFinite()},style,false)
          if(wallHeader.optBoolean("visible",true)&&headerFields.isNotEmpty()){
            val headerBg=color(wallHeader.optString("backgroundColor",wallStyle.optString("backgroundColor","#0C121B")),wallBackground)
            val headerText=color(wallHeader.optString("textColor","#FFFFFF"),wallText)
            val headerBorder=color(wallHeader.optString("borderColor",wallStyle.optString("borderColor","#334155")),wallBorder)
            val headerBorderWidth=wallHeader.optInt("borderWidth",1).coerceIn(0,6)
            val headerScale=wallHeader.optDouble("fontScale",1.0).coerceIn(.7,1.8).toFloat()
            val headerRow=LinearLayout(this).apply{
              orientation=LinearLayout.HORIZONTAL
              gravity=Gravity.CENTER_VERTICAL
              setPadding(0,0,0,wallGap)
              background=GradientDrawable().apply{setColor(headerBg);if(headerBorderWidth>0)setStroke(headerBorderWidth,headerBorder)}
            }
            val nameWrap=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL;gravity=Gravity.CENTER_VERTICAL}
            headerFields.forEachIndexed{index,field->
              val key=field.optString("field","symbol")
              val numeric=miniNumeric(row,key)
              val useProfit=field.optBoolean("useProfitColor",false)
              val customText=field.optString("textColor","").takeIf(String::isNotBlank)?.let{color(it,headerText)}
              val tone=when{
                useProfit&&numeric!=null&&numeric>0->wallGain
                useProfit&&numeric!=null&&numeric<0->wallLoss
                useProfit&&numeric!=null->wallSecondary
                customText!=null->customText
                else->headerText
              }
              val base=if(key=="name")15f else 11f
              val view=textView(miniValue(row,key),tone,base*field.optDouble("fontScale",1.0).coerceIn(.7,2.0).toFloat()*headerScale*fs,gravityFor(field.optString("align","left")))
              val customBg=field.optString("backgroundColor","")
              if(customBg.isNotBlank())view.setBackgroundColor(color(customBg,Color.TRANSPARENT))
              val gap=if(field.has("lineGap")&&!field.isNull("lineGap"))field.optInt("lineGap",if(index==0)0 else 2).coerceIn(0,32) else if(index==0)0 else 2
              val py=field.optInt("paddingY",0).coerceIn(0,16)
              view.setPadding(3,gap+py,3,py)
              applyMonitorFormat(view,field,TfAssetMonitorFormatting.inherited(wallHeader,TfAssetMonitorFormatting.inherited(wallStyle,style)),numeric,style)
              applyItemEffect(view,field.optJSONObject("effect"),numeric,isAlert(row,cfg),"normal-wall:${row.optString("symbol","")}:header:$key")
              if(key=="name")view.ellipsize=android.text.TextUtils.TruncateAt.END
              nameWrap.addView(view,if(key=="name")LinearLayoutParams(0,android.view.ViewGroup.LayoutParams.WRAP_CONTENT,1f) else LinearLayoutParams(android.view.ViewGroup.LayoutParams.WRAP_CONTENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
            }
            headerRow.addView(nameWrap,LinearLayoutParams(0,android.view.ViewGroup.LayoutParams.WRAP_CONTENT,1f))
            headerRow.addView(textView("›",wallSecondary,22*headerScale*fs,Gravity.END))
            applyMonitorFormat(headerRow,wallHeader,style,row.optDouble("changePercent",Double.NaN).takeIf{it.isFinite()},style,false)
            applyItemEffect(headerRow,wallHeader.optJSONObject("effect"),row.optDouble("changePercent",Double.NaN).takeIf{it.isFinite()},isAlert(row,cfg),"normal-wall:${row.optString("symbol","")}:header")
            card.addView(headerRow,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
          }

          if(quoteFields.isNotEmpty()){
            val quoteRow=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL;gravity=Gravity.BOTTOM;setPadding(0,wallGap,0,0)}
            val primary=quoteFields.first()
            val primaryKey=primary.optString("field","price")
            val primaryNumeric=miniNumeric(row,primaryKey)
            val primaryUseProfit=primary.optBoolean("useProfitColor",false)
            val primaryCustomText=primary.optString("textColor","").takeIf(String::isNotBlank)?.let{color(it,wallText)}
            val primaryTone=when{
              primaryUseProfit&&primaryNumeric!=null&&primaryNumeric>0->wallGain
              primaryUseProfit&&primaryNumeric!=null&&primaryNumeric<0->wallLoss
              primaryUseProfit&&primaryNumeric!=null->wallSecondary
              primaryCustomText!=null->primaryCustomText
              else->wallText
            }
            val primaryBase=36f
            val primaryView=textView(miniValue(row,primaryKey),primaryTone,primaryBase*primary.optDouble("fontScale",1.0).coerceIn(.7,2.0).toFloat()*fs,gravityFor(primary.optString("align","left")))
            val primaryBg=primary.optString("backgroundColor","")
            if(primaryBg.isNotBlank())primaryView.setBackgroundColor(color(primaryBg,Color.TRANSPARENT))
            val primaryGap=if(primary.has("lineGap")&&!primary.isNull("lineGap"))primary.optInt("lineGap",0).coerceIn(0,32) else 0
            val primaryPy=primary.optInt("paddingY",0).coerceIn(0,16)
            primaryView.setPadding(3,primaryGap+primaryPy,3,primaryPy)
            applyMonitorFormat(primaryView,primary,TfAssetMonitorFormatting.inherited(wallStyle,style),primaryNumeric,style)
            applyItemEffect(primaryView,primary.optJSONObject("effect"),primaryNumeric,isAlert(row,cfg),"normal-wall:${row.optString("symbol","")}:quote:$primaryKey")
            quoteRow.addView(primaryView,LinearLayoutParams(0,android.view.ViewGroup.LayoutParams.WRAP_CONTENT,1f))
            if(quoteFields.size>1){
              val changeWrap=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;gravity=Gravity.END}
              quoteFields.drop(1).forEach{field->
                val key=field.optString("field","change")
                val numeric=miniNumeric(row,key)
                val useProfit=field.optBoolean("useProfitColor",false)
                val customText=field.optString("textColor","").takeIf(String::isNotBlank)?.let{color(it,wallText)}
                val tone=when{
                  useProfit&&numeric!=null&&numeric>0->wallGain
                  useProfit&&numeric!=null&&numeric<0->wallLoss
                  useProfit&&numeric!=null->wallSecondary
                  customText!=null->customText
                  else->wallText
                }
                val view=textView(miniValue(row,key),tone,11*field.optDouble("fontScale",1.0).coerceIn(.7,2.0).toFloat()*fs,gravityFor(field.optString("align","right")))
                val customBg=field.optString("backgroundColor","")
                if(customBg.isNotBlank())view.setBackgroundColor(color(customBg,Color.TRANSPARENT))
                val gap=if(field.has("lineGap")&&!field.isNull("lineGap"))field.optInt("lineGap",wallGap).coerceIn(0,32) else wallGap
                val py=field.optInt("paddingY",0).coerceIn(0,16)
                view.setPadding(3,gap+py,3,py)
                applyMonitorFormat(view,field,TfAssetMonitorFormatting.inherited(wallStyle,style),numeric,style)
                applyItemEffect(view,field.optJSONObject("effect"),numeric,isAlert(row,cfg),"normal-wall:${row.optString("symbol","")}:quote:$key")
                changeWrap.addView(view)
              }
              quoteRow.addView(changeWrap)
            }
            card.addView(quoteRow,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
          }

          if(footerFields.isNotEmpty()){
            footerFields.chunked(3).forEach{detailRow->
            val footer=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL;gravity=Gravity.BOTTOM;setPadding(0,wallGap,0,0)}
            detailRow.forEachIndexed{index,field->
              val key=field.optString("field","pnl")
              val numeric=miniNumeric(row,key)
              val useProfit=field.optBoolean("useProfitColor",false)
              val customText=field.optString("textColor","").takeIf(String::isNotBlank)?.let{color(it,wallText)}
              val tone=when{
                useProfit&&numeric!=null&&numeric>0->wallGain
                useProfit&&numeric!=null&&numeric<0->wallLoss
                useProfit&&numeric!=null->wallSecondary
                customText!=null->customText
                else->wallText
              }
              val fieldGravity=gravityFor(field.optString("align",if(index==0)"left" else "right"))
              val cell=LinearLayout(this).apply{
                orientation=LinearLayout.VERTICAL
                gravity=fieldGravity
              }
              val customBg=field.optString("backgroundColor","")
              if(customBg.isNotBlank())cell.setBackgroundColor(color(customBg,Color.TRANSPARENT))
              val gap=if(field.has("lineGap")&&!field.isNull("lineGap"))field.optInt("lineGap",0).coerceIn(0,32) else 0
              val py=field.optInt("paddingY",0).coerceIn(0,16)
              cell.setPadding(0,gap+py,0,py)
              cell.addView(textView(field.optString("label",key),wallSecondary,10*fs,fieldGravity).also{applyMonitorFormat(it,JSONObject().put("format",JSONObject(wallStyle.optJSONObject("format")?.toString()?:"{}").apply{remove("profitColors")}),style,null,style)})
              val valueView=textView(miniValue(row,key),tone,12*field.optDouble("fontScale",1.0).coerceIn(.7,2.0).toFloat()*fs,fieldGravity)
              applyMonitorFormat(cell,field,wallStyle,numeric,style,false)
              applyMonitorFormat(valueView,field,TfAssetMonitorFormatting.inherited(wallStyle,style),numeric,style)
              applyItemEffect(valueView,field.optJSONObject("effect"),numeric,isAlert(row,cfg),"normal-wall:${row.optString("symbol","")}:footer:$key")
              cell.addView(valueView)
              footer.addView(cell,LinearLayoutParams(0,android.view.ViewGroup.LayoutParams.WRAP_CONTENT,1f))
            }
            card.addView(footer,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
            }
          }

          wallLine?.addView(card,LinearLayoutParams(geometry.cardWidth,android.view.ViewGroup.LayoutParams.WRAP_CONTENT).apply{if((rowIndex%wallColumns)<wallColumns-1&&rowIndex<rows.lastIndex)rightMargin=wallColumnGap})

        }
        // Only real cards are allocated. Large user counts never create placeholder Views.
        val horizontal=HorizontalScrollView(this).apply{isFillViewport=false;addView(body,android.widget.FrameLayout.LayoutParams(geometry.contentWidth,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))}
        val scroller=ScrollView(this).apply{isFillViewport=true;addView(horizontal)}
        wallHorizontal=horizontal
        val restoreX=wallScrollX;val restoreY=wallScrollY
        scroller.setOnScrollChangeListener{_,_,y,_,_->wallScrollY=y}
        horizontal.post{if(wallHorizontal===horizontal){horizontal.scrollTo(restoreX,0);scroller.scrollTo(0,restoreY)}}
        root.addView(scroller,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,0,1f))
      }
      "heatmap"->{
        if(rows.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        rows.forEach{row->val card=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL};addFields(card,row,selectedFields,4,11f);root.addView(card)}
      }
      "pnl-wall"->{
        val sorted=rows.sortedByDescending{it.optDouble("pnl",Double.NEGATIVE_INFINITY)}
        if(sorted.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        sorted.forEach{row->val card=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL};addFields(card,row,selectedFields,4,11f);root.addView(card)}
      }
      "weight-wall"->{
        val sorted=rows.sortedByDescending{it.optDouble("marketValue",0.0)}
        val weightFields=if(selectedFields.contains("weight"))selectedFields else listOf("weight")+selectedFields
        if(sorted.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        sorted.forEach{row->val card=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL};addFields(card,row,weightFields,4,11f);root.addView(card)}
      }
      "ticker"->{
        if(rows.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        rows.forEach{row->val line=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL};selectedFields.take(4).forEach{field->val cell=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL};addConfigured(cell,row,field,10f);line.addView(cell,LinearLayoutParams(0,android.view.ViewGroup.LayoutParams.WRAP_CONTENT,1f))};root.addView(line)}
      }
      "terminal"->{
        if(rows.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        rows.forEach{row->val card=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL};addFields(card,row,selectedFields,4,10f);root.addView(card)}
      }
      else->{
        val asset=snap.optJSONObject("asset")?:JSONObject()
        root.addView(textView("TF Asset  總資產 "+integer(asset,"totalAssets"),text,12*fs,Gravity.START))
        val first=rows.firstOrNull()
        if(first==null)root.addView(textView("等待資料",neutral,12*fs,Gravity.START)) else addFields(root,first,selectedFields,selectedFields.size,12f)
      }
    }
  }

  private fun renderMini(root:LinearLayout,cfg:JSONObject,snap:JSONObject,style:JSONObject){
    if(cfg.optBoolean("showBreathingLight",true)){
      val lamp=textView("●",color(style.optString("gainColor","#10B981"),Color.GREEN),12f,Gravity.START)
      if(animationsEnabled){
        lamp.startAnimation(AlphaAnimation(.28f,1f).apply{duration=900;repeatMode=Animation.REVERSE;repeatCount=Animation.INFINITE})
      }
      root.addView(lamp)
    }
    val columnsJson=cfg.optJSONArray("miniColumns")
    val columns=(0 until (columnsJson?.length()?:0)).mapNotNull{columnsJson?.optJSONObject(it)}.filter{it.optBoolean("enabled",true)}
    val header=cfg.optJSONObject("miniHeader")?:JSONObject()
    if(header.optBoolean("visible",true)&&columns.isNotEmpty()){
      val headerRow=LinearLayout(this).apply{
        orientation=LinearLayout.HORIZONTAL;gravity=Gravity.CENTER_VERTICAL;minimumHeight=header.optInt("height",30)
        val headerBg=color(header.optString("backgroundColor","#111827"),Color.rgb(17,24,39))
        val headerAlpha=(header.optDouble("backgroundOpacity",.96).coerceIn(.1,1.0)*255).roundToInt()
        setBackgroundColor(Color.argb(headerAlpha,Color.red(headerBg),Color.green(headerBg),Color.blue(headerBg)))
      }
      val headerText=color(header.optString("textColor","#CBD5E1"),Color.LTGRAY)
      val headerScale=header.optDouble("fontScale",.9).coerceIn(.7,1.6).toFloat()
      columns.forEach{column->headerRow.addView(textView(column.optString("label",column.optString("field","")),headerText,11*headerScale,gravityFor(column.optString("align","left"))).also{applyMonitorFormat(it,header,style,snap.optJSONObject("asset")?.optDouble("totalReturn",Double.NaN)?.takeIf{n->n.isFinite()},style)},weighted(column.optDouble("widthPercent",20.0).toFloat()))}
      applyMonitorFormat(headerRow,header,style,snap.optJSONObject("asset")?.optDouble("totalReturn",Double.NaN)?.takeIf{it.isFinite()},style,false)
      applyItemEffect(headerRow,header.optJSONObject("effect"),null,false,"mini:header")
      root.addView(headerRow)
    }

    val rows=withWeights(orderedHoldings(snap,cfg),snap)
    val text=color(style.optString("textColor","#FFFFFF"),Color.WHITE)
    val gain=color(style.optString("gainColor","#EF4444"),Color.RED)
    val loss=color(style.optString("lossColor","#10B981"),Color.GREEN)
    val neutral=color(style.optString("neutralColor","#94A3B8"),Color.GRAY)
    val baseScale=style.optDouble("fontScale",.9).coerceIn(.7,1.8).toFloat()
    val body=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL}
    rows.forEach{holding->
      val row=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL;gravity=Gravity.CENTER_VERTICAL;minimumHeight=28}
      columns.forEach{column->
        val field=column.optString("field","symbol")
        val valueText=miniValue(holding,field)
        val numeric=miniNumeric(holding,field)
        val useProfit=column.optBoolean("useProfitColor",false)
        val customText=column.optString("textColor","").takeIf(String::isNotBlank)?.let{color(it,text)}
        val tone=when{useProfit&&numeric!=null&&numeric>0->gain;useProfit&&numeric!=null&&numeric<0->loss;useProfit&&numeric!=null->neutral;customText!=null->customText;else->text}
        val scale=(baseScale*column.optDouble("fontScale",1.0).coerceIn(.7,2.0)).toFloat()
        val view=textView(valueText,tone,11*scale,gravityFor(column.optString("align","left")))
        val bg=column.optString("backgroundColor","");if(bg.isNotBlank())view.setBackgroundColor(color(bg,Color.TRANSPARENT))
        val gap=if(column.has("lineGap")&&!column.isNull("lineGap"))column.optInt("lineGap",style.optInt("rowGap",2)).coerceIn(0,32) else style.optInt("rowGap",2).coerceIn(0,32)
        val py=column.optInt("paddingY",0).coerceIn(0,16);view.setPadding(3,gap+py,3,py)
        applyMonitorFormat(view,column,style,numeric,style)
        applyItemEffect(view,column.optJSONObject("effect"),numeric,isAlert(holding,cfg),"mini:${holding.optString("symbol","")}:$field")
        row.addView(view,weighted(column.optDouble("widthPercent",20.0).toFloat()))
      }
      body.addView(row)
    }
    if(rows.isEmpty())body.addView(textView("尚無持股資料",neutral,11*baseScale,Gravity.START))
    val scroller=ScrollView(this).apply{isFillViewport=true;addView(body)}
    root.addView(scroller,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,0,1f))

    val asset=snap.optJSONObject("asset")?:JSONObject()
    val statusBar=resolveMonitorColors(cfg.optJSONObject("miniStatusBar")?:JSONObject(),asset.optDouble("totalReturn",Double.NaN).takeIf{it.isFinite()},style)
    val statusItemsJson=cfg.optJSONArray("miniStatusItems")
    val statusItems=if(statusItemsJson==null||statusItemsJson.length()==0){
      listOf(
        JSONObject().put("field","totalAssets").put("label","總資產").put("enabled",true).put("useProfitColor",false),
        JSONObject().put("field","marketValue").put("label","市值").put("enabled",true).put("useProfitColor",false),
        JSONObject().put("field","totalReturn").put("label","總損益").put("enabled",true).put("useProfitColor",true)
      )
    }else (0 until statusItemsJson.length()).mapNotNull{statusItemsJson.optJSONObject(it)}.filter{it.optBoolean("enabled",true)&&!(it.optString("field")=="updatedAt"&&(cfg.optJSONObject("miniClock")?:JSONObject()).optBoolean("visible",true))}
    if(statusBar.optBoolean("visible",true)&&statusItems.isNotEmpty()){
      val statusBg=color(statusBar.optString("backgroundColor","#111827"),Color.rgb(17,24,39))
      val statusAlpha=(statusBar.optDouble("backgroundOpacity",.96).coerceIn(.1,1.0)*255).roundToInt()
      val statusText=color(statusBar.optString("textColor","#CBD5E1"),Color.LTGRAY)
      val statusScale=statusBar.optDouble("fontScale",.85).coerceIn(.7,1.6).toFloat()
      val statusBorder=color(statusBar.optString("borderColor","#334155"),Color.DKGRAY)
      val statusBorderWidth=statusBar.optInt("borderWidth",1).coerceIn(0,4)
      val statusColumns=statusBar.optInt("columns",3).coerceIn(1,4)
      val statusWrap=LinearLayout(this).apply{
        orientation=LinearLayout.VERTICAL;minimumHeight=statusBar.optInt("height",36).coerceIn(24,96)
        setBackgroundColor(Color.argb(statusAlpha,Color.red(statusBg),Color.green(statusBg),Color.blue(statusBg)))
        if(statusBorderWidth>0)setPadding(0,statusBorderWidth,0,0)
      }
      statusItems.chunked(statusColumns).forEach{items->
        val statusRow=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL;gravity=Gravity.CENTER_VERTICAL}
        items.forEach{item->
          val field=item.optString("field","totalAssets")
          val label=item.optString("label",field)
          val numeric=when(field){"totalReturn"->asset.optDouble("totalReturn",Double.NaN);"unrealizedPnl"->asset.optDouble("unrealizedPnl",Double.NaN);"realizedPnl"->asset.optDouble("realizedPnl",Double.NaN);else->asset.optDouble("totalReturn",Double.NaN)}
          val useProfit=item.optBoolean("useProfitColor",false)
          val customText=item.optString("textColor","").takeIf(String::isNotBlank)?.let{color(it,statusText)}
          val tone=when{useProfit&&numeric.isFinite()&&numeric>0->gain;useProfit&&numeric.isFinite()&&numeric<0->loss;useProfit&&numeric.isFinite()->neutral;customText!=null->customText;else->statusText}
          val valueText=when(field){
            "holdingCount"->rows.size.toString()
            "updatedAt"->TfAssetMarketPresentation.sourceClockLabel(rows)
            "totalReturn"->signedInteger(asset,"totalReturn")
            "unrealizedPnl"->signedInteger(asset,"unrealizedPnl")
            "realizedPnl"->signedInteger(asset,"realizedPnl")
            "totalAssets"->integer(asset,"totalAssets")
            "marketValue"->integer(asset,"marketValue")
            "cash"->if(asset.optBoolean("cashConfigured",true)) integer(asset,"cash") else "未設定"
            "dividendIncome"->integer(asset,"dividendIncome")
            else->"--"
          }
          val view=textView("$label $valueText",tone,9*statusScale*item.optDouble("fontScale",1.0).coerceIn(.7,2.0).toFloat(),gravityFor(item.optString("align","center")))
          val bg=item.optString("backgroundColor","");if(bg.isNotBlank())view.setBackgroundColor(color(bg,Color.TRANSPARENT))
          val gap=if(item.has("lineGap")&&!item.isNull("lineGap"))item.optInt("lineGap",0).coerceIn(0,32) else 0
          val py=item.optInt("paddingY",0).coerceIn(0,16);view.setPadding(3,gap+py,3,py)
          applyMonitorFormat(view,item,TfAssetMonitorFormatting.inherited(statusBar,style),numeric.takeIf{it.isFinite()},style)
          applyItemEffect(view,item.optJSONObject("effect"),numeric.takeIf{it.isFinite()},false,"mini:status:$field")
          statusRow.addView(view,weighted(1f))
        }
        repeat((statusColumns-items.size).coerceAtLeast(0)){statusRow.addView(View(this),weighted(1f))}
        statusWrap.addView(statusRow,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
      }
      if(statusBorderWidth>0)statusWrap.background=GradientDrawable().apply{setColor(Color.argb(statusAlpha,Color.red(statusBg),Color.green(statusBg),Color.blue(statusBg)));setStroke(statusBorderWidth,statusBorder)}
      applyMonitorFormat(statusWrap,statusBar,style,asset.optDouble("totalReturn",Double.NaN).takeIf{it.isFinite()},style,false)
      root.addView(statusWrap,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
    }
  }

  private fun resolveMonitorColors(target:JSONObject,numeric:Double?,palette:JSONObject):JSONObject=JSONObject(target.toString()).apply{
    listOf("backgroundColor","textColor","secondaryTextColor","borderColor").forEach{key->if(TfAssetMonitorFormatting.bound(target,key))put(key,TfAssetMonitorFormatting.tone(numeric,palette))}
  }

  private fun applyMonitorFormat(view:View,target:JSONObject,base:JSONObject,numeric:Double?,palette:JSONObject,decorateText:Boolean=true){
    val linkedBg=TfAssetMonitorFormatting.bound(target,"backgroundColor")
    val linkedBorder=TfAssetMonitorFormatting.bound(target,"borderColor")
    if(linkedBg||linkedBorder){
      val bg=color(TfAssetMonitorFormatting.resolved(target,"backgroundColor","#000000",numeric,palette),Color.TRANSPARENT)
      val border=color(TfAssetMonitorFormatting.resolved(target,"borderColor","#334155",numeric,palette),Color.DKGRAY)
      val width=target.optInt("borderWidth",1).coerceIn(0,6)
      val alpha=(target.optDouble("backgroundOpacity",1.0).coerceIn(.1,1.0)*255).roundToInt()
      view.background=GradientDrawable().apply{setColor(if(linkedBg||target.optString("backgroundColor","").startsWith("#"))Color.argb(alpha,Color.red(bg),Color.green(bg),Color.blue(bg)) else Color.TRANSPARENT);cornerRadius=target.optDouble("cornerRadius",0.0).toFloat();if(width>0&&(linkedBorder||target.has("borderColor")))setStroke(width,border)}
    }
    if(view is TextView&&decorateText){
      if(TfAssetMonitorFormatting.bound(target,"textColor"))view.setTextColor(color(TfAssetMonitorFormatting.tone(numeric,palette),Color.GRAY))
      TfAssetMonitorFormatting.weight(target,base)?.let{weight->view.typeface=if(android.os.Build.VERSION.SDK_INT>=28)android.graphics.Typeface.create(view.typeface,weight,false) else android.graphics.Typeface.create(view.typeface,if(weight>=600)android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)}
      TfAssetMonitorFormatting.lineHeight(target,base)?.let{multiplier->val height=(view.textSize*multiplier).roundToInt();if(android.os.Build.VERSION.SDK_INT>=28)view.setLineHeight(height);view.minimumHeight=height+view.paddingTop+view.paddingBottom}
      fontFit.register(view,TfAssetMonitorFormatting.lineHeight(target,base)?:1.2f)
    }
  }

  private fun applyItemEffect(view:View,effect:JSONObject?,numeric:Double?,alert:Boolean,key:String){
    view.clearAnimation()
    if(effect==null)return
    val trigger=effect.optString("trigger","change")
    val hadPrevious=previousEffectValues.containsKey(key)
    val previous=previousEffectValues[key]
    previousEffectValues[key]=numeric
    val changed=hadPrevious&&when{
      previous==null&&numeric==null->false
      previous==null||numeric==null->true
      else->abs(previous-numeric)>1e-9
    }
    if(!animationsEnabled)return
    val kind=effect.optString("kind","none")
    if(kind=="none")return
    val active=when(trigger){"gain"->numeric!=null&&numeric>0;"loss"->numeric!=null&&numeric<0;"alert"->alert;"change"->changed;else->true}
    if(!active)return
    val speed=effect.optString("speed","normal")
    val duration=when(speed){"slow"->1200L;"fast"->360L;else->700L}
    val intensity=effect.optString("intensity","medium")
    val alpha=when(intensity){"soft"->.72f;"strong"->.20f;else->.45f}
    val repeat=trigger=="always"
    when(kind){
      "fade"->view.startAnimation(AlphaAnimation(alpha,1f).apply{this.duration=duration;repeatCount=0})
      "pulse","flash-on-change"->view.startAnimation(AlphaAnimation(alpha,1f).apply{this.duration=duration;repeatMode=Animation.REVERSE;repeatCount=if(repeat)Animation.INFINITE else 1})
      "bounce"->{
        val distance=when(intensity){"soft"->3f;"strong"->10f;else->6f}
        view.startAnimation(TranslateAnimation(0f,0f,0f,-distance).apply{this.duration=duration/2;repeatMode=Animation.REVERSE;repeatCount=if(repeat)Animation.INFINITE else 1})
      }
    }
  }

  private fun isAlert(row:JSONObject,cfg:JSONObject):Boolean{
    val threshold=cfg.optDouble("alertChangePct",Double.NaN)
    val pct=row.optDouble("changePercent",Double.NaN)
    return threshold.isFinite()&&pct.isFinite()&&abs(pct)>=threshold
  }
  private fun isMonitorValueField(field:String)=field!="symbol"&&field!="name"&&field!="marketStatus"&&field!="updatedAt"
  private fun defaultProfitField(field:String)=field=="change"||field=="changePercent"||field=="pnl"||field=="roi"||field=="comprehensivePnl"
  private fun defaultMonitorLabel(field:String)=when(field){"symbol"->"代號";"name"->"名稱";"price"->"價格";"change"->"漲跌";"changePercent"->"漲跌%";"shares"->"股數";"avgCost"->"成本均";"marketValue"->"市值";"weight"->"權重";"pnl"->"損益";"roi"->"報酬%";"comprehensivePnl"->"含息損益";"marketStatus"->"市場狀態";"updatedAt"->"更新時間";else->field}
  private fun normalValue(row:JSONObject,field:String,label:String):String{TfAssetMonitorFields.value(row,field)?.let{return "$label $it"};return when(field){
    "symbol"->row.optString("symbol","--")
    "name"->row.optString("name","")
    "price"->"$label "+number2(row,"price")
    "change"->"$label "+signed2(row,"change")
    "changePercent"->"$label "+signed2(row,"changePercent")+"%"
    "shares"->"$label "+integer(row,"shares")
    "avgCost"->"$label "+number2(row,"avgCost")
    "marketValue"->"$label "+integer(row,"marketValue")
    "weight"->"$label "+number2(row,"weight")+"%"
    "pnl"->"$label "+signedInteger(row,"pnl")
    "roi"->"$label "+signed2(row,"roi")+"%"
    "comprehensivePnl"->"$label "+signedInteger(row,"comprehensivePnl")
    "marketStatus"->"$label "+row.optString("marketStatus","--")
    "updatedAt"->"$label "+TfAssetMarketPresentation.sourceTimeLabel(row.optString("updatedAt",""))
    else->"--"
  }}

  private fun weighted(weight:Float)=LinearLayoutParams(0,android.view.ViewGroup.LayoutParams.WRAP_CONTENT,weight.coerceAtLeast(1f))
  private fun textView(value:String,tone:Int,size:Float,gravity:Int)=TextView(this).apply{text=value;setTextColor(tone);textSize=size;this.gravity=gravity;maxLines=1;setPadding(3,2,3,2)}
  private fun gravityFor(value:String)=when(value){"center"->Gravity.CENTER;"right"->Gravity.END;else->Gravity.START}
  private fun miniNumeric(row:JSONObject,field:String):Double?=when(field){"price"->row.optDouble("change",Double.NaN);"change"->row.optDouble("change",Double.NaN);"changePercent"->row.optDouble("changePercent",Double.NaN);"pnl"->row.optDouble("pnl",Double.NaN);"roi"->row.optDouble("roi",Double.NaN);"comprehensivePnl"->row.optDouble("comprehensivePnl",Double.NaN);"marketValue"->row.optDouble("marketValue",Double.NaN);"weight"->row.optDouble("weight",Double.NaN);else->row.optDouble("changePercent",Double.NaN)}.takeIf{it.isFinite()}
  private fun miniValue(row:JSONObject,field:String):String=TfAssetMonitorFields.value(row,field)?:when(field){"symbol"->row.optString("symbol","--");"name"->row.optString("name","");"price"->number2(row,"price");"change"->signed2(row,"change");"changePercent"->signed2(row,"changePercent")+"%";"shares"->integer(row,"shares");"avgCost"->number2(row,"avgCost");"marketValue"->integer(row,"marketValue");"weight"->number2(row,"weight")+"%";"pnl"->signedInteger(row,"pnl");"roi"->signed2(row,"roi")+"%";"comprehensivePnl"->signedInteger(row,"comprehensivePnl");"marketStatus"->row.optString("marketStatus","--");"updatedAt"->TfAssetMarketPresentation.sourceTimeLabel(row.optString("updatedAt",""));else->"--"}
  private fun number2(row:JSONObject?,key:String):String{val v=row?.optDouble(key,Double.NaN)?:Double.NaN;return if(v.isFinite())String.format("%.2f",v) else "--"}
  private fun signed2(row:JSONObject,key:String):String{val v=row.optDouble(key,Double.NaN);return if(v.isFinite())(if(v>=0)"+" else "")+String.format("%.2f",v) else "--"}
  private fun integer(row:JSONObject,key:String):String{val v=row.optDouble(key,Double.NaN);return if(v.isFinite())String.format("%,.0f",v) else "--"}
  private fun signedInteger(row:JSONObject,key:String):String{val v=row.optDouble(key,Double.NaN);return if(v.isFinite())(if(v>=0)"+" else "")+String.format("%,.0f",v) else "--"}
  private fun writeRuntimeStatus(running:Boolean,symbol:String?){
    val p=params
    prefs().edit().putBoolean("monitor_running",running).putString("monitor_runtime_mode",mode).putInt("monitor_runtime_x",p?.x?:0).putInt("monitor_runtime_y",p?.y?:0).putInt("monitor_runtime_width",p?.width?:0).putInt("monitor_runtime_height",p?.height?:0).putLong("monitor_last_sync_at",System.currentTimeMillis()).putString("monitor_display_symbol",symbol?:"").apply()
  }
  private fun color(value:String,fallback:Int)=runCatching{Color.parseColor(value)}.getOrDefault(fallback)
}
