package com.tfasset.app

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationChannelGroup
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import org.json.JSONObject

object TfAssetNotificationCenter {
  const val GROUP_ID="tf_asset_notifications"
  const val CHANNEL_DIVIDEND="tf_asset_dividend"
  const val CHANNEL_MARKET="tf_asset_market"
  const val CHANNEL_UPDATES="tf_asset_updates"
  const val CHANNEL_BACKUP="tf_asset_backup"
  const val CHANNEL_GENERAL="tf_asset_general"

  private data class ChannelSpec(
    val id:String,
    val name:String,
    val description:String,
    val importance:Int,
    val vibration:Boolean
  )

  private val specs=listOf(
    ChannelSpec(CHANNEL_DIVIDEND,"股息與除息","除息日、配息日與股息事件提醒",NotificationManager.IMPORTANCE_HIGH,true),
    ChannelSpec(CHANNEL_MARKET,"行情與價格","行情異常、價格狀態與市場資料提醒",NotificationManager.IMPORTANCE_HIGH,true),
    ChannelSpec(CHANNEL_UPDATES,"更新與錯誤","行情更新失敗、資料同步與系統異常提醒",NotificationManager.IMPORTANCE_DEFAULT,true),
    ChannelSpec(CHANNEL_BACKUP,"資料與備份","備份、匯出與資料安全提醒",NotificationManager.IMPORTANCE_DEFAULT,false),
    ChannelSpec(CHANNEL_GENERAL,"一般通知","TF Asset 一般系統通知",NotificationManager.IMPORTANCE_DEFAULT,true),
  )

  private fun manager(context:Context)=context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  fun ensureChannels(context:Context){
    if(Build.VERSION.SDK_INT<Build.VERSION_CODES.O)return
    val nm=manager(context)
    nm.createNotificationChannelGroup(NotificationChannelGroup(GROUP_ID,"TF Asset 通知"))
    specs.forEach{spec->
      val existing=nm.getNotificationChannel(spec.id)
      if(existing==null){
        val channel=NotificationChannel(spec.id,spec.name,spec.importance).apply{
          group=GROUP_ID
          description=spec.description
          enableVibration(spec.vibration)
          setShowBadge(true)
        }
        nm.createNotificationChannel(channel)
      }else{
        existing.name=spec.name
        existing.description=spec.description
        existing.group=GROUP_ID
        nm.createNotificationChannel(existing)
      }
    }
  }

  private fun permissionGranted(context:Context):Boolean{
    if(Build.VERSION.SDK_INT<33)return true
    return context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED
  }

  fun status(context:Context):JSONObject{
    ensureChannels(context)
    val nm=manager(context)
    val channels=JSONObject()
    specs.forEach{spec->
      val enabled=if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O){
        (nm.getNotificationChannel(spec.id)?.importance?:NotificationManager.IMPORTANCE_NONE)!=NotificationManager.IMPORTANCE_NONE
      }else true
      channels.put(spec.id,enabled)
    }
    return JSONObject()
      .put("permissionGranted",permissionGranted(context))
      .put("appEnabled",if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.N)nm.areNotificationsEnabled() else true)
      .put("channelCount",if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O)nm.notificationChannels.count{it.group==GROUP_ID} else specs.size)
      .put("channels",channels)
  }

  fun openSettings(context:Context,channelId:String?=null){
    ensureChannels(context)
    val intent=when{
      Build.VERSION.SDK_INT>=Build.VERSION_CODES.O && !channelId.isNullOrBlank()->
        Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).apply{
          putExtra(Settings.EXTRA_APP_PACKAGE,context.packageName)
          putExtra(Settings.EXTRA_CHANNEL_ID,channelId)
        }
      Build.VERSION.SDK_INT>=Build.VERSION_CODES.O->
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply{
          putExtra(Settings.EXTRA_APP_PACKAGE,context.packageName)
        }
      else->Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:"+context.packageName))
    }.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  fun postTest(context:Context,channelId:String):Boolean{
    ensureChannels(context)
    if(!permissionGranted(context))return false
    val safeChannel=specs.firstOrNull{it.id==channelId}?.id?:CHANNEL_GENERAL
    val launchIntent=context.packageManager.getLaunchIntentForPackage(context.packageName)
    val pending=launchIntent?.let{
      PendingIntent.getActivity(context,8201,it,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    val builder=if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O)Notification.Builder(context,safeChannel) else Notification.Builder(context)
    builder
      .setSmallIcon(R.drawable.tf_notification_small)
      .setContentTitle("TF Asset 通知測試")
      .setContentText("通知權限與通知頻道已正常連線")
      .setAutoCancel(true)
      .setCategory(Notification.CATEGORY_STATUS)
      .setWhen(System.currentTimeMillis())
    if(pending!=null)builder.setContentIntent(pending)
    manager(context).notify(8201,builder.build())
    return true
  }
}
