package io.github.changdaye.dingdangframe.data

const val DEFAULT_FRAME_BASE_URL = "https://tencent-dingdang-photo-frame-apple.5frhvfq5s2.workers.dev"

data class AppConfig(
  val baseUrl: String,
  val username: String,
  val password: String,
) {
  fun resolvedBaseUrl(): String = baseUrl.trim().ifEmpty { DEFAULT_FRAME_BASE_URL }
}

data class SavedFrameSnapshot(
  val imageUrl: String,
  val updatedAt: String,
)
