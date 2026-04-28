package io.github.changdaye.dingdangframe.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage

@Composable
fun FrameScreen(imageUrl: String) {
  Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
    AsyncImage(
      model = imageUrl,
      contentDescription = null,
      modifier = Modifier.fillMaxSize(),
      contentScale = ContentScale.Crop,
    )
    Text(
      text = "连续按 5 次 OK 可进入设置",
      style = MaterialTheme.typography.bodySmall,
      color = Color.Transparent,
      modifier = Modifier.align(Alignment.BottomCenter),
    )
  }
}
