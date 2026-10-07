package com.tfasset.app

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TfAssetNativeModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  companion object{
    private const val PICK_THEME_BACKGROUND=4908
    private const val FUGLE_KEY_ALIAS="tfasset-fugle-api-key-v1"
    private const val FUGLE_KEY_PREF="fugle_api_key_ciphertext"
    private const val FUGLE_IV_PREF="fugle_api_key_iv"
  }
  private val prefs get() = reactContext.getSharedPreferences("tf_asset_native", 0)
  private val marketDb by lazy { TfAssetMarketDatabase(reactContext) }
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
    }.onSuccess{promise.resolve(true)}.onFailure{promise.reject("ICON_SWITCH_FAILED",it)}
  }

  @ReactMethod fun loadMarketCache(promise:Promise){
    runCatching{marketDb.load().toString()}
      .onSuccess{promise.resolve(it)}
      .onFailure{promise.reject("MARKET_CACHE_LOAD_FAILED",it)}
  }

  @ReactMethod fun persistMarketCache(payloadJson:String,promise:Promise){
    runCatching{
      marketDb.persist(org.json.JSONObject(payloadJson))
      true
    }.onSuccess{promise.resolve(it)}
      .onFailure{promise.reject("MARKET_CACHE_PERSIST_FAILED",it)}
  }

  @ReactMethod fun clearMarketCache(promise:Promise){
    runCatching{
      marketDb.clearAll()
      true
    }.onSuccess{promise.resolve(it)}
      .onFailure{promise.reject("MARKET_CACHE_CLEAR_FAILED",it)}
  }

  @ReactMethod fun saveFugleApiKey(apiKey:String,promise:Promise){
    val normalized=apiKey.trim()
    if(normalized.isBlank()){ clearFugleApiKey(promise); return }
    runCatching{
      val key=getOrCreateFugleKey()
      val cipher=Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.ENCRYPT_MODE,key)
      val ciphertext=cipher.doFinal(normalized.toByteArray(Charsets.UTF_8))
      prefs.edit()
        .putString(FUGLE_KEY_PREF,Base64.encodeToString(ciphertext,Base64.NO_WRAP))
        .putString(FUGLE_IV_PREF,Base64.encodeToString(cipher.iv,Base64.NO_WRAP))
        .apply()
      true
    }.onSuccess{promise.resolve(it)}.onFailure{promise.reject("FUGLE_KEY_SAVE_FAILED",it)}
  }

  @ReactMethod fun loadFugleApiKey(promise:Promise){
    val encrypted=prefs.getString(FUGLE_KEY_PREF,null)
    val iv=prefs.getString(FUGLE_IV_PREF,null)
    if(encrypted.isNullOrBlank()||iv.isNullOrBlank()){promise.resolve(null);return}
    runCatching{
      val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}
      val key=store.getKey(FUGLE_KEY_ALIAS,null) as? SecretKey ?: return@runCatching null
      val cipher=Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE,key,GCMParameterSpec(128,Base64.decode(iv,Base64.NO_WRAP)))
      String(cipher.doFinal(Base64.decode(encrypted,Base64.NO_WRAP)),Charsets.UTF_8)
    }.onSuccess{promise.resolve(it)}.onFailure{
      prefs.edit().remove(FUGLE_KEY_PREF).remove(FUGLE_IV_PREF).apply()
      promise.resolve(null)
    }
  }

  @ReactMethod fun clearFugleApiKey(promise:Promise){
    runCatching{
      prefs.edit().remove(FUGLE_KEY_PREF).remove(FUGLE_IV_PREF).apply()
      val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}
      if(store.containsAlias(FUGLE_KEY_ALIAS))store.deleteEntry(FUGLE_KEY_ALIAS)
      true
    }.onSuccess{promise.resolve(it)}.onFailure{promise.reject("FUGLE_KEY_CLEAR_FAILED",it)}
  }

  private fun getOrCreateFugleKey():SecretKey{
    val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}
    (store.getKey(FUGLE_KEY_ALIAS,null) as? SecretKey)?.let{return it}
    val generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore")
    generator.init(
      KeyGenParameterSpec.Builder(
        FUGLE_KEY_ALIAS,
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
      ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
       .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
       .setKeySize(256)
       .build(),
    )
    return generator.generateKey()
  }

  private fun refreshWidget(){ val manager=AppWidgetManager.getInstance(reactContext); val ids=manager.getAppWidgetIds(ComponentName(reactContext,TfAssetWidgetProvider::class.java)); val intent=Intent(reactContext,TfAssetWidgetProvider::class.java).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE); intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS,ids); reactContext.sendBroadcast(intent) }
}
