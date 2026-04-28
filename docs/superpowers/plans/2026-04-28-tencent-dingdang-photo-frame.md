# Tencent Dingdang Photo Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Android TV-style APK for a flashed Tencent Dingdang device that stores one-time configuration, auto-starts on boot, fetches the latest eligible image URL from a Cloudflare Worker every 2 hours, and shows either a full-screen image or a clear error page.

**Architecture:** Split the project into two deployable units inside one repository: an Android client under `app/` and a Cloudflare Worker under `workers/`. Keep the client thin (configuration, scheduling, display, error state) and centralize authentication plus image selection logic in the Worker.

**Tech Stack:** Kotlin + Jetpack Compose + WorkManager/DataStore for Android; TypeScript + Cloudflare Workers for server logic; Vitest for Worker tests.

---

## Planned File Structure

### Android client
- `app/build.gradle.kts` — Android app build config
- `app/src/main/AndroidManifest.xml` — permissions, launcher, boot receiver
- `app/src/main/java/io/github/changdaye/dingdangframe/MainActivity.kt` — entry activity and route host
- `app/src/main/java/io/github/changdaye/dingdangframe/DingdangFrameApplication.kt` — app startup wiring
- `app/src/main/java/io/github/changdaye/dingdangframe/boot/BootReceiver.kt` — boot auto-start receiver
- `app/src/main/java/io/github/changdaye/dingdangframe/data/AppConfig.kt` — stored config model
- `app/src/main/java/io/github/changdaye/dingdangframe/data/AppConfigStore.kt` — DataStore persistence
- `app/src/main/java/io/github/changdaye/dingdangframe/data/FrameApi.kt` — Worker API client
- `app/src/main/java/io/github/changdaye/dingdangframe/data/FrameRepository.kt` — refresh orchestration and state mapping
- `app/src/main/java/io/github/changdaye/dingdangframe/sync/FrameRefreshWorker.kt` — periodic refresh worker
- `app/src/main/java/io/github/changdaye/dingdangframe/sync/RefreshScheduler.kt` — startup + periodic scheduling
- `app/src/main/java/io/github/changdaye/dingdangframe/ui/AppState.kt` — UI state models
- `app/src/main/java/io/github/changdaye/dingdangframe/ui/FrameViewModel.kt` — screen state controller
- `app/src/main/java/io/github/changdaye/dingdangframe/ui/ConfigScreen.kt` — large-screen config form
- `app/src/main/java/io/github/changdaye/dingdangframe/ui/FrameScreen.kt` — full-screen image page
- `app/src/main/java/io/github/changdaye/dingdangframe/ui/ErrorScreen.kt` — error page
- `app/src/main/java/io/github/changdaye/dingdangframe/ui/HiddenSettingsDetector.kt` — five-OK-key hidden settings logic
- `app/src/main/res/xml/backup_rules.xml` — avoid accidental sensitive backup sync
- `app/src/test/java/io/github/changdaye/dingdangframe/...` — unit tests

### Worker
- `workers/package.json` — package scripts
- `workers/tsconfig.json` — TypeScript config
- `workers/wrangler.jsonc` — Worker config
- `workers/src/index.ts` — fetch handler
- `workers/src/config.ts` — env bindings and constants
- `workers/src/types.ts` — API request/response types
- `workers/src/auth.ts` — password-file validation rules
- `workers/src/cos.ts` — Tencent COS list/read adapter
- `workers/src/image-metadata.ts` — image-size inspection helpers
- `workers/src/frame-service.ts` — latest eligible image selection logic
- `workers/test/frame-service.test.ts` — core selection tests
- `workers/test/index.test.ts` — API contract tests

### Repo infrastructure
- `README.md` — project overview and setup guide
- `LICENSE` — open-source license
- `.gitignore` — Android/Node ignores
- `.editorconfig` — formatting baseline
- `.github/workflows/ci.yml` — lint/test/build CI skeleton
- `docs/superpowers/specs/2026-04-28-tencent-dingdang-photo-frame-design.md` — approved design
- `docs/superpowers/plans/2026-04-28-tencent-dingdang-photo-frame.md` — this plan

---

### Task 1: Scaffold repository infrastructure

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `.github/workflows/ci.yml`
- Verify: `docs/superpowers/specs/2026-04-28-tencent-dingdang-photo-frame-design.md`

- [ ] **Step 1: Create the root README with repo purpose and layout**

