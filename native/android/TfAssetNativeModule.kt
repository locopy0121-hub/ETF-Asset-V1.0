package com.tfasset.app

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TfAssetNativeModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  companion object{private const val PICK_THEME_BACKGROUND=4908}
  private val prefs get() = reactContext.getSharedPreferences("tf_asset_native", 0)
  private var themePickerPromise:Promise?=null

  private val activityListener=object:BaseActivityEventListener(){
    override fun onActivityResult(activity:Activity,requestCode:Int,resultCode:Int,data:Intent?){
      if(requestCode!=PICK_THEME_BACKGROUND)return
      val promise=themePickerPromise?:return
      themePickerPromise=null
      if(resultCode!=Activity.RESULT_OK){promise.resolve(null);return}
      val uri=data?.data
      if(uri==null){promise.resolve(null);return}
      runCatching{
        reactContext.contentResolver.takePersistableUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      promise.resolve(uri.toString())
    }
  }

  init{reactContext.addActivityEventListener(activityListener)}
  override fun getName() = "TfAssetNative"

  /**
   * App and Widget both use the SAME official fetcher and SQLite repository.
   * Network/disk work stays off the UI and React Native bridge threads.
   */
  @ReactMethod fun refreshUnifiedMarketData(symbolsJson:String,promise:Promise){
    val requested=runCatching{
      val array=org.json.JSONArray(symbolsJson)
      (0 until array.length()).map{array.optString(it,"")}
    }.getOrElse{
      promise.reject("MARKET_SYMBOLS","ETF 追蹤清單格式錯誤",it);return
    }
    Thread{
      try{
        val result=TfAssetMarketCenter(reactContext).refresh(requested)
        promise.resolve(result.toString())
        refreshWidget()
        reactContext.sendBroadcast(Intent(reactContext,TfAssetOverlayService::class.java)
          .setAction(TfAssetOverlayService.ACTION_REFRESH))
      }catch(error:Exception){promise.reject("MARKET_REFRESH",error)}
    }.start()
  }

  @ReactMethod fun setMarketBackendUrl(url:String,promise:Promise){
    val endpoint=url.trim().trimEnd('/')
    if(endpoint.isNotEmpty()&&(!endpoint.startsWith("https://")||
       endpoint.contains("@")||endpoint.contains("#")||endpoint.contains("?")||
       endpoint.length>200)){
      promise.reject("BAD_MARKET_URL","後端網址必須是 HTTPS，不可含帳密或查詢參數")
      return
    }
    // Only the independent market source changes. Ledger and fee/tax persistence
    // are not accessed by any market-backend setting.
    prefs.edit().putString("market_backend_url",endpoint).apply()
    promise.resolve(true)
  }

  @ReactMethod fun readUnifiedMarketData(promise:Promise){
    Thread{
      try{promise.resolve(TfAssetMarketCenter(reactContext).snapshot().toString())}
      catch(error:Exception){promise.reject("MARKET_READ",error)}
    }.start()
  }

  @ReactMethod fun syncWidget(configJson:String,snapshotJson:String,promise:Promise){
    // Finance amounts always come from the App's canonical snapshot; Native only overlays prices.
    val canonicalSnapshot=runCatching{org.json.JSONObject(snapshotJson)}.getOrElse{org.json.JSONObject()}
    val canonicalHoldings=canonicalSnapshot.optJSONArray("holdings")?:org.json.JSONArray()
    val holdings=(0 until canonicalHoldings.length()).mapNotNull{canonicalHoldings.optJSONObject(it)}
    fun quoteAt(row:org.json.JSONObject?):Long=runCatching{
      java.time.Instant.parse(row?.optString("updatedAt","")?:"").toEpochMilli()
    }.getOrDefault(0L)
    val verifiedQuoteAt=holdings.map{quoteAt(it)}.maxOrNull()?:0L
    val nativeQuoteAt=prefs.getLong("wall_market_refreshed_at",0L)
    val hasNativeSource=prefs.contains("wall_market_source_at")
    val nativeOverrides=runCatching{org.json.JSONObject(prefs.getString("wall_market_overrides","{}")?:"{}")}.getOrElse{org.json.JSONObject()}
    val edit=prefs.edit().putString("widget_config",configJson).putString("snapshot",snapshotJson)
    if(!hasNativeSource&&nativeOverrides.length()>0){
      // Migrate legacy v2.1.19 HTTP-receipt timestamps: they are not valid exchange freshness proof.
      edit.remove("wall_market_overrides").remove("wall_market_refreshed_at")
        .putString("widget_refresh_status","舊版行情時間未核實｜請更新")
    }else{
      val pending=org.json.JSONObject()
      val keys=nativeOverrides.keys()
      while(keys.hasNext()){
        val symbol=keys.next()
        val old=nativeOverrides.optJSONObject(symbol)?:continue
        val nativeAt=quoteAt(old)
        val current=holdings.firstOrNull{it.optString("symbol","")==symbol}
        val canonicalAt=quoteAt(current)
        if(nativeAt<=0L||canonicalAt<nativeAt)pending.put(symbol,old)
      }
      val allSynced=pending.length()==0
      // Keep the previous source-contract gate; all holdings must also be checked individually.
      val canReconcile=nativeQuoteAt<=0L || (verifiedQuoteAt>0L && verifiedQuoteAt>=nativeQuoteAt && allSynced)
      val clock=java.text.SimpleDateFormat("HH:mm:ss",java.util.Locale.TAIWAN)
        .apply{timeZone=java.util.TimeZone.getTimeZone("Asia/Taipei")}
      if(canReconcile&&allSynced){
        edit.remove("wall_market_overrides").remove("wall_market_refreshed_at").remove("wall_market_source_at")
        val everyHoldingDated=holdings.isNotEmpty()&&holdings.all{quoteAt(it)>0L}
        val shownTime=verifiedQuoteAt.takeIf{it>0L}?.let{clock.format(java.util.Date(it))}
        val status=when{
          shownTime==null->"行情尚未核實｜App 財務快照"
          !everyHoldingDated->"部分行情 $shownTime｜財務按已取得資料"
          else->"行情 $shownTime｜財務已同步"
        }
        edit.putString("widget_refresh_status",status)
      }else{
        // A single newer native symbol is enough to block a misleading global 'fully synced' label.
        edit.putString("wall_market_overrides",pending.toString())
          .putString("widget_refresh_status","行情較新 ${pending.length()} 檔｜財務待同步")
        if(pending.length()>0){
          val oldestNewer=(0 until pending.length()).mapNotNull{index->
            val symbol=pending.keys().asSequence().elementAtOrNull(index)?:return@mapNotNull null
            quoteAt(pending.optJSONObject(symbol)).takeIf{it>0L}
          }.maxOrNull()?:nativeQuoteAt
          edit.putLong("wall_market_refreshed_at",oldestNewer)
          edit.putLong("wall_market_source_at",oldestNewer)
        }
      }
    }
    edit.apply()
    refreshWidget()
    promise.resolve(true)
  }
  @ReactMethod fun syncMonitor(configJson:String,snapshotJson:String,promise:Promise){
    val parsed=runCatching{org.json.JSONObject(configJson)}.getOrElse{org.json.JSONObject()}
    val incomingMode=parsed.optString("mode","normal").let{if(it=="mini")"mini" else "normal"}
    val previousMode=prefs.getString("monitor_last_config_mode",null)
    val edit=prefs.edit().putString("monitor_config",configJson).putString("snapshot",snapshotJson).putString("monitor_last_config_mode",incomingMode)
    if(previousMode!=null&&previousMode!=incomingMode)edit.remove("monitor_runtime_mode_override")
    edit.apply()
    val enabled=parsed.optBoolean("enabled",false)
    if(!enabled){
      prefs.edit().putBoolean("monitor_running",false).putBoolean("monitor_user_closed",false).apply()
      reactContext.stopService(Intent(reactContext,TfAssetOverlayService::class.java))
      promise.resolve(true)
      return
    }
    if(!prefs.getBoolean("monitor_user_closed",false)) reactContext.startService(Intent(reactContext,TfAssetOverlayService::class.java).setAction(TfAssetOverlayService.ACTION_REFRESH))
    promise.resolve(true)
  }
  @ReactMethod fun requestWidgetRefresh(promise:Promise){
    // A manual refresh must request REAL quotes; repainting the cached snapshot is not a refresh.
    reactContext.sendBroadcast(Intent(reactContext,TfAssetWidgetProvider::class.java)
      .setAction(TfAssetWidgetProvider.ACTION_FORCE_REFRESH))
    promise.resolve(true)
  }
  @ReactMethod fun consumeWidgetForceRefreshRequest(promise:Promise){
    val at=prefs.getLong("widget_force_refresh_requested_at",0L)
    if(at>0L)prefs.edit().remove("widget_force_refresh_requested_at").apply()
    promise.resolve(at.toDouble())
  }
  @ReactMethod fun consumeMonitorForceRefreshRequest(promise:Promise){
    val at=prefs.getLong("monitor_force_refresh_requested_at",0L)
    if(at>0L)prefs.edit().remove("monitor_force_refresh_requested_at").apply()
    promise.resolve(at.toDouble())
  }
  @ReactMethod fun startMonitor(promise:Promise){
    prefs.edit().putBoolean("monitor_user_closed",false).apply()
    val cfg=runCatching{org.json.JSONObject(prefs.getString("monitor_config","{}")?:"{}")}.getOrElse{org.json.JSONObject()}
    if(!cfg.optBoolean("enabled",false)){ prefs.edit().putBoolean("monitor_running",false).apply(); promise.resolve(false); return }
    if(!Settings.canDrawOverlays(reactContext)){ promise.resolve(false); return }
    reactContext.startService(Intent(reactContext,TfAssetOverlayService::class.java).setAction(TfAssetOverlayService.ACTION_START))
    promise.resolve(true)
  }
  @ReactMethod fun stopMonitor(promise:Promise){ prefs.edit().putBoolean("monitor_running",false).apply(); reactContext.stopService(Intent(reactContext,TfAssetOverlayService::class.java)); promise.resolve(true) }
  @ReactMethod fun getMonitorStatus(promise:Promise){
    val map=Arguments.createMap()
    val allowed=Settings.canDrawOverlays(reactContext)
    val running=prefs.getBoolean("monitor_running",false) && allowed
    map.putBoolean("running",running)
    map.putString("state",if(!allowed)"permissionRequired" else if(running)"running" else "stopped")
    map.putString("mode",prefs.getString("monitor_runtime_mode","normal"))
    map.putInt("x",prefs.getInt("monitor_runtime_x",0))
    map.putInt("y",prefs.getInt("monitor_runtime_y",0))
    map.putInt("width",prefs.getInt("monitor_runtime_width",0))
    map.putInt("height",prefs.getInt("monitor_runtime_height",0))
    map.putDouble("lastSyncAt",prefs.getLong("monitor_last_sync_at",0L).toDouble())
    map.putString("displaySymbol",prefs.getString("monitor_display_symbol",""))
    promise.resolve(map)
  }
  @ReactMethod fun canDrawOverlays(promise:Promise){ promise.resolve(Settings.canDrawOverlays(reactContext)) }
  @ReactMethod fun openOverlaySettings(promise:Promise){ val intent=Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+reactContext.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); reactContext.startActivity(intent); promise.resolve(true) }

  @ReactMethod fun pickThemeBackground(promise:Promise){
    if(themePickerPromise!=null){promise.reject("THEME_PICKER_BUSY","背景圖片選擇器已開啟");return}
    val activity=reactContext.currentActivity
    if(activity==null){promise.reject("NO_ACTIVITY","目前沒有可用 Activity");return}
    themePickerPromise=promise
    val intent=Intent(Intent.ACTION_OPEN_DOCUMENT).apply{
      addCategory(Intent.CATEGORY_OPENABLE)
      type="image/*"
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    }
    runCatching{activity.startActivityForResult(intent,PICK_THEME_BACKGROUND)}.onFailure{
      themePickerPromise=null
      promise.reject("THEME_PICKER_FAILED",it)
    }
  }

  @ReactMethod fun setAppIcon(iconKey:String,promise:Promise){
    val suffix=iconKey.removePrefix("icon").toIntOrNull()?.coerceIn(1,10)?:1
    val selected="Icon"+suffix.toString().padStart(2,'0')
    val aliases=(1..10).map{"Icon"+it.toString().padStart(2,'0')}
    val pm=reactContext.packageManager
    runCatching{
      aliases.forEach{alias->
        val state=if(alias==selected)PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        pm.setComponentEnabledSetting(ComponentName(reactContext.packageName,reactContext.packageName+"."+alias),state,PackageManager.DONT_KILL_APP)
      }
      prefs.edit().putString("app_icon_key",iconKey).apply()
      refreshWidget()
    }.onSuccess{promise.resolve(true)}.onFailure{promise.reject("ICON_SWITCH_FAILED",it)}
  }

  private fun refreshWidget(){ val manager=AppWidgetManager.getInstance(reactContext); val ids=manager.getAppWidgetIds(ComponentName(reactContext,TfAssetWidgetProvider::class.java)); val intent=Intent(reactContext,TfAssetWidgetProvider::class.java).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE); intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS,ids); reactContext.sendBroadcast(intent) }
}
