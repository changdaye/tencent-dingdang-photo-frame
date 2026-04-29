package io.github.changdaye.dingdangframe.data

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import kotlinx.coroutines.flow.first
import java.io.File

object TestStores {
  fun newConfigStore(): AppConfigStore = AppConfigStore(
    PreferenceDataStoreFactory.create(
      produceFile = { File.createTempFile("dingdang", ".preferences_pb") },
    ),
  )
}

suspend fun AppConfigStore.firstValue() = snapshotFlow.first()
