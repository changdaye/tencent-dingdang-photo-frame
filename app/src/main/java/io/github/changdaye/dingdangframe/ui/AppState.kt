package io.github.changdaye.dingdangframe.ui

sealed interface AppState {
  data object Loading : AppState
  data object Configuring : AppState
  data class ShowingImage(val imageUrl: String, val updatedAt: String) : AppState
  data class Error(val code: String, val message: String) : AppState
}
