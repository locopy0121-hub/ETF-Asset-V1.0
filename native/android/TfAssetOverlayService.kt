package com.tfasset.app

import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.widget.LinearLayout
import android.widget.LinearLayout.LayoutParams as LinearLayoutParams
import android.widget.ScrollView
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
    val cfg=readConfig()
    if(!cfg.optBoolean("enabled",false)){
      root?.let{runCatching{wm.removeViewImmediate(it)}};root=null
      writeRuntimeStatus(false,null)
      stopSelf()
      return START_NOT_STICKY
    }
    if(!Settings.canDrawOverlays(this)){writeRuntimeStatus(false,null);stopSelf();return START_NOT_STICKY}
    ensureView();render();return START_STICKY
  }
  override fun onDestroy(){
    root?.let{runCatching{wm.removeViewImmediate(it)}};root=null
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
    if(mode=="mini"){
      renderMini(r,cfg,snap,style)
    }else renderNormal(r,cfg,snap,style)
    val first=orderedHoldings(snap,cfg).firstOrNull()
    writeRuntimeStatus(true,first?.optString("symbol",""))
  }

  private fun renderNormal(root:LinearLayout,cfg:JSONObject,snap:JSONObject,style:JSONObject){
    val rows=orderedHoldings(snap,cfg)
    val first=rows.firstOrNull()
    val text=color(style.optString("textColor","#FFFFFF"),Color.WHITE)
    val secondary=color(style.optString("secondaryTextColor","#CBD5E1"),Color.LTGRAY)
    val gain=color(style.optString("gainColor","#EF4444"),Color.RED)
    val loss=color(style.optString("lossColor","#10B981"),Color.GREEN)
    val neutral=color(style.optString("neutralColor","#94A3B8"),Color.GRAY)
    val fs=style.optDouble("fontScale",1.0).coerceIn(.7,1.8).toFloat()
    val vs=style.optDouble("valueFontScale",1.0).coerceIn(.7,2.0).toFloat()
    val template=cfg.optString("template","portfolio")

    fun tone(row:JSONObject):Int{
      val pct=row.optDouble("changePercent",Double.NaN)
      return if(!pct.isFinite())neutral else if(pct>0)gain else if(pct<0)loss else neutral
    }
    fun quoteLine(row:JSONObject):String{
      val symbol=row.optString("symbol","--")
      val price=number2(row,"price")
      val pct=signed2(row,"changePercent")+"%"
      return "$symbol  $price  $pct"
    }

    when(template){
      "compact"->{
        root.addView(textView(first?.let{quoteLine(it)}?:"等待資料",first?.let{tone(it)}?:neutral,13*fs,Gravity.START))
      }
      "quotes"->{
        if(rows.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        rows.take(4).forEach{row->root.addView(textView(quoteLine(row),tone(row),12*fs,Gravity.START))}
      }
      "dual"->{
        if(rows.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        rows.take(2).forEach{row->
          root.addView(textView(row.optString("symbol","--")+" "+row.optString("name",""),text,12*fs,Gravity.START))
          root.addView(textView(number2(row,"price")+"  "+signed2(row,"changePercent")+"%",tone(row),14*fs,Gravity.START))
        }
      }
      "advanced"->{
        if(first==null){root.addView(textView("等待資料",neutral,12*fs,Gravity.START))}
        else{
          root.addView(textView(first.optString("symbol","--")+" "+first.optString("name",""),text,12*fs,Gravity.START))
          root.addView(textView("價格 "+number2(first,"price")+"  "+signed2(first,"changePercent")+"%",tone(first),17*vs,Gravity.START))
          root.addView(textView("市值 "+integer(first,"marketValue"),secondary,11*fs,Gravity.START))
          val pnl=first.optDouble("pnl",Double.NaN)
          root.addView(textView("損益 "+signedInteger(first,"pnl")+"  報酬 "+signed2(first,"roi")+"%",if(!pnl.isFinite())neutral else if(pnl>0)gain else if(pnl<0)loss else neutral,11*fs,Gravity.START))
          root.addView(textView("含息 "+signedInteger(first,"comprehensivePnl"),secondary,11*fs,Gravity.START))
        }
      }
      "single"->{
        if(first==null){root.addView(textView("等待資料",neutral,12*fs,Gravity.START))}
        else{
          root.addView(textView(first.optString("symbol","--")+" "+first.optString("name",""),text,13*fs,Gravity.START))
          root.addView(textView(number2(first,"price"),text,24*vs,Gravity.START))
          root.addView(textView(signed2(first,"changePercent")+"%",tone(first),14*fs,Gravity.START))
        }
      }
      "market-wall"->{
        val wall=cfg.optJSONObject("normalWall")?:JSONObject()
        val wallStyle=wall.optJSONObject("style")?:JSONObject()
        val wallHeader=wall.optJSONObject("header")?:JSONObject()
        val wallFields=wall.optJSONArray("fields")?:JSONArray()
        val wallText=color(wallStyle.optString("textColor",style.optString("textColor","#FFFFFF")),text)
        val wallSecondary=color(wallStyle.optString("secondaryTextColor",style.optString("secondaryTextColor","#CBD5E1")),secondary)
        val wallGain=color(wallStyle.optString("gainColor",style.optString("gainColor","#EF4444")),gain)
        val wallLoss=color(wallStyle.optString("lossColor",style.optString("lossColor","#10B981")),loss)
        val wallBorder=color(wallStyle.optString("borderColor",style.optString("borderColor","#334155")),Color.DKGRAY)
        val wallBackground=color(wallStyle.optString("backgroundColor",style.optString("backgroundColor","#0F172A")),Color.rgb(15,23,42))
        val wallPadding=wallStyle.optInt("padding",12).coerceIn(0,32)
        val wallGap=wallStyle.optInt("rowGap",8).coerceIn(0,24)
        val wallBorderWidth=wallStyle.optInt("borderWidth",1).coerceIn(0,6)
        val wallCorner=wallStyle.optInt("cornerRadius",16).coerceIn(0,40)
        val enabled=(0 until wallFields.length()).mapNotNull{wallFields.optJSONObject(it)}.filter{it.optBoolean("enabled",true)}
        val headerFields=enabled.filter{it.optString("field")=="name"||it.optString("field")=="symbol"}
        val quoteFields=enabled.filter{it.optString("field")=="price"||it.optString("field")=="change"||it.optString("field")=="changePercent"}
        val footerFields=enabled.filter{it.optString("field")=="pnl"||it.optString("field")=="roi"||it.optString("field")=="marketValue"}
        val body=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL}
        if(rows.isEmpty())body.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        rows.forEach{row->
          val card=LinearLayout(this).apply{
            orientation=LinearLayout.VERTICAL
            setPadding(wallPadding,wallPadding,wallPadding,wallPadding)
            background=GradientDrawable().apply{
              setColor(wallBackground)
              cornerRadius=wallCorner.toFloat()
              if(wallBorderWidth>0)setStroke(wallBorderWidth,wallBorder)
            }
          }

          if(wallHeader.optBoolean("visible",true)&&headerFields.isNotEmpty()){
            val headerRow=LinearLayout(this).apply{
              orientation=LinearLayout.HORIZONTAL
              gravity=Gravity.CENTER_VERTICAL
              val headerBg=color(wallHeader.optString("backgroundColor",wallStyle.optString("backgroundColor","#0C121B")),wallBackground)
              setBackgroundColor(headerBg)
              setPadding(0,0,0,wallGap)
            }
            val headerText=color(wallHeader.optString("textColor","#FFFFFF"),wallText)
            val headerScale=wallHeader.optDouble("fontScale",1.0).coerceIn(.7,1.8).toFloat()
            val nameWrap=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL}
            headerFields.forEachIndexed{index,field->
              val key=field.optString("field","symbol")
              val numeric=miniNumeric(row,key)
              val useProfit=field.optBoolean("useProfitColor",false)
              val tone=if(!useProfit||numeric==null)headerText else if(numeric>0)wallGain else if(numeric<0)wallLoss else wallSecondary
              val base=if(index==0)15f else 11f
              nameWrap.addView(textView(
                miniValue(row,key),
                tone,
                base*field.optDouble("fontScale",1.0).toFloat()*headerScale*fs,
                gravityFor(field.optString("align","left"))
              ))
            }
            headerRow.addView(nameWrap,LinearLayoutParams(0,android.view.ViewGroup.LayoutParams.WRAP_CONTENT,1f))
            headerRow.addView(textView("›",wallSecondary,22*headerScale*fs,Gravity.END))
            card.addView(headerRow,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
          }

          if(quoteFields.isNotEmpty()){
            val quoteRow=LinearLayout(this).apply{
              orientation=LinearLayout.HORIZONTAL
              gravity=Gravity.BOTTOM
              setPadding(0,wallGap,0,0)
            }
            val primary=quoteFields.first()
            val primaryKey=primary.optString("field","price")
            val primaryNumeric=miniNumeric(row,primaryKey)
            val primaryUseProfit=primary.optBoolean("useProfitColor",false)
            val primaryTone=if(!primaryUseProfit||primaryNumeric==null)wallText else if(primaryNumeric>0)wallGain else if(primaryNumeric<0)wallLoss else wallSecondary
            quoteRow.addView(textView(
              miniValue(row,primaryKey),
              primaryTone,
              29*primary.optDouble("fontScale",1.0).toFloat()*fs,
              gravityFor(primary.optString("align","left"))
            ),LinearLayoutParams(0,android.view.ViewGroup.LayoutParams.WRAP_CONTENT,1f))
            if(quoteFields.size>1){
              val changeWrap=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;gravity=Gravity.END}
              quoteFields.drop(1).forEach{field->
                val key=field.optString("field","change")
                val numeric=miniNumeric(row,key)
                val useProfit=field.optBoolean("useProfitColor",false)
                val tone=if(!useProfit||numeric==null)wallText else if(numeric>0)wallGain else if(numeric<0)wallLoss else wallSecondary
                changeWrap.addView(textView(
                  miniValue(row,key),
                  tone,
                  11*field.optDouble("fontScale",1.0).toFloat()*fs,
                  gravityFor(field.optString("align","right"))
                ))
              }
              quoteRow.addView(changeWrap)
            }
            card.addView(quoteRow,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
          }

          if(footerFields.isNotEmpty()){
            val footer=LinearLayout(this).apply{
              orientation=LinearLayout.HORIZONTAL
              gravity=Gravity.BOTTOM
              setPadding(0,wallGap,0,0)
            }
            footerFields.forEachIndexed{index,field->
              val key=field.optString("field","pnl")
              val numeric=miniNumeric(row,key)
              val useProfit=field.optBoolean("useProfitColor",false)
              val tone=if(!useProfit||numeric==null)wallText else if(numeric>0)wallGain else if(numeric<0)wallLoss else wallSecondary
              val cell=LinearLayout(this).apply{
                orientation=LinearLayout.VERTICAL
                gravity=gravityFor(field.optString("align",if(index==0)"left" else "right"))
                addView(textView(field.optString("label",key),wallSecondary,10*fs,gravity))
                addView(textView(miniValue(row,key),tone,12*field.optDouble("fontScale",1.0).toFloat()*fs,gravity))
              }
              footer.addView(cell,LinearLayoutParams(0,android.view.ViewGroup.LayoutParams.WRAP_CONTENT,1f))
            }
            card.addView(footer,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT))
          }

          body.addView(card,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,android.view.ViewGroup.LayoutParams.WRAP_CONTENT).apply{
            bottomMargin=wallGap
          })
        }
        val scroller=ScrollView(this).apply{isFillViewport=true;addView(body)}
        root.addView(scroller,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,0,1f))
      }
      "heatmap"->{
        if(rows.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        rows.forEach{row->root.addView(textView("■ "+row.optString("symbol","--")+"  "+signed2(row,"changePercent")+"%",tone(row),12*fs,Gravity.START))}
      }
      "pnl-wall"->{
        if(rows.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        rows.sortedByDescending{it.optDouble("pnl",Double.NEGATIVE_INFINITY)}.forEach{row->
          val pnl=row.optDouble("pnl",Double.NaN)
          val pnlTone=if(!pnl.isFinite())neutral else if(pnl>0)gain else if(pnl<0)loss else neutral
          root.addView(textView(row.optString("symbol","--")+"  損益 "+signedInteger(row,"pnl")+"  "+signed2(row,"roi")+"%",pnlTone,12*fs,Gravity.START))
        }
      }
      "weight-wall"->{
        val total=rows.sumOf{it.optDouble("marketValue",0.0).takeIf(Double::isFinite)?:0.0}
        if(rows.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        rows.sortedByDescending{it.optDouble("marketValue",0.0)}.forEach{row->
          val mv=row.optDouble("marketValue",0.0)
          val weight=if(total>0)mv/total*100.0 else 0.0
          root.addView(textView(row.optString("symbol","--")+"  "+String.format("%.1f%%",weight)+"  "+integer(row,"marketValue"),text,12*fs,Gravity.START))
        }
      }
      "ticker"->{
        val ticker=if(rows.isEmpty())"等待資料" else rows.joinToString("   •   "){quoteLine(it)}
        root.addView(textView(ticker,if(rows.isEmpty())neutral else text,12*fs,Gravity.START))
      }
      "terminal"->{
        if(rows.isEmpty())root.addView(textView("等待資料",neutral,12*fs,Gravity.START))
        rows.forEach{row->root.addView(textView(row.optString("symbol","--")+" | "+number2(row,"price")+" | "+signed2(row,"changePercent")+"% | "+signedInteger(row,"pnl"),tone(row),11*fs,Gravity.START))}
      }
      else->{
        val asset=snap.optJSONObject("asset")?:JSONObject()
        root.addView(textView("TF Asset  總資產 "+integer(asset,"totalAssets"),text,12*fs,Gravity.START))
        if(first==null){root.addView(textView("等待資料",neutral,12*fs,Gravity.START))}
        else{
          root.addView(textView(first.optString("symbol","--")+" "+first.optString("name",""),text,12*fs,Gravity.START))
          root.addView(textView(number2(first,"price")+"  "+signed2(first,"changePercent")+"%",tone(first),16*vs,Gravity.START))
        }
      }
    }
  }

  private fun renderMini(root:LinearLayout,cfg:JSONObject,snap:JSONObject,style:JSONObject){
    if(cfg.optBoolean("showBreathingLight",true)){
      val lamp=textView("●",color(style.optString("gainColor","#10B981"),Color.GREEN),12f,Gravity.START)
      if((cfg.optJSONObject("effects")?:JSONObject()).optBoolean("animationsEnabled",true)){
        lamp.startAnimation(AlphaAnimation(.28f,1f).apply{duration=900;repeatMode=Animation.REVERSE;repeatCount=Animation.INFINITE})
      }
      root.addView(lamp)
    }
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
    val body=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL}
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
      body.addView(row)
    }
    if(rows.isEmpty())body.addView(textView("尚無持股資料",neutral,11*baseScale,Gravity.START))
    val scroller=ScrollView(this).apply{
      isFillViewport=true
      addView(body)
    }
    root.addView(scroller,LinearLayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT,0,1f))
    val asset=snap.optJSONObject("asset")?:JSONObject()
    val totalReturn=asset.optDouble("totalReturn",Double.NaN)
    val returnTone=if(!totalReturn.isFinite())neutral else if(totalReturn>0)gain else if(totalReturn<0)loss else neutral
    root.addView(textView("總資產 "+integer(asset,"totalAssets")+"   市值 "+integer(asset,"marketValue")+"   總損益 "+signedInteger(asset,"totalReturn"),returnTone,10*baseScale,Gravity.CENTER))
  }

  private fun weighted(weight:Float)=LinearLayoutParams(0,android.view.ViewGroup.LayoutParams.WRAP_CONTENT,weight.coerceAtLeast(1f))
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
