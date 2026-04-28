package io.github.changdaye.dingdangframe.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun ErrorScreen(code: String, message: String) {
  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(32.dp),
    verticalArrangement = Arrangement.spacedBy(16.dp),
  ) {
    Text("电子相框暂时无法显示图片", style = MaterialTheme.typography.headlineMedium)
    Text("错误类型：$code", style = MaterialTheme.typography.titleMedium)
    Text(message, style = MaterialTheme.typography.bodyLarge)
    Text("系统会自动继续重试。", style = MaterialTheme.typography.bodyMedium)
  }
}
