package android.os
class Looper { companion object {fun getMainLooper()=Looper()} }
class Handler(looper:Looper) {
    fun post(task:Runnable):Boolean { immediate.add(task);return true }
    fun postDelayed(task:Runnable,delay:Long):Boolean { delayed.add(task);return true }
    fun removeCallbacks(task:Runnable) { immediate.remove(task);delayed.remove(task) }
    companion object {
        val immediate=mutableListOf<Runnable>();val delayed=mutableListOf<Runnable>()
        fun flush(){while(immediate.isNotEmpty())immediate.removeAt(0).run()}
    }
}
