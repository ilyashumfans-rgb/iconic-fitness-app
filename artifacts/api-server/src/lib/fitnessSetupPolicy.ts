/**
 * Pure policy shared by the HTTP handlers and executable regression tests.
 * It deliberately has no database dependency, making ownership and unit
 * behaviour easy to verify independently of production records.
 */
export type SetupUnit = "metric" | "imperial";

const STEP_FIELDS: Record<1 | 2 | 3 | 4, readonly string[]> = {
  1: ["unitSystem", "heightCm", "weightKg", "age"],
  2: ["goals", "interests"],
  3: ["experienceLevel", "activityLevel", "selfReportedAbility", "movementLimitations"],
  4: ["routineDays", "preferredTime", "workoutLocation", "equipment", "dietPreference"],
};

/** Fields from a member-owned request only; identity/body userId is ignored. */
export function ownStepFieldEntries(
  step: 1 | 2 | 3 | 4,
  body: Record<string, unknown>,
): Array<[string, unknown]> {
  return STEP_FIELDS[step]
    .filter((key) => Object.prototype.hasOwnProperty.call(body, key))
    .map((key) => [key, body[key]]);
}

export function requiresFirstLoginSetup(insertedNewUser: boolean): boolean {
  return insertedNewUser;
}

export function nextPersistedSetupStep(previous: number | null | undefined, savedStep: number): number {
  return Math.max(Math.min(4, Math.max(1, previous ?? 1)), Math.min(4, savedStep + 1));
}

export function canCompleteFitnessSetup(values: {
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
}): boolean {
  return (
    values.age != null &&
    Number.isSafeInteger(values.age) &&
    values.age >= 13 &&
    values.age <= 120 &&
    values.heightCm != null &&
    values.heightCm >= 80 &&
    values.heightCm <= 260 &&
    values.weightKg != null &&
    values.weightKg >= 20 &&
    values.weightKg <= 400
  );
}

export function canonicalMeasurements(input: {
  unitSystem?: SetupUnit | null;
  priorUnitSystem?: string | null;
  hasHeight: boolean;
  height?: number | null;
  heightCm?: number | null;
  hasWeight: boolean;
  weight?: number | null;
  weightKg?: number | null;
}): { heightCm?: number | null; weightKg?: number | null } {
  const unit = input.unitSystem ?? input.priorUnitSystem;
  const out: { heightCm?: number | null; weightKg?: number | null } = {};
  if (input.hasHeight) {
    const raw = input.height;
    out.heightCm =
      raw == null
        ? null
        : canonicalInRange(unit === "imperial" ? raw * 2.54 : raw, 80, 260, "height");
  } else if (typeof input.heightCm === "number" || input.heightCm === null) {
    out.heightCm =
      input.heightCm == null ? null : canonicalInRange(input.heightCm, 80, 260, "height");
  }
  if (input.hasWeight) {
    const raw = input.weight;
    out.weightKg =
      raw == null
        ? null
        : canonicalInRange(unit === "imperial" ? raw / 2.20462 : raw, 20, 400, "weight");
  } else if (typeof input.weightKg === "number" || input.weightKg === null) {
    out.weightKg =
      input.weightKg == null ? null : canonicalInRange(input.weightKg, 20, 400, "weight");
  }
  return out;
}

function canonicalInRange(value: number, min: number, max: number, label: string): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Please enter a ${label} between ${min} and ${max} ${label === "height" ? "cm" : "kg"}.`);
  }
  return Math.round(value * 10) / 10;
}

/**
 * An authoritative completed assessment always owns overlapping measurements,
 * even when a member later edits their self-reported setup.
 */
export function coachProfileSource(assessmentCompletedAt: Date | null, setupCompletedAt: Date | null): "assessment" | "setup" | "profile" {
  if (assessmentCompletedAt) return "assessment";
  if (setupCompletedAt) return "setup";
  return "profile";
}