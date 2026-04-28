package io.github.changdaye.dingdangframe.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

class RefreshScheduler(private val context: Context) {
  fun schedule() {
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
      WORK_NAME,
      ExistingPeriodicWorkPolicy.UPDATE,
      buildRefreshRequest(),
    )
  }

  fun buildRefreshRequest() = PeriodicWorkRequestBuilder<FrameRefreshWorker>(2, TimeUnit.HOURS)
    .setConstraints(
      Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(),
    )
    .build()

  companion object {
    const val WORK_NAME = "frame-refresh"
  }
}
