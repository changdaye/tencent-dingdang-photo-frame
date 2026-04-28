package io.github.changdaye.dingdangframe.ui

class HiddenSettingsDetector(private val requiredCount: Int = 5) {
  private var count = 0

  fun onOkPress() {
    count += 1
  }

  fun shouldOpenSettings(): Boolean = count >= requiredCount

  fun reset() {
    count = 0
  }
}
