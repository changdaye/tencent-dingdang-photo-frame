package io.github.changdaye.dingdangframe.data

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import kotlin.io.path.createTempDirectory

@OptIn(ExperimentalCoroutinesApi::class)
class AppConfigStoreTest {
  @Test
  fun saveAndLoadConfigRoundTrips() = runTest {
    val store = AppConfigStore(
      PreferenceDataStoreFactory.create(
        scope = backgroundScope,
        produceFile = { createTempDirectory("dingdang-config").resolve("config.preferences_pb").toFile() },
      ),
    )
    val config = AppConfig("https://worker.example.com", "album-a", "secret")
    store.save(config)
    assertEquals(config, store.configFlow.first())
  }
}
