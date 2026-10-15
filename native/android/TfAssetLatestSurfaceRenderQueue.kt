package com.tfasset.app

/** Event-driven latest-frame queue; no price polling and never more than one pending callback. */
internal class LatestSurfaceRenderQueue(private val schedule:(Runnable)->Unit,private val render:()->Unit){
 private val lock=Any()
 private var dirty=false
 private var scheduled=false
 private var rendering=false
 private var closed=false
 private val task=Runnable{drain()}
 fun request(){
  val needsScheduling=synchronized(lock){
   if(closed)return
   dirty=true
   if(scheduled||rendering)false else {scheduled=true;true}
  }
  if(needsScheduling)enqueue()
 }
 private fun enqueue(){try{schedule(task)}catch(error:Throwable){synchronized(lock){scheduled=false};throw error}}
 private fun drain(){
  synchronized(lock){scheduled=false;if(closed||!dirty)return;dirty=false;rendering=true}
  try{render()}finally{
   val again=synchronized(lock){rendering=false;if(!closed&&dirty&&!scheduled){scheduled=true;true}else false}
   if(again)enqueue()
  }
 }
 fun close(){synchronized(lock){closed=true;dirty=false}}
}
