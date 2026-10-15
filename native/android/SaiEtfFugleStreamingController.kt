package com.tfasset.app.saietf

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.atomic.AtomicLong
import tw.saietf.core.market.MarketDataCenter
import tw.saietf.core.market.MarketEvent
import tw.saietf.core.market.ProviderHealth
import tw.saietf.core.market.ProviderCircuitState

internal class FugleStreamingController(
    private val scope: CoroutineScope,
    private val provider: FugleWebSocketProvider,
    private val marketDataCenter: MarketDataCenter,
    private val allowStreaming:()->Boolean={true},
    private val onProviderDegraded: (ProviderHealth) -> Unit = {},
) {
    private val commandVersion=AtomicLong()
    private val commands=Mutex()
    private val credentialVersion=AtomicLong()
    private var appliedCredentialVersion=0L
    init {
        scope.launch(start = CoroutineStart.UNDISPATCHED) {
            provider.events.collect { event ->
                when (event) {
                    // Price acceptance is synchronous from Fugle's native
                    // onTrade callback. Do not accept it a second time here.
                    is MarketEvent.Quote -> Unit

                    is MarketEvent.ProviderState -> {
                        if(event.health.circuitState != ProviderCircuitState.HEALTHY)
                            onProviderDegraded(event.health)
                    }
                }
            }
        }
    }

    private fun command(symbols:Set<String>,credentials:Boolean=false){
        if(credentials)credentialVersion.incrementAndGet()
        val version=commandVersion.incrementAndGet()
        scope.launch{
            commands.withLock{
                if(version!=commandVersion.get())return@withLock
                val desired=if(allowStreaming())symbols else emptySet()
                val credential=credentialVersion.get()
                if(credential>appliedCredentialVersion){
                    provider.replaceSubscriptions(emptySet())
                    provider.onCredentialChanged()
                    appliedCredentialVersion=credential
                }
                provider.replaceSubscriptions(desired)
                if(desired.isEmpty())provider.disconnect()
            }
        }
    }
    fun updateSymbols(symbols:Set<String>)=command(symbols)
    fun pause()=command(emptySet())
    fun onCredentialChanged(symbols:Set<String>)=command(symbols,true)

    fun health(): ProviderHealth =
        provider.health(System.currentTimeMillis())

    fun desiredSymbols(): Set<String> =
        provider.desiredSymbolsSnapshot()
}
