package tw.saietf.core.market
class MarketDataCenter
class ProviderHealth(val circuitState:ProviderCircuitState=ProviderCircuitState.HEALTHY)
enum class ProviderCircuitState{HEALTHY,DEGRADED}
sealed class MarketEvent{class Quote:MarketEvent();class ProviderState(val health:ProviderHealth):MarketEvent()}
