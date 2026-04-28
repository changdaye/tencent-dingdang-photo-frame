package io.github.changdaye.dingdangframe

import android.app.Application
import io.github.changdaye.dingdangframe.sync.RefreshScheduler

class DingdangFrameApplication : Application() {
  override fun onCreate() {
    super.onCreate()
    RefreshScheduler(this).schedule()
  }
}
