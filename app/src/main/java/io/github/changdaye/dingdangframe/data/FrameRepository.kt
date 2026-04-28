package io.github.changdaye.dingdangframe.data

import io.github.changdaye.dingdangframe.ui.AppState

class FrameRepository(
  private val api: FrameApi,
  private val configStore: AppConfigStore,
) {
  suspend fun refresh(config: AppConfig): AppState {
    return when (val result = api.fetchFrame(config)) {
      is FrameResult.Success -> {
        configStore.saveSnapshot(SavedFrameSnapshot(result.imageUrl, result.updatedAt))
        AppState.ShowingImage(result.imageUrl, result.updatedAt)
      }
      is FrameResult.Error -> AppState.Error(result.code, result.message)
    }
  }
}
