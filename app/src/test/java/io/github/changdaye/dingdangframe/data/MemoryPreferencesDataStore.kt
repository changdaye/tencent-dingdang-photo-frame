package io.github.changdaye.dingdangframe.data

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import java.io.File

class MemoryPreferencesDataStore {
  val dataStore = PreferenceDataStoreFactory.create(
    produceFile = { File.createTempFile("dingdang", ".preferences_pb") },
  )
}
