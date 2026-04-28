package io.github.changdaye.dingdangframe.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import java.io.IOException

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "dingdang_frame_config")

class AppConfigStore(private val dataStore: DataStore<Preferences>) {
  val configFlow: Flow<AppConfig?> = dataStore.data
    .catch { error ->
      if (error is IOException) emit(emptyPreferences()) else throw error
    }
    .map { preferences ->
      val baseUrl = preferences[BASE_URL] ?: return@map null
      val username = preferences[USERNAME] ?: return@map null
      val password = preferences[PASSWORD] ?: return@map null
      AppConfig(baseUrl, username, password)
    }

  val snapshotFlow: Flow<SavedFrameSnapshot?> = dataStore.data.map { preferences ->
    val imageUrl = preferences[LAST_IMAGE_URL] ?: return@map null
    val updatedAt = preferences[LAST_UPDATED_AT] ?: return@map null
    SavedFrameSnapshot(imageUrl, updatedAt)
  }

  suspend fun save(config: AppConfig) {
    dataStore.edit {
      it[BASE_URL] = config.baseUrl.trim()
      it[USERNAME] = config.username.trim()
      it[PASSWORD] = config.password.trim()
    }
  }

  suspend fun saveSnapshot(snapshot: SavedFrameSnapshot) {
    dataStore.edit {
      it[LAST_IMAGE_URL] = snapshot.imageUrl
      it[LAST_UPDATED_AT] = snapshot.updatedAt
    }
  }

  companion object {
    private val BASE_URL = stringPreferencesKey("base_url")
    private val USERNAME = stringPreferencesKey("username")
    private val PASSWORD = stringPreferencesKey("password")
    private val LAST_IMAGE_URL = stringPreferencesKey("last_image_url")
    private val LAST_UPDATED_AT = stringPreferencesKey("last_updated_at")

    fun from(context: Context) = AppConfigStore(context.dataStore)
  }
}
