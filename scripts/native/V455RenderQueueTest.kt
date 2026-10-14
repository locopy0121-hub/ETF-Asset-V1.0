package com.tfasset.app
import java.util.concurrent.CountDownLatch
import kotlin.concurrent.thread

fun main(){
 val scheduled=java.util.concurrent.ConcurrentLinkedQueue<Runnable>()
 var latest=0;val rendered=mutableListOf<Int>();lateinit var queue:LatestSurfaceRenderQueue
 queue=LatestSurfaceRenderQueue({scheduled.add(it)}){
  rendered.add(latest)
  if(latest==1000){latest=2000;repeat(1000){queue.request()}}
 }
 repeat(1000){latest=it+1;queue.request()}
 check(scheduled.size==1){"burst must not queue 1000 main-thread renders"}
 scheduled.remove().run();check(rendered==listOf(1000));check(scheduled.size==1)
 scheduled.remove().run();check(rendered==listOf(1000,2000));check(scheduled.isEmpty())
 val workers=(1..8).map{thread{repeat(1000){queue.request()}}};workers.forEach{it.join()}
 check(scheduled.size==1);queue.close();scheduled.remove().run();check(rendered.size==2)
 queue.request();check(scheduled.isEmpty())
 var attempts=0;val retry=LatestSurfaceRenderQueue({scheduled.add(it)}){attempts++;if(attempts==1)throw IllegalStateException("draw failed")}
 retry.request();runCatching{scheduled.remove().run()};retry.request();scheduled.remove().run();check(attempts==2)
 println("V4.0.55 production render queue: 1000-tick burst, latest value, in-render requests, 8 concurrent producers, close and error recovery PASS")
}
