package io.github.changdaye.dingdangframe

import android.os.Bundle
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.changdaye.dingdangframe.data.AppConfigStore
import io.github.changdaye.dingdangframe.data.FrameRepository
import io.github.changdaye.dingdangframe.data.HttpFrameApi
import io.github.changdaye.dingdangframe.ui.AppState
import io.github.changdaye.dingdangframe.ui.ConfigScreen
import io.github.changdaye.dingdangframe.ui.ErrorScreen
import io.github.changdaye.dingdangframe.ui.FrameScreen
import io.github.changdaye.dingdangframe.ui.FrameViewModel
import io.github.changdaye.dingdangframe.ui.HiddenSettingsDetector

class MainActivity : ComponentActivity() {
  private val detector = HiddenSettingsDetector()
  private val configStore by lazy { AppConfigStore.from(this) }
  private val viewModel by viewModels<FrameViewModel> {
    FrameViewModel.Factory(
      configStore,
      FrameRepository(HttpFrameApi(), configStore),
    )
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    viewModel.bootstrap()
    setContent {
      val state by viewModel.appState.collectAsStateWithLifecycle()
      val config by viewModel.currentConfig.collectAsStateWithLifecycle()
      Surface(modifier = Modifier, color = MaterialTheme.colorScheme.background) {
        when (val current = state) {
          AppState.Configuring -> ConfigScreen(initialConfig = config, onSave = viewModel::saveConfig)
          is AppState.Error -> ErrorScreen(current.code, current.message)
          AppState.Loading -> ErrorScreen("LOADING", "正在加载配置与图片…")
          is AppState.ShowingImage -> FrameScreen(current.imageUrl)
        }
      }
    }
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER) {
      detector.onOkPress()
      if (detector.shouldOpenSettings()) {
        detector.reset()
        viewModel.openSettings()
        return true
      }
    }
    return super.onKeyDown(keyCode, event)
  }
}
