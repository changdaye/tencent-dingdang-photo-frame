package io.github.changdaye.dingdangframe.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import io.github.changdaye.dingdangframe.data.AppConfig
import io.github.changdaye.dingdangframe.data.AppConfigStore
import io.github.changdaye.dingdangframe.data.FrameRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class FrameViewModel(
  private val configStore: AppConfigStore,
  private val repository: FrameRepository,
) : ViewModel() {
  private val _appState = MutableStateFlow<AppState>(AppState.Loading)
  val appState: StateFlow<AppState> = _appState

  private val _currentConfig = MutableStateFlow<AppConfig?>(null)
  val currentConfig: StateFlow<AppConfig?> = _currentConfig

  fun bootstrap() {
    viewModelScope.launch {
      _currentConfig.value = configStore.configFlow.first()
      _appState.value = if (_currentConfig.value == null) {
        AppState.Configuring
      } else {
        refresh(_currentConfig.value!!)
      }
    }
  }

  fun saveConfig(config: AppConfig) {
    viewModelScope.launch {
      configStore.save(config)
      _currentConfig.value = config
      _appState.value = refresh(config)
    }
  }

  fun openSettings() {
    _appState.value = AppState.Configuring
  }

  private suspend fun refresh(config: AppConfig): AppState = runCatching {
    repository.refresh(config)
  }.getOrElse {
    AppState.Error("REQUEST_FAILED", it.message ?: "Unable to refresh image")
  }

  class Factory(
    private val configStore: AppConfigStore,
    private val repository: FrameRepository,
  ) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
      return FrameViewModel(configStore, repository) as T
    }
  }
}
