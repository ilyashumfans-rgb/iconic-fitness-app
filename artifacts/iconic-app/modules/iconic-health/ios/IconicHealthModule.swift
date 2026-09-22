import ExpoModulesCore
import HealthKit
import UIKit

public class IconicHealthModule: Module {
  private let store = HKHealthStore()
  private let worker = DispatchQueue(label: "expo.modules.iconichealth", qos: .utility)
  private var calendar: Calendar {
    var c = Calendar(identifier: .gregorian)
    c.timeZone = TimeZone(identifier: "Asia/Kolkata")!
    return c
  }
  private let quantities: [(String, HKQuantityTypeIdentifier, HKUnit, HKStatisticsOptions)] = [
    ("steps", .stepCount, .count(), .cumulativeSum),
    ("activeCalories", .activeEnergyBurned, .kilocalorie(), .cumulativeSum),
    ("distanceKm", .distanceWalkingRunning, .meterUnit(with: .kilo), .cumulativeSum),
    ("heartRateBpm", .heartRate, HKUnit.count().unitDivided(by: .minute()), .discreteAverage)
  ]

  public func definition() -> ModuleDefinition {
    Name("IconicHealth")
    AsyncFunction("getAvailability") { () -> [String: Any] in
      if HKHealthStore.isHealthDataAvailable() {
        return ["available": true, "provider": "apple-health"]
      }
      return ["available": false, "provider": "apple-health",
              "reason": "HealthKit is not available on this device."]
    }
    AsyncFunction("requestPermissions") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject("E_UNAVAILABLE", "HealthKit is not available on this device.")
        return
      }
      let types: Set<HKObjectType> = Set(self.quantities.map {
        HKObjectType.quantityType(forIdentifier: $0.1)! as HKObjectType
      } + [
        HKObjectType.quantityType(forIdentifier: .bodyMass)!,
        HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
      ])
      self.store.requestAuthorization(toShare: [], read: types) { success, error in
        if let error = error {
          promise.reject("E_HEALTH_PERMISSION", error.localizedDescription)
        } else if success {
          // Apple intentionally does not disclose whether READ access was granted.
          promise.resolve(nil)
        } else {
          promise.reject("E_HEALTH_PERMISSION", "HealthKit authorization did not complete.")
        }
      }
    }
    AsyncFunction("readDailyRecords") { (start: String, end: String, promise: Promise) in
      self.worker.async {
        do {
          guard HKHealthStore.isHealthDataAvailable() else {
            throw self.failure("HealthKit is not available on this device.")
          }
          let days = try self.days(start, end)
          let rows = try days.map { try self.readDay($0) }
          promise.resolve(rows)
        } catch {
          promise.reject("E_HEALTH_READ", error.localizedDescription)
        }
      }
    }
    AsyncFunction("openSettings") { (promise: Promise) in
      // There is no supported public deep link to Health read-permission settings.
      promise.reject("E_SETTINGS_UNSUPPORTED",
        "Open the Health app, tap your profile, then Apps and Services > Iconic Fitness to manage access.")
    }
  }

  private func failure(_ text: String) -> NSError {
    NSError(domain: "IconicHealth", code: 1, userInfo: [NSLocalizedDescriptionKey: text])
  }

  private func isEmptyRead(_ error: Error) -> Bool {
    let e = error as NSError
    return e.domain == HKErrorDomain &&
      (e.code == HKError.Code.errorNoData.rawValue ||
       e.code == HKError.Code.errorAuthorizationDenied.rawValue)
  }

  private func formatter() -> DateFormatter {
    let f = DateFormatter()
    f.calendar = calendar
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = calendar.timeZone
    f.dateFormat = "yyyy-MM-dd"
    f.isLenient = false
    return f
  }

  private func days(_ start: String, _ end: String) throws -> [Date] {
    let f = formatter()
    guard start.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil,
          end.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil,
          let a = f.date(from: start), let b = f.date(from: end),
          f.string(from: a) == start, f.string(from: b) == end,
          let count = calendar.dateComponents([.day], from: a, to: b).day,
          count >= 0, count < 31 else {
      throw failure("Use valid inclusive YYYY-MM-DD dates spanning at most 31 days.")
    }
    return (0...count).map { calendar.date(byAdding: .day, value: $0, to: a)! }
  }

  // Never wait on the main thread. Every query has a timeout and is stopped on timeout.
  private func query<T>(_ build: (@escaping (Result<T, Error>) -> Void) -> HKQuery) throws -> T {
    let semaphore = DispatchSemaphore(value: 0)
    let lock = NSLock()
    var outcome: Result<T, Error>?
    let q = build { result in
      lock.lock()
      outcome = result
      lock.unlock()
      semaphore.signal()
    }
    store.execute(q)
    guard semaphore.wait(timeout: .now() + 30) == .success else {
      store.stop(q)
      throw failure("HealthKit query timed out. Please retry.")
    }
    store.stop(q)
    lock.lock()
    let result = outcome!
    lock.unlock()
    return try result.get()
  }

  private func samples(_ type: HKSampleType, _ a: Date, _ b: Date,
                       strict: Bool = false) throws -> [HKSample] {
    try query { done in
      HKSampleQuery(sampleType: type,
        predicate: HKQuery.predicateForSamples(withStart: a, end: b,
                                              options: strict ? .strictStartDate : []),
        limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
          if let error = error {
            if self.isEmptyRead(error) { done(.success([])) }
            else { done(.failure(error)) }
          }
          else { done(.success(samples ?? [])) }
        }
    }
  }

  private func readDay(_ a: Date) throws -> [String: Any] {
    let b = calendar.date(byAdding: .day, value: 1, to: a)!
    var row: [String: Any] = ["date": formatter().string(from: a)]
    for (key, id, unit, options) in quantities {
      let value: Double? = try query { done in
        // Fixed 24-hour bins anchored to IST midnight (IST has no DST).
        let q = HKStatisticsCollectionQuery(quantityType: HKObjectType.quantityType(forIdentifier: id)!,
          quantitySamplePredicate: HKQuery.predicateForSamples(withStart: a, end: b),
          options: options, anchorDate: a, intervalComponents: DateComponents(hour: 24))
        q.initialResultsHandler = { _, collection, error in
            if let error = error {
              if self.isEmptyRead(error) { done(.success(nil)) }
              else { done(.failure(error)) }
              return
            }
            let stats = collection?.statistics(for: a)
            let quantity = options == .cumulativeSum ? stats?.sumQuantity() : stats?.averageQuantity()
            done(.success(quantity?.doubleValue(for: unit)))
          }
        return q
      }
      row[key] = value.map { $0 as Any } ?? NSNull()
    }
    let weights = try samples(HKObjectType.quantityType(forIdentifier: .bodyMass)!, a, b, strict: true)
      .compactMap { $0 as? HKQuantitySample }.filter { $0.startDate >= a && $0.startDate < b }
    row["weightKg"] = weights.max(by: { $0.startDate < $1.startDate })
      .map { $0.quantity.doubleValue(for: .gramUnit(with: .kilo)) as Any } ?? NSNull()
    let sleep = try samples(HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!, a, b)
      .compactMap { $0 as? HKCategorySample }
    // asleepUnspecified=1, core=3, deep=4, REM=5; exclude awake and in-bed.
    let intervals = sleep.filter { [1, 3, 4, 5].contains($0.value) }
      .map { (max(a, $0.startDate), min(b, $0.endDate)) }
      .filter { $0.0 < $0.1 }.sorted { $0.0 < $1.0 }
    var seconds: TimeInterval = 0
    var finish: Date?
    for (start, end) in intervals {
      let from = max(start, finish ?? start)
      if end > from { seconds += end.timeIntervalSince(from) }
      finish = max(finish ?? end, end)
    }
    row["sleepHours"] = intervals.isEmpty ? NSNull() : (seconds / 3600) as Any
    return row
  }
}