```md
# Tencent Dingdang Photo Frame

Turn a flashed Tencent Dingdang device into a boot-to-frame Android appliance.

## Components
- `app/` Android client APK
- `workers/` Cloudflare Worker for auth and image selection
- `docs/` design and implementation artifacts

## Status
Planning / scaffolding
```

- [ ] **Step 2: Create the root `.gitignore`**

```gitignore
# macOS
.DS_Store

# Android / IntelliJ
.gradle/
local.properties
.idea/
*.iml
app/build/
build/
captures/

# Node / Worker
workers/node_modules/
workers/.wrangler/
workers/dist/

# Logs
*.log
```

- [ ] **Step 3: Create `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.{kt,kts}]
indent_size = 4
```

- [ ] **Step 4: Add CI skeleton**

```yaml
name: ci
on:
  push:
  pull_request:
jobs:
  worker-tests:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: workers
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test
```

- [ ] **Step 5: Commit scaffolding**

```bash
git add README.md LICENSE .gitignore .editorconfig .github/workflows/ci.yml docs/
git commit -m "Establish the project shell for the Dingdang photo frame

Constraint: Project is starting from a blank repository and needs maintainable defaults
Rejected: Start coding before documenting repo structure | would hide architecture decisions
Confidence: high
Scope-risk: narrow
Directive: Keep the Android client thin and push business selection logic into the Worker
Tested: Manual file review
Not-tested: CI execution before app and worker exist"
```

### Task 2: Scaffold the Cloudflare Worker package

**Files:**
- Create: `workers/package.json`
- Create: `workers/tsconfig.json`
- Create: `workers/wrangler.jsonc`
- Create: `workers/src/index.ts`
- Create: `workers/src/types.ts`
- Create: `workers/test/index.test.ts`

- [ ] **Step 1: Write the failing API contract test**

```ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src';

describe('POST /frame', () => {
  it('rejects unsupported methods', async () => {
    const request = new Request('https://example.com/frame', { method: 'GET' });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(405);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workers && npm test -- --runInBand`
Expected: FAIL because Worker package and source are not scaffolded yet

- [ ] **Step 3: Add minimal Worker package and stub handler**

```json
{
  "name": "dingdang-photo-frame-worker",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "test": "vitest run"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.8.30",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4",
    "wrangler": "^4.13.2"
  }
}
```

```ts
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, code: 'METHOD_NOT_ALLOWED' }), {
        status: 405,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: false, code: 'NOT_IMPLEMENTED' }), {
      status: 501,
      headers: { 'content-type': 'application/json' },
    });
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workers && npm install && npm test -- --runInBand`
Expected: PASS for method rejection test

- [ ] **Step 5: Commit Worker scaffold**

```bash
git add workers
git commit -m "Create the Worker shell before business logic

Constraint: Client implementation depends on a stable API contract
Rejected: Build Android first | would force guessing the server interface twice
Confidence: high
Scope-risk: narrow
Directive: Keep the public API limited to POST /frame unless a new requirement appears
Tested: Basic Worker contract test
Not-tested: COS integration"
```

### Task 3: Implement Worker auth and response contract

**Files:**
- Modify: `workers/src/index.ts`
- Create: `workers/src/types.ts`
- Create: `workers/src/auth.ts`
- Create: `workers/test/auth-and-contract.test.ts`

- [ ] **Step 1: Write failing tests for bad payload and auth failure**

```ts
it('returns 400 for missing username or password', async () => {
  const request = new Request('https://example.com/frame', {
    method: 'POST',
    body: JSON.stringify({ username: '' }),
  });
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, env, ctx);
  expect(response.status).toBe(400);
});

it('returns AUTH_FAILED when password marker is missing', async () => {
  // stub auth dependency to simulate missing marker
  expect(true).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd workers && npm test -- --runInBand`
Expected: FAIL because input validation and auth service do not exist

- [ ] **Step 3: Implement request schema and auth module**

```ts
export interface FrameRequestBody {
  username: string;
  password: string;
}

export interface FrameSuccessResponse {
  ok: true;
  imageUrl: string;
  updatedAt: string;
}

export interface FrameErrorResponse {
  ok: false;
  code: 'AUTH_FAILED' | 'NO_IMAGE' | 'REQUEST_FAILED' | 'INVALID_RESPONSE';
  message: string;
}
```

