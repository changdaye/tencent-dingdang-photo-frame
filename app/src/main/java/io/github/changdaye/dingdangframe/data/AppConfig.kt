package io.github.changdaye.dingdangframe.data

data class AppConfig(
  val baseUrl: String,
  val username: String,
  val password: String,
)

data class SavedFrameSnapshot(
  val imageUrl: String,
  val updatedAt: String,
)
