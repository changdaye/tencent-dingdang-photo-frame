package io.github.changdaye.dingdangframe.ui

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HiddenSettingsDetectorTest {
  @Test
  fun fiveOkPressesTriggerSettings() {
    val detector = HiddenSettingsDetector(requiredCount = 5)
    repeat(4) { detector.onOkPress() }
    assertFalse(detector.shouldOpenSettings())
    detector.onOkPress()
    assertTrue(detector.shouldOpenSettings())
  }
}