```ts
export async function assertAuthorized(username: string, password: string, cos: CosGateway) {
  const markerKey = `${username}/${password}.txt`;
  const exists = await cos.objectExists(markerKey);
  if (!exists) {
    throw new FrameError('AUTH_FAILED', 'Username or password invalid');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd workers && npm test -- --runInBand`
Expected: PASS for payload validation and auth failure mapping

- [ ] **Step 5: Commit auth contract**

```bash
git add workers
git commit -m "Define authentication and error boundaries early

Constraint: The device needs human-readable error pages and stable error codes
Rejected: Return raw upstream errors | would leak storage details to the client
Confidence: medium
Scope-risk: moderate
Directive: Any new error code must also be handled explicitly on Android
Tested: Worker validation and auth mapping tests
Not-tested: Real COS credentials"
```

### Task 4: Implement latest-eligible-image selection in the Worker

**Files:**
- Create: `workers/src/cos.ts`
- Create: `workers/src/image-metadata.ts`
- Create: `workers/src/frame-service.ts`
- Create: `workers/test/frame-service.test.ts`
- Modify: `workers/src/index.ts`

- [ ] **Step 1: Write the failing selection tests**

```ts
it('skips newer but undersized images and returns the newest eligible image', async () => {
  const objects = [
    { key: 'user/a.jpg', updatedAt: '2026-04-28T10:00:00Z', width: 1200, height: 700 },
    { key: 'user/b.jpg', updatedAt: '2026-04-28T09:00:00Z', width: 1600, height: 900 },
  ];
  const result = await pickLatestEligibleImage(objects);
  expect(result?.key).toBe('user/b.jpg');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd workers && npm test -- --runInBand`
Expected: FAIL because selection logic does not exist

- [ ] **Step 3: Implement image selection service**

```ts
export function isEligibleImage(image: { width: number; height: number }) {
  return image.width > 1280 && image.height > 800;
}

export async function pickLatestEligibleImage(objects: CosImageObject[]) {
  return [...objects]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .find((object) => isEligibleImage(object));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd workers && npm test -- --runInBand`
Expected: PASS for selection logic and NO_IMAGE fallback

- [ ] **Step 5: Commit selection logic**

```bash
git add workers
git commit -m "Make the Worker enforce the photo eligibility rule

Constraint: The frame must never display images at or below 1280x800
Rejected: Filter on the client after download | wastes bandwidth and hides server truth
Confidence: high
Scope-risk: moderate
Directive: Keep the threshold check strict (greater-than, not greater-than-or-equal)
Tested: Selection unit tests
Not-tested: Large COS buckets performance"
```

### Task 5: Scaffold the Android application

**Files:**
- Create: `app/build.gradle.kts`
- Create: `app/src/main/AndroidManifest.xml`
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/MainActivity.kt`
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/DingdangFrameApplication.kt`
- Create: `app/src/test/java/io/github/changdaye/dingdangframe/AppStartupTest.kt`

- [ ] **Step 1: Write a failing app startup test**

```kt
class AppStartupTest {
  @Test
  fun app_starts_without_saved_config_into_config_state() {
    assertTrue(false)
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew testDebugUnitTest`
Expected: FAIL because the Android project is not scaffolded yet

- [ ] **Step 3: Create the minimal Android app shell**

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.INTERNET" />
  <application
      android:name=".DingdangFrameApplication"
      android:label="Dingdang Frame">
      <activity
          android:name=".MainActivity"
          android:exported="true">
          <intent-filter>
              <action android:name="android.intent.action.MAIN" />
              <category android:name="android.intent.category.LAUNCHER" />
          </intent-filter>
      </activity>
  </application>
</manifest>
```

- [ ] **Step 4: Run tests to verify the scaffold builds**

Run: `./gradlew testDebugUnitTest`
Expected: PASS for the replaced minimal startup test or at least successful compilation after adding real assertions

- [ ] **Step 5: Commit Android scaffold**

```bash
git add app gradlew gradlew.bat settings.gradle.kts build.gradle.kts
git commit -m "Create the Android shell before screen logic

Constraint: The device target is a flashed Android TV-style box that needs a real APK
Rejected: Start with a WebView wrapper | weaker control over boot and full-screen behavior
Confidence: medium
Scope-risk: moderate
Directive: Keep package and application IDs stable once the first APK is installed on hardware
Tested: Android unit test scaffold
Not-tested: On-device install"
```

### Task 6: Build configuration persistence and settings flow

**Files:**
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/data/AppConfig.kt`
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/data/AppConfigStore.kt`
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/ui/ConfigScreen.kt`
- Create: `app/src/test/java/io/github/changdaye/dingdangframe/data/AppConfigStoreTest.kt`

