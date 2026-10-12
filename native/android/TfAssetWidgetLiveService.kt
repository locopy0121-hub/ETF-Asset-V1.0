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
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class TfAssetWidgetLiveService:HeadlessJsTaskService(){
    private var started=false
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
        if(!hasWidgets(this)||!TfAssetMarketSchedule.allows(this)){stopSelf();return START_NOT_STICKY}
        started=true;running=true;TfAssetMarketOwner.widgetActive=true
        TfAssetMarketOwner.applySchedule(this)
        super.onStartCommand(intent,flags,startId)
        return START_STICKY
    }
    override fun getTaskConfig(intent:Intent?):HeadlessJsTaskConfig? =
        if(started)HeadlessJsTaskConfig("TfAssetWidgetLive",Arguments.createMap(),0L,true) else null
    override fun onTimeout(startId:Int,fgsType:Int){stopSelf()}
    override fun onDestroy(){
        running=false
        TfAssetMarketOwner.stopWidget(this)
        sendBroadcast(Intent(ACTION_STOPPED).setPackage(packageName))
        super.onDestroy()
    }
    companion object{
        const val ACTION_STOPPED="com.tfasset.app.WIDGET_LIVE_STOPPED"
        private const val CHANNEL="tf_asset_widget_live"
        @Volatile private var running=false
        fun hasWidgets(context:Context)=AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context,TfAssetWidgetProvider::class.java)).isNotEmpty()
        fun ensureStarted(context:Context){
            if(running||!hasWidgets(context)||!TfAssetMarketSchedule.allows(context)||!TfAssetMarketOwner.uiActive)return
            val intent=Intent(context,TfAssetWidgetLiveService::class.java)
            runCatching{if(Build.VERSION.SDK_INT>=26)context.startForegroundService(intent) else context.startService(intent)}
                .onFailure{context.getSharedPreferences("tf_asset_native",0).edit().putString("widget_refresh_status","背景連線未啟動｜保留最後行情").apply()}
        }
    }
}
