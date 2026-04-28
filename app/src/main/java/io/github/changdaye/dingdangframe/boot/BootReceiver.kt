package io.github.changdaye.dingdangframe.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import io.github.changdaye.dingdangframe.MainActivity
import io.github.changdaye.dingdangframe.sync.RefreshScheduler

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
      RefreshScheduler(context).schedule()
      context.startActivity(
        Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }
  }
}
