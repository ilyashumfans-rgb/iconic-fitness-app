package expo.modules.iconichealth

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.health.connect.*
import android.health.connect.datatypes.*
import android.health.connect.datatypes.Record
import android.os.Build
import android.os.OutcomeReceiver
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class IconicHealthModule : Module() {
  private val worker = Executors.newSingleThreadExecutor()
  private val callbacks = Executors.newSingleThreadExecutor()
  private val zone = ZoneId.of("Asia/Kolkata")
  private val permissions = arrayOf("STEPS", "ACTIVE_CALORIES_BURNED", "DISTANCE", "SLEEP", "HEART_RATE", "WEIGHT")
    .map { "android.permission.health.READ_$it" }.toTypedArray()
  private val context: Context
    get() = appContext.reactContext ?: error("Application context is unavailable.")

  override fun definition() = ModuleDefinition {
    Name("IconicHealth")
    AsyncFunction("getAvailability") {
      val reason = when {
        Build.VERSION.SDK_INT < 34 -> "Health Connect requires Android 14 or newer in this app."
        context.getSystemService(HealthConnectManager::class.java) == null -> "Health Connect is unavailable on this device."
        else -> null
      }
      if (reason == null) mapOf("available" to true, "provider" to "health-connect")
      else mapOf("available" to false, "provider" to "health-connect", "reason" to reason)
    }
    AsyncFunction("requestPermissions") { promise: Promise ->
      try {
        manager()
        val service = appContext.permissions ?: error("The native permission service is unavailable.")
        check(appContext.currentActivity != null) { "Open the app before requesting health permissions." }
        service.askForPermissions({ _ ->
          // Completion means the prompt finished, not that all categories were granted.
          promise.resolve(null)
        }, *permissions)
      } catch (e: Exception) { promise.reject("E_HEALTH_PERMISSION", e.message, e) }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("readDailyRecords") { start: String, end: String, promise: Promise ->
      worker.execute {
        try {
          val health = manager()
          val days = dates(start, end)
          promise.resolve(days.map { readDay(health, it) })
        } catch (e: Exception) {
          promise.reject("E_HEALTH_READ", e.cause?.message ?: e.message ?: "Health Connect read failed.", e)
        }
      }
    }
    AsyncFunction("openSettings") { promise: Promise ->
      try {
        manager()
        val intent = Intent(HealthConnectManager.ACTION_MANAGE_HEALTH_PERMISSIONS)
          .putExtra(Intent.EXTRA_PACKAGE_NAME, context.packageName)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("E_HEALTH_SETTINGS", "Cannot open Health Connect permissions. Open Android Settings > Health Connect.", e)
      }
    }.runOnQueue(Queues.MAIN)
    OnDestroy {
      worker.shutdown()
      callbacks.shutdown()
    }
  }

  private fun manager(): HealthConnectManager {
    check(Build.VERSION.SDK_INT >= 34) { "Health Connect requires Android 14 or newer in this app." }
    return context.getSystemService(HealthConnectManager::class.java)
      ?: error("Health Connect is unavailable on this device.")
  }

  private fun dates(start: String, end: String): List<LocalDate> {
    val pattern = Regex("\\d{4}-\\d{2}-\\d{2}")
    require(pattern.matches(start) && pattern.matches(end)) { "Dates must be YYYY-MM-DD." }
    val a = LocalDate.parse(start)
    val b = LocalDate.parse(end)
    require(a.year >= 1 && b.year >= 1) { "Dates must use a positive year." }
    val count = ChronoUnit.DAYS.between(a, b)
    require(count in 0..30) { "Use an inclusive date range of at most 31 days." }
    return (0..count).map { a.plusDays(it) }
  }

  private fun allowed(suffix: String) =
    context.checkSelfPermission("android.permission.health.READ_$suffix") == PackageManager.PERMISSION_GRANTED

  private fun <T> awaitResult(call: (OutcomeReceiver<T, HealthConnectException>) -> Unit): T {
    val future = CompletableFuture<T>()
    call(object : OutcomeReceiver<T, HealthConnectException> {
      override fun onResult(result: T) { future.complete(result) }
      override fun onError(error: HealthConnectException) { future.completeExceptionally(error) }
    })
    return future.get(30, TimeUnit.SECONDS)
  }

  private fun range(a: Instant, b: Instant) =
    TimeInstantRangeFilter.Builder().setStartTime(a).setEndTime(b).build()

  private fun <T> aggregate(health: HealthConnectManager, a: Instant, b: Instant, type: AggregationType<T>): T? {
    val request = AggregateRecordsRequest.Builder<T>(range(a, b)).addAggregationType(type).build()
    val result = awaitResult<AggregateRecordsResponse<T>> { health.aggregate(request, callbacks, it) }
    return result.get(type)
  }

  private fun <T : Record> records(health: HealthConnectManager, type: Class<T>, filter: TimeRangeFilter): List<T> {
    val all = mutableListOf<T>()
    var token = -1L
    do {
      val builder = ReadRecordsRequestUsingFilters.Builder(type).setTimeRangeFilter(filter).setPageSize(1000)
      if (token != -1L) builder.setPageToken(token)
      val response = awaitResult<ReadRecordsResponse<T>> { health.readRecords(builder.build(), callbacks, it) }
      all.addAll(response.records)
      token = response.nextPageToken
    } while (token != -1L)
    return all
  }

  private fun readDay(health: HealthConnectManager, date: LocalDate): Map<String, Any?> {
    val a = date.atStartOfDay(zone).toInstant()
    val b = date.plusDays(1).atStartOfDay(zone).toInstant()
    val row = mutableMapOf<String, Any?>(
      "date" to date.toString(), "steps" to null, "activeCalories" to null,
      "distanceKm" to null, "sleepHours" to null, "heartRateBpm" to null, "weightKg" to null
    )
    if (allowed("STEPS")) row["steps"] = aggregate(health, a, b, StepsRecord.STEPS_COUNT_TOTAL)
    if (allowed("ACTIVE_CALORIES_BURNED")) {
      row["activeCalories"] = aggregate(health, a, b, ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)?.inCalories?.div(1000.0)
    }
    if (allowed("DISTANCE")) row["distanceKm"] = aggregate(health, a, b, DistanceRecord.DISTANCE_TOTAL)?.inMeters?.div(1000.0)
    if (allowed("HEART_RATE")) row["heartRateBpm"] = aggregate(health, a, b, HeartRateRecord.BPM_AVG)?.toDouble()
    if (allowed("WEIGHT")) {
      row["weightKg"] = records(health, WeightRecord::class.java, range(a, b))
        .filter { it.time >= a && it.time < b }.maxByOrNull { it.time }?.weight?.inGrams?.div(1000.0)
    }
    if (allowed("SLEEP")) {
      // An end-only filter includes sessions beginning before midnight; clip stages to the day.
      // The platform still enforces its historical-read limit (normally 30 days before first grant).
      val sessions = records(health, SleepSessionRecord::class.java,
        TimeInstantRangeFilter.Builder().setEndTime(b).build())
      val asleep = setOf(
        SleepSessionRecord.StageType.STAGE_TYPE_SLEEPING,
        SleepSessionRecord.StageType.STAGE_TYPE_SLEEPING_LIGHT,
        SleepSessionRecord.StageType.STAGE_TYPE_SLEEPING_DEEP,
        SleepSessionRecord.StageType.STAGE_TYPE_SLEEPING_REM
      )
      val intervals = sessions.flatMap { it.stages }.filter { it.type in asleep }
        .map { maxOf(it.startTime, a) to minOf(it.endTime, b) }
        .filter { it.first < it.second }.sortedBy { it.first }
      var seconds = 0.0
      var finish = a
      for ((start, end) in intervals) {
        val from = maxOf(start, finish)
        if (end > from) seconds += java.time.Duration.between(from, end).toMillis() / 1000.0
        finish = maxOf(finish, end)
      }
      row["sleepHours"] = if (intervals.isEmpty()) null else seconds / 3600.0
    }
    return row
  }
}