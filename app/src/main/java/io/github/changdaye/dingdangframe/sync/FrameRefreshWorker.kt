package io.github.changdaye.dingdangframe.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import io.github.changdaye.dingdangframe.data.AppConfigStore
import io.github.changdaye.dingdangframe.data.FrameRepository
import io.github.changdaye.dingdangframe.data.HttpFrameApi
import kotlinx.coroutines.flow.first

class FrameRefreshWorker(
  context: Context,
  params: WorkerParameters,
) : CoroutineWorker(context, params) {
  override suspend fun doWork(): Result {
    val configStore = AppConfigStore.from(applicationContext)
    val config = configStore.configFlow.first() ?: return Result.success()
    val repository = FrameRepository(HttpFrameApi(), configStore)
    return runCatching { repository.refresh(config) }
      .fold(
        onSuccess = { Result.success() },
        onFailure = { Result.retry() },
      )
  }
}
