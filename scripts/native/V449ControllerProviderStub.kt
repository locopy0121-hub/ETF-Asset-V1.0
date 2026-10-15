package com.tfasset.app.saietf
import kotlinx.coroutines.flow.MutableSharedFlow
import tw.saietf.core.market.*
internal class FugleWebSocketProvider{
    val events=MutableSharedFlow<MarketEvent>()
    var desired=emptySet<String>();var connections=0;var disconnected=false;var credentialRejected=false;var credentialChanges=0
    suspend fun replaceSubscriptions(symbols:Set<String>){desired=symbols;if(symbols.isNotEmpty()&&!credentialRejected)connections++}
    suspend fun disconnect(){disconnected=true}
    fun onCredentialChanged(){credentialRejected=false;credentialChanges++;if(desired.isNotEmpty())connections++}
    fun health(at:Long)=ProviderHealth()
    fun desiredSymbolsSnapshot()=desired
}
