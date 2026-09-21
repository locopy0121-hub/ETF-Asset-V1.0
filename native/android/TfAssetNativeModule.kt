package com.tfasset.app

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TfAssetNativeModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {
  companion object { private const val THEME_BACKGROUND_REQUEST=49013 }
  private val prefs get() = reactContext.getSharedPreferences("tf_asset_native", 0)
  private var pendingThemeBackgroundPromise:Promise?=null
  init { reactContext.addActivityEventListener(this) }
  override fun getName() = "TfAssetNative"

  @ReactMethod fun syncWidget(configJson:String,snapshotJson:String,promise:Promise){ prefs.edit().putString("widget_config",configJson).putString("snapshot",snapshotJson).apply(); refreshWidget(); promise.resolve(true) }
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

  @ReactMethod fun setAppIcon(iconId:String,promise:Promise){
    val index=iconId.removePrefix("icon-").toIntOrNull()
    if(index==null||index !in 1..10){promise.resolve(false);return}
    val manager=reactContext.packageManager
    val selected="MainActivityIcon"+index.toString().padStart(2,'0')
    runCatching{
      manager.setComponentEnabledSetting(
        ComponentName(reactContext.packageName,reactContext.packageName+"."+selected),
        android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
        android.content.pm.PackageManager.DONT_KILL_APP
      )
      (1..10).filter{it!=index}.forEach{n->
        val alias="MainActivityIcon"+n.toString().padStart(2,'0')
        manager.setComponentEnabledSetting(
          ComponentName(reactContext.packageName,reactContext.packageName+"."+alias),
          android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
          android.content.pm.PackageManager.DONT_KILL_APP
        )
      }
      prefs.edit().putString("app_icon_id",iconId).apply()
    }.onSuccess{promise.resolve(true)}.onFailure{promise.reject("ICON_SWITCH_FAILED",it)}
  }

  @ReactMethod fun pickThemeBackgroundImage(promise:Promise){
    if(pendingThemeBackgroundPromise!=null){promise.reject("THEME_PICKER_BUSY","Theme background picker is already open");return}
    val activity=reactContext.currentActivity
    if(activity==null){promise.resolve(null);return}
    pendingThemeBackgroundPromise=promise
    val intent=Intent(Intent.ACTION_OPEN_DOCUMENT).apply{
      addCategory(Intent.CATEGORY_OPENABLE)
      type="image/*"
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    }
    runCatching{activity.startActivityForResult(intent,THEME_BACKGROUND_REQUEST)}
      .onFailure{pendingThemeBackgroundPromise=null;promise.reject("THEME_PICKER_FAILED",it)}
  }

  override fun onActivityResult(activity:Activity,requestCode:Int,resultCode:Int,data:Intent?){
    if(requestCode!=THEME_BACKGROUND_REQUEST)return
    val promise=pendingThemeBackgroundPromise?:return
    pendingThemeBackgroundPromise=null
    if(resultCode!=Activity.RESULT_OK){promise.resolve(null);return}
    val uri=data?.data
    if(uri==null){promise.resolve(null);return}
    runCatching{reactContext.contentResolver.takePersistableUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION)}
    promise.resolve(uri.toString())
  }
  override fun onNewIntent(intent:Intent){}

  private fun refreshWidget(){ val manager=AppWidgetManager.getInstance(reactContext); val ids=manager.getAppWidgetIds(ComponentName(reactContext,TfAssetWidgetProvider::class.java)); val intent=Intent(reactContext,TfAssetWidgetProvider::class.java).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE); intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS,ids); reactContext.sendBroadcast(intent) }
}
