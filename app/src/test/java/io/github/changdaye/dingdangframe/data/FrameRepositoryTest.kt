package io.github.changdaye.dingdangframe.data

import io.github.changdaye.dingdangframe.ui.AppState
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class FrameRepositoryTest {
  @Test
  fun refreshReturnsShowingImageWhenWorkerReturnsImageUrl() = runBlocking {
    val configStore = TestStores.newConfigStore()
    val repository = FrameRepository(
      api = object : FrameApi {
        override suspend fun fetchFrame(config: AppConfig) = FrameResult.Success("https://example.com/a.jpg", "2026-04-28T10:00:00Z")
      },
      configStore = configStore,
    )

    val state = repository.refresh(AppConfig("https://worker.example.com", "album-a", "secret"))
    assertEquals(AppState.ShowingImage("https://example.com/a.jpg", "2026-04-28T10:00:00Z"), state)
    assertEquals("https://example.com/a.jpg", configStore.snapshotFlow.first()?.imageUrl)
  }

  @Test
  fun refreshReturnsErrorStateWhenWorkerAuthFails() = runBlocking {
    val repository = FrameRepository(
      api = object : FrameApi {
        override suspend fun fetchFrame(config: AppConfig) = FrameResult.Error("AUTH_FAILED", "Username or password invalid")
      },
      configStore = TestStores.newConfigStore(),
    )

    val state = repository.refresh(AppConfig("https://worker.example.com", "album-a", "secret"))
    assertEquals("AUTH_FAILED", (state as AppState.Error).code)
  }
}
