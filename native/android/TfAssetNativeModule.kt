package com.tfasset.app

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import android.provider.OpenableColumns
import java.io.ByteArrayOutputStream
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TfAssetNativeModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  companion object{
    private const val PICK_THEME_BACKGROUND=4908
    private const val CREATE_BACKUP_DOCUMENT=4909
    private const val OPEN_BACKUP_DOCUMENT=4910
    private const val MAX_BACKUP_BYTES=32*1024*1024
  }
  private val prefs get() = reactContext.getSharedPreferences("tf_asset_native", 0)
  private var themePickerPromise:Promise?=null
  private var backupPickerPromise:Promise?=null
  private var backupExportText:String?=null

  private val activityListener=object:BaseActivityEventListener(){
    override fun onActivityResult(activity:Activity,requestCode:Int,resultCode:Int,data:Intent?){
      if(requestCode==CREATE_BACKUP_DOCUMENT||requestCode==OPEN_BACKUP_DOCUMENT){
        val promise=backupPickerPromise?:return
        val exportText=backupExportText
        backupPickerPromise=null
        backupExportText=null
        if(resultCode!=Activity.RESULT_OK){promise.resolve(null);return}
        val uri=data?.data
        if(uri==null){promise.reject("BACKUP_NO_URI","系統未回傳選擇的檔案");return}
        Thread {
          try{
            if(requestCode==CREATE_BACKUP_DOCUMENT){
              val bytes=(exportText?:throw IllegalStateException("匯出內容已遺失")).toByteArray(Charsets.UTF_8)
              if(bytes.size>MAX_BACKUP_BYTES)throw IllegalArgumentException("備份檔超過 32MB 限制")
              val stream=reactContext.contentResolver.openOutputStream(uri,"w")
                ?:throw IllegalStateException("無法開啟選定的存檔位置")
              stream.use{it.write(bytes);it.flush()}
              val copied=readBackupBytes(uri)
              if(!bytes.contentEquals(copied))throw IllegalStateException("寫入後讀回資料不一致；請檢查目錄內的檔案")
              val receipt=Arguments.createMap()
              receipt.putString("uri",uri.toString())
              receipt.putString("fileName",backupDisplayName(uri))
              receipt.putDouble("bytes",bytes.size.toDouble())
              receipt.putBoolean("verified",true)
              promise.resolve(receipt)
            }else{
              val bytes=readBackupBytes(uri)
              if(bytes.isEmpty())throw IllegalArgumentException("所選備份檔是空檔案")
              val content=bytes.toString(Charsets.UTF_8)
              val result=Arguments.createMap()
              result.putString("uri",uri.toString())
              result.putString("fileName",backupDisplayName(uri))
              result.putDouble("bytes",bytes.size.toDouble())
              result.putString("text",content)
              promise.resolve(result)
            }
          }catch(error:Exception){
            promise.reject("BACKUP_DOCUMENT_FAILED",error)
          }
        }.start()
        return
      }
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

  private fun readBackupBytes(uri:Uri):ByteArray{
    val stream=reactContext.contentResolver.openInputStream(uri)
      ?:throw IllegalStateException("無法讀回指定的備份檔")
    return stream.use{input->
      val output=ByteArrayOutputStream()
      val buffer=ByteArray(8192)
      var count=0
      while(true){
        val n=input.read(buffer)
        if(n<0)break
        count+=n
        if(count>MAX_BACKUP_BYTES)throw IllegalArgumentException("備份檔超過 32MB 限制")
        output.write(buffer,0,n)
      }
      output.toByteArray()
    }
  }
  private fun backupDisplayName(uri:Uri):String{
    return reactContext.contentResolver.query(uri,arrayOf(OpenableColumns.DISPLAY_NAME),null,null,null)?.use{cursor->
      val index=cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
      if(index>=0&&cursor.moveToFirst())cursor.getString(index) else null
    }?:uri.lastPathSegment?:"TF-Asset-Backup.json"
  }
  init{reactContext.addActivityEventListener(activityListener)}
  override fun getName() = "TfAssetNative"

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
        val nativePrice=old.optDouble("price",Double.NaN)
        val canonicalPrice=current?.optDouble("price",Double.NaN)?:Double.NaN
        val samePrice=nativePrice.isFinite()&&canonicalPrice.isFinite()&&kotlin.math.abs(nativePrice-canonicalPrice)<0.0001
        // Equal clock + different price is not evidence of synchronized canonical finance.
        if(nativeAt<=0L||canonicalAt<nativeAt||(canonicalAt==nativeAt&&!samePrice))pending.put(symbol,old)
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

  /** SAF document picker stores JSON OUTSIDE private app data and verifies write by reading it back. */
  @ReactMethod fun saveBackupDocument(text:String,fileName:String,promise:Promise){
    if(backupPickerPromise!=null||themePickerPromise!=null){promise.reject("PICKER_BUSY","另一個檔案選擇器正在使用中");return}
    val activity=reactContext.currentActivity
    if(activity==null){promise.reject("NO_ACTIVITY","無法開啟檔案選擇器");return}
    if(text.isBlank()||text.toByteArray(Charsets.UTF_8).size>MAX_BACKUP_BYTES){
      promise.reject("BAD_BACKUP","備份為空或超過 32MB");return
    }
    backupPickerPromise=promise
    backupExportText=text
    val safeName=fileName.replace(Regex("[^a-zA-Z0-9_.-]"),"_").take(100).let{
      if(it.endsWith(".json",ignoreCase=true))it else it+".json"
    }
    val intent=Intent(Intent.ACTION_CREATE_DOCUMENT).apply{
      addCategory(Intent.CATEGORY_OPENABLE)
      type="application/json"
      putExtra(Intent.EXTRA_TITLE,safeName)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
    }
    runCatching{activity.startActivityForResult(intent,CREATE_BACKUP_DOCUMENT)}.onFailure{
      backupPickerPromise=null;backupExportText=null
      promise.reject("CREATE_DOCUMENT_FAILED",it)
    }
  }

  @ReactMethod fun openBackupDocument(promise:Promise){
    if(backupPickerPromise!=null||themePickerPromise!=null){promise.reject("PICKER_BUSY","另一個檔案選擇器正在使用中");return}
    val activity=reactContext.currentActivity
    if(activity==null){promise.reject("NO_ACTIVITY","無法開啟檔案選擇器");return}
    backupPickerPromise=promise
    val intent=Intent(Intent.ACTION_OPEN_DOCUMENT).apply{
      addCategory(Intent.CATEGORY_OPENABLE)
      type="*/*"
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    runCatching{activity.startActivityForResult(intent,OPEN_BACKUP_DOCUMENT)}.onFailure{
      backupPickerPromise=null
      promise.reject("OPEN_DOCUMENT_FAILED",it)
    }
  }

  @ReactMethod fun pickThemeBackground(promise:Promise){
    if(themePickerPromise!=null||backupPickerPromise!=null){promise.reject("THEME_PICKER_BUSY","背景圖片選擇器已開啟");return}
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
