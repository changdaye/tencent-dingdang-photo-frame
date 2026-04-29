package io.github.changdaye.dingdangframe.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import io.github.changdaye.dingdangframe.data.AppConfig
import io.github.changdaye.dingdangframe.data.DEFAULT_FRAME_BASE_URL

@Composable
fun ConfigScreen(
  initialConfig: AppConfig?,
  onSave: (AppConfig) -> Unit,
) {
  var baseUrl by remember { mutableStateOf(initialConfig?.baseUrl.orEmpty()) }
  var username by remember { mutableStateOf(initialConfig?.username.orEmpty()) }
  var password by remember { mutableStateOf(initialConfig?.password.orEmpty()) }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(32.dp),
    verticalArrangement = Arrangement.spacedBy(24.dp),
  ) {
    Text("配置电子相框", style = MaterialTheme.typography.headlineMedium)
    Text("地址可留空；留空时默认使用已部署的 Cloudflare 域名。", style = MaterialTheme.typography.bodyMedium)
    OutlinedTextField(
      value = baseUrl,
      onValueChange = { baseUrl = it },
      label = { Text("Workers 地址（可留空）") },
      placeholder = { Text(DEFAULT_FRAME_BASE_URL) },
      modifier = Modifier.fillMaxWidth(),
    )
    OutlinedTextField(value = username, onValueChange = { username = it }, label = { Text("用户名") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("密码") }, modifier = Modifier.fillMaxWidth())
    Button(onClick = { onSave(AppConfig(baseUrl, username, password)) }) {
      Text("保存并开始")
    }
  }
}