- [ ] **Step 1: Write failing tests for save/load config**

```kt
@Test
fun save_and_load_config_round_trips() = runTest {
  val store = AppConfigStore(testDataStore)
  val config = AppConfig("https://worker.example.com", "album-a", "secret")
  store.save(config)
  assertEquals(config, store.load())
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./gradlew testDebugUnitTest`
Expected: FAIL because config store does not exist

- [ ] **Step 3: Implement DataStore-backed config persistence and form save flow**

```kt
data class AppConfig(
  val baseUrl: String,
  val username: String,
  val password: String,
)
```

```kt
suspend fun save(config: AppConfig) {
  dataStore.edit {
    it[BASE_URL] = config.baseUrl
    it[USERNAME] = config.username
    it[PASSWORD] = config.password
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest`
Expected: PASS for config persistence tests

- [ ] **Step 5: Commit settings flow**

```bash
git add app
git commit -m "Persist one-time frame configuration on device

Constraint: The frame must survive reboots without re-entering credentials
Rejected: Keep settings only in memory | breaks the appliance-style workflow
Confidence: high
Scope-risk: moderate
Directive: Do not sync saved credentials to cloud backup services
Tested: Config persistence unit tests
Not-tested: D-pad usability on hardware"
```

### Task 7: Build image/error UI states and hidden settings entry

**Files:**
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/ui/AppState.kt`
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/ui/FrameScreen.kt`
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/ui/ErrorScreen.kt`
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/ui/HiddenSettingsDetector.kt`
- Create: `app/src/test/java/io/github/changdaye/dingdangframe/ui/HiddenSettingsDetectorTest.kt`

- [ ] **Step 1: Write failing tests for the five-OK-key hidden settings trigger**

```kt
@Test
fun five_ok_presses_trigger_settings() {
  val detector = HiddenSettingsDetector(requiredCount = 5)
  repeat(4) { detector.onOkPress() }
  assertFalse(detector.shouldOpenSettings())
  detector.onOkPress()
  assertTrue(detector.shouldOpenSettings())
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./gradlew testDebugUnitTest`
Expected: FAIL because hidden settings detector and UI state types do not exist

- [ ] **Step 3: Implement UI states and hidden settings detector**

```kt
sealed interface AppState {
  data object Loading : AppState
  data class ShowingImage(val imageUrl: String) : AppState
  data class Error(val code: String, val message: String) : AppState
  data object Configuring : AppState
}
```

```kt
class HiddenSettingsDetector(private val requiredCount: Int) {
  private var count = 0
  fun onOkPress() { count += 1 }
  fun shouldOpenSettings(): Boolean = count >= requiredCount
  fun reset() { count = 0 }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest`
Expected: PASS for hidden settings detector tests

- [ ] **Step 5: Commit frame and error states**

```bash
git add app
git commit -m "Separate image and error states for the appliance UI

Constraint: The frame must show a clear error page instead of silently keeping stale content
Rejected: Keep showing the last image during failures | conflicts with the approved product behavior
Confidence: high
Scope-risk: moderate
Directive: Keep the error page simple and remote-control friendly
Tested: Hidden settings detector unit tests
Not-tested: Compose rendering snapshots"
```

### Task 8: Implement Worker API client and refresh orchestration on Android

**Files:**
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/data/FrameApi.kt`
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/data/FrameRepository.kt`
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/ui/FrameViewModel.kt`
- Create: `app/src/test/java/io/github/changdaye/dingdangframe/data/FrameRepositoryTest.kt`

- [ ] **Step 1: Write failing tests for success and error mapping**

```kt
@Test
fun refresh_returns_showing_image_when_worker_returns_image_url() = runTest {
  val repository = FrameRepository(fakeApiReturningSuccess())
  val state = repository.refresh(savedConfig)
  assertEquals(AppState.ShowingImage("https://example.com/a.jpg"), state)
}

