package android.content
open class Context {
    val applicationContext:Context get()=this
    fun getSharedPreferences(name:String,mode:Int)=Preferences()
    companion object { const val MODE_PRIVATE=0 }
}
class Preferences {
    fun getStringSet(key:String,default:Set<String>):Set<String> = default
    fun edit()=Editor()
    class Editor {fun putStringSet(key:String,value:Set<String>)=this;fun apply(){}}
}
