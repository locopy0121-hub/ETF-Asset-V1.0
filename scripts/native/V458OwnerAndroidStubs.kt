package android.content
open class Context {
    open val applicationContext:Context get()=this
    var stops=0
    open fun stopService(intent:Intent):Boolean { stops++;return true }
}
class Intent(context:Context,clazz:Class<*>)