@Test
fun refresh_returns_error_state_when_worker_auth_fails() = runTest {
  val repository = FrameRepository(fakeApiReturningAuthFailed())
  val state = repository.refresh(savedConfig)
  assertEquals("AUTH_FAILED", (state as AppState.Error).code)
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./gradlew testDebugUnitTest`
Expected: FAIL because API and repository do not exist

- [ ] **Step 3: Implement API client and repository mapping**

```kt
interface FrameApi {
  suspend fun fetchFrame(config: AppConfig): FrameResult
}
```

```kt
class FrameRepository(private val api: FrameApi) {
  suspend fun refresh(config: AppConfig): AppState {
    return when (val result = api.fetchFrame(config)) {
      is FrameResult.Success -> AppState.ShowingImage(result.imageUrl)
      is FrameResult.Error -> AppState.Error(result.code, result.message)
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest`
Expected: PASS for repository state mapping

- [ ] **Step 5: Commit refresh orchestration**

```bash
git add app
git commit -m "Connect the Android frame to the Worker contract

Constraint: The client must remain thin and rely on the Worker for selection truth
Rejected: Duplicate COS and resolution logic on-device | increases drift risk
Confidence: high
Scope-risk: moderate
Directive: Keep repository outputs aligned with Worker error codes
Tested: Repository mapping unit tests
Not-tested: Real network I/O"
```

### Task 9: Add periodic refresh and boot auto-start behavior

**Files:**
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/sync/FrameRefreshWorker.kt`
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/sync/RefreshScheduler.kt`
- Create: `app/src/main/java/io/github/changdaye/dingdangframe/boot/BootReceiver.kt`
- Modify: `app/src/main/AndroidManifest.xml`
- Create: `app/src/test/java/io/github/changdaye/dingdangframe/sync/RefreshSchedulerTest.kt`

- [ ] **Step 1: Write failing tests for two-hour periodic scheduling**

```kt
@Test
fun scheduler_requests_two_hour_periodic_refresh() {
  val request = buildRefreshRequest()
  assertEquals(Duration.ofHours(2), request.workSpec.intervalDuration)
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./gradlew testDebugUnitTest`
Expected: FAIL because the scheduler and worker do not exist

- [ ] **Step 3: Implement WorkManager scheduler and boot receiver**

```kt
val periodicRequest = PeriodicWorkRequestBuilder<FrameRefreshWorker>(2, TimeUnit.HOURS)
  .setConstraints(
    Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
  )
  .build()
```

```kt
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
      RefreshScheduler(context).schedule()
      context.startActivity(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest`
Expected: PASS for scheduler tests

- [ ] **Step 5: Commit scheduling and boot flow**

```bash
git add app
git commit -m "Make the frame recover itself after every reboot

Constraint: The product must behave like an appliance and auto-start on boot
Rejected: Require manual launch after each restart | violates the approved user flow
Confidence: medium
Scope-risk: broad
Directive: Re-test boot behavior on each target ROM because startup policies vary
Tested: Scheduler unit tests
Not-tested: Actual boot broadcast on hardware"
```

### Task 10: Verify end-to-end repo health and document setup

**Files:**
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml`
- Verify: `docs/superpowers/specs/2026-04-28-tencent-dingdang-photo-frame-design.md`
- Verify: `docs/superpowers/plans/2026-04-28-tencent-dingdang-photo-frame.md`

- [ ] **Step 1: Add usage and setup instructions to README**

```md
## Local development

### Worker
cd workers
npm install
npm test

### Android
./gradlew testDebugUnitTest
```

- [ ] **Step 2: Run verification commands**

Run:
```bash
cd workers && npm test
cd .. && ./gradlew testDebugUnitTest
```
Expected: All current automated checks pass

- [ ] **Step 3: Update CI if needed to cover the current commands**

```yaml
  android-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - run: ./gradlew testDebugUnitTest
```

- [ ] **Step 4: Commit final documentation and CI updates**

```bash
git add README.md .github/workflows/ci.yml
git commit -m "Document how to build and verify the frame project

Constraint: This repository is meant for long-term open-source maintenance
Rejected: Leave setup knowledge in chat history only | not durable for contributors
Confidence: high
Scope-risk: narrow
Directive: Keep README setup steps in sync with actual commands whenever the toolchain changes
Tested: Documented verification commands
Not-tested: GitHub Actions runtime before secrets are configured"
```

## Self-review

- Spec coverage: The plan covers repository setup, Worker API/auth/selection logic, Android configuration, full-screen display states, hidden settings entry, periodic refresh, boot auto-start, and verification/docs.
- Placeholder scan: No `TODO`/`TBD` placeholders remain in tasks.
- Type consistency: Request/response names use `FrameRequestBody`, `FrameSuccessResponse`, `FrameErrorResponse`, `FrameApi`, `FrameRepository`, and `AppState` consistently across Android and Worker sections.
