package com.tfasset.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.tfasset.app.saietf.TradingCalendar
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId

class TfAssetWidgetLiveService:HeadlessJsTaskService(){
    private val handler=Handler(Looper.getMainLooper())
    private var started=false
    private val closeTask=Runnable{stopSelf()}
    override fun onCreate(){
        super.onCreate()
        val nm=getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if(Build.VERSION.SDK_INT>=26)nm.createNotificationChannel(NotificationChannel(CHANNEL,"Widget 即時連線",NotificationManager.IMPORTANCE_LOW))
        val launch=packageManager.getLaunchIntentForPackage(packageName)
        val pending=launch?.let{PendingIntent.getActivity(this,448,it,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)}
        val builder=if(Build.VERSION.SDK_INT>=26)Notification.Builder(this,CHANNEL) else Notification.Builder(this)
        builder.setSmallIcon(R.drawable.tf_notification_small).setContentTitle("TF Asset · Widget LIVE")
            .setContentText("盤中直接接收富果行情，自動同步 Widget").setOngoing(true).setCategory(Notification.CATEGORY_SERVICE)
        if(pending!=null)builder.setContentIntent(pending)
        startForeground(448,builder.build())
    }
    override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int{
        if(started)return START_STICKY
        if(!hasWidgets(this)||!tradingNow()){stopSelf();return START_NOT_STICKY}
        started=true;running=true;TfAssetMarketOwner.widgetActive=true
        val now=System.currentTimeMillis()
        val local=Instant.ofEpochMilli(now).atZone(ZoneId.of("Asia/Taipei"))
        val close=local.toLocalDate().atTime(13,30).atZone(local.zone).toInstant().toEpochMilli()
        handler.postDelayed(closeTask,(close-now).coerceAtLeast(1L))
        super.onStartCommand(intent,flags,startId)
        return START_STICKY
    }
    override fun getTaskConfig(intent:Intent?):HeadlessJsTaskConfig? =
        if(started)HeadlessJsTaskConfig("TfAssetWidgetLive",Arguments.createMap(),0L,true) else null
    override fun onTimeout(startId:Int,fgsType:Int){stopSelf()}
    override fun onDestroy(){
        handler.removeCallbacks(closeTask);running=false
        TfAssetMarketOwner.stopWidget(this)
        sendBroadcast(Intent(ACTION_STOPPED).setPackage(packageName))
        super.onDestroy()
    }
    companion object{
        const val ACTION_STOPPED="com.tfasset.app.WIDGET_LIVE_STOPPED"
        private const val CHANNEL="tf_asset_widget_live"
        @Volatile private var running=false
        fun hasWidgets(context:Context)=AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context,TfAssetWidgetProvider::class.java)).isNotEmpty()
        private fun tradingNow():Boolean{
            val now=System.currentTimeMillis();val local=Instant.ofEpochMilli(now).atZone(ZoneId.of("Asia/Taipei"))
            return !TradingCalendar.closed(now)&&!local.toLocalTime().isBefore(LocalTime.of(9,0))&&local.toLocalTime().isBefore(LocalTime.of(13,30))
        }
        fun ensureStarted(context:Context){
            if(running||!hasWidgets(context)||!tradingNow()||!TfAssetMarketOwner.uiActive)return
            val intent=Intent(context,TfAssetWidgetLiveService::class.java)
            runCatching{if(Build.VERSION.SDK_INT>=26)context.startForegroundService(intent) else context.startService(intent)}
                .onFailure{context.getSharedPreferences("tf_asset_native",0).edit().putString("widget_refresh_status","背景連線未啟動｜保留最後行情").apply()}
        }
    }
}
