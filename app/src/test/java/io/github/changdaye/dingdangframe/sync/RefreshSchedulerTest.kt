package io.github.changdaye.dingdangframe.sync

import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.concurrent.TimeUnit

class RefreshSchedulerTest {
  @Test
  fun schedulerRequestsTwoHourPeriodicRefresh() {
    val request = RefreshScheduler.buildRefreshRequest()
    assertEquals(TimeUnit.HOURS.toMillis(2), request.workSpec.intervalDuration)
  }
}
