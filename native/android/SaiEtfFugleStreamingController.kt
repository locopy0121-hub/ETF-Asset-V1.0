package com.tfasset.app.saietf

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import tw.saietf.core.market.MarketDataCenter
import tw.saietf.core.market.MarketEvent
import tw.saietf.core.market.ProviderHealth
import tw.saietf.core.market.ProviderCircuitState

internal class FugleStreamingController(
    private val scope: CoroutineScope,
    private val provider: FugleWebSocketProvider,
    private val marketDataCenter: MarketDataCenter,
    private val onProviderDegraded: (ProviderHealth) -> Unit = {},
) {
    init {
        scope.launch(start = CoroutineStart.UNDISPATCHED) {
            provider.events.collect { event ->
                when (event) {
                    is MarketEvent.Quote -> {
                        marketDataCenter.acceptStreamingQuote(event.quote)
                    }

                    is MarketEvent.ProviderState -> {
                        if(event.health.circuitState != ProviderCircuitState.HEALTHY)
                            onProviderDegraded(event.health)
                    }
                }
            }
        }
    }

    fun updateSymbols(symbols: Set<String>) {
        scope.launch {
            provider.replaceSubscriptions(symbols)
            if (symbols.isEmpty()) {
                provider.disconnect()
            }
        }
    }

    fun pause() {
        scope.launch {
            provider.disconnect()
        }
    }

    fun onCredentialChanged(symbols: Set<String>) {
        provider.onCredentialChanged()
        updateSymbols(symbols)
    }

    fun health(): ProviderHealth =
        provider.health(System.currentTimeMillis())

    fun desiredSymbols(): Set<String> =
        provider.desiredSymbolsSnapshot()
}
