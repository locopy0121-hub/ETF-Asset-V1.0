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

  @ReactMethod fun syncWidget(configJson:String,snapshotJson:String,promise:Promise){ prefs.edit().putString("widget_config",configJson).putString("snapshot",snapshotJson).remove("widget_quote_overrides").putString("widget_refresh_status","↻ 更新").apply(); refreshWidget(); promise.resolve(true) }
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
  @ReactMethod fun requestWidgetRefresh(promise:Promise){ refreshWidget(); promise.resolve(true) }
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
