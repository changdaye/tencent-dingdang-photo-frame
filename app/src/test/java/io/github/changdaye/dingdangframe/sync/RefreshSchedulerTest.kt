package io.github.changdaye.dingdangframe.sync

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.concurrent.TimeUnit

class RefreshSchedulerTest {
  @Test
  fun schedulerRequestsTwoHourPeriodicRefresh() {
    val scheduler = RefreshScheduler(ApplicationProvider.getApplicationContext<Context>())
    val request = scheduler.buildRefreshRequest()
    assertEquals(TimeUnit.HOURS.toMillis(2), request.workSpec.intervalDuration)
  }
}
