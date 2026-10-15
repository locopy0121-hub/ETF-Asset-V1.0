package com.tfasset.app.saietf
import kotlinx.coroutines.*
import kotlin.coroutines.CoroutineContext
import tw.saietf.core.market.MarketDataCenter
fun main(){
    val queued=mutableListOf<Runnable>()
    val dispatcher=object:CoroutineDispatcher(){override fun dispatch(context:CoroutineContext,block:Runnable){queued.add(block)}}
    val scope=CoroutineScope(SupervisorJob()+dispatcher);val provider=FugleWebSocketProvider();var allowed=true
    val controller=FugleStreamingController(scope,provider,MarketDataCenter(),allowStreaming={allowed})
    fun drain(){while(queued.isNotEmpty())queued.removeAt(queued.lastIndex).run()}
    controller.updateSymbols(setOf("0050"));controller.pause();drain()
    check(provider.connections==0&&provider.desired.isEmpty())
    allowed=false;controller.updateSymbols(setOf("0050"));controller.onCredentialChanged(setOf("0050"));drain()
    check(provider.connections==0&&provider.desired.isEmpty())
    allowed=true;controller.updateSymbols(setOf("0050"));drain();check(provider.connections==1)
    allowed=false;controller.onCredentialChanged(setOf("0050"));drain();check(provider.connections==1&&provider.desired.isEmpty())
    allowed=true;provider.credentialRejected=true
    val resets=provider.credentialChanges
    controller.onCredentialChanged(setOf("0050"));controller.updateSymbols(setOf("0050"));drain()
    check(!provider.credentialRejected&&provider.credentialChanges==resets+1&&provider.desired==setOf("0050"))
    scope.cancel();drain()
    println("Actual streaming controller: late command/disabled schedule/credential change/reopen PASS")
}
