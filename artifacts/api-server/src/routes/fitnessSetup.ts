import { Router, type IRouter } from "express";
import { and, eq, gte, isNotNull, lte, or, sql } from "drizzle-orm";
import {
  db,
  fitnessSetupTable,
} from "@workspace/db";
import {
  CompleteFitnessSetupResponse,
  GetFitnessSetupResponse,
  SaveFitnessSetupStepBody,
  SaveFitnessSetupStepResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import { ensureFitnessSetupTable } from "../lib/fitnessSetup";
import {
  canCompleteFitnessSetup,
  canonicalMeasurements,
  nextPersistedSetupStep,
  ownStepFieldEntries,
} from "../lib/fitnessSetupPolicy";

const router: IRouter = Router();

type SetupRow = typeof fitnessSetupTable.$inferSelect;

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function response(row: SetupRow | null) {
  if (!row) {
    return {
      exists: false,
      requiredForOnboarding: false,
      currentStep: 1,
      completed: false,
      completedAt: null,
      unitSystem: null,
      heightCm: null,
      weightKg: null,
      age: null,
      goals: [],
      interests: [],
      experienceLevel: null,
      activityLevel: null,
      selfReportedAbility: null,
      movementLimitations: null,
      routineDays: [],
      preferredTime: null,
      workoutLocation: null,
      equipment: [],
      dietPreference: null,
    };
  }
  return {
    exists: true,
    requiredForOnboarding: row.requiredForOnboarding,
    currentStep: Math.min(4, Math.max(1, row.currentStep)),
    completed: !!row.completedAt,
    completedAt: row.completedAt?.toISOString() ?? null,
    unitSystem: row.unitSystem === "metric" || row.unitSystem === "imperial" ? row.unitSystem : null,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    age: row.age,
    goals: list(row.goals),
    interests: list(row.interests),
    experienceLevel: row.experienceLevel,
    activityLevel: row.activityLevel,
    selfReportedAbility: row.selfReportedAbility,
    movementLimitations: row.movementLimitations,
    routineDays: list(row.routineDays),
    preferredTime: row.preferredTime,
    workoutLocation: row.workoutLocation,
    equipment: list(row.equipment),
    dietPreference: row.dietPreference,
  };
}

async function ownSetup(userId: number): Promise<SetupRow | null> {
  const [row] = await db
    .select()
    .from(fitnessSetupTable)
    .where(eq(fitnessSetupTable.userId, userId));
  return row ?? null;
}

router.get("/fitness-setup", requireUser, async (req, res): Promise<void> => {
  await ensureFitnessSetupTable();
  res.json(GetFitnessSetupResponse.parse(response(await ownSetup(req.userId!))));
});

router.patch("/fitness-setup", requireUser, async (req, res): Promise<void> => {
  const parsed = SaveFitnessSetupStepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (
    !Number.isSafeInteger(parsed.data.step) ||
    (parsed.data.age != null && !Number.isSafeInteger(parsed.data.age))
  ) {
    res.status(400).json({ error: "Step and age must be whole numbers." });
    return;
  }
  await ensureFitnessSetupTable();
  const prior = await ownSetup(req.userId!);
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of ownStepFieldEntries(
    parsed.data.step as 1 | 2 | 3 | 4,
    parsed.data,
  )) {
    // JSON arrays are intentionally normalised before storage. Null is kept
    // for scalar optional/sensitive answers so a member can clear an answer.
    patch[key] = Array.isArray(value) ? list(value) : value;
  }

  try {
    // Canonical metric storage guards against precision drift from conversion
    // clients and means every consumer sees cm/kg irrespective of UI units.
    Object.assign(
      patch,
      canonicalMeasurements({
        unitSystem: parsed.data.unitSystem,
        priorUnitSystem: prior?.unitSystem,
        hasHeight: Object.prototype.hasOwnProperty.call(parsed.data, "height"),
        height: parsed.data.height,
        heightCm: parsed.data.heightCm,
        hasWeight: Object.prototype.hasOwnProperty.call(parsed.data, "weight"),
        weight: parsed.data.weight,
        weightKg: parsed.data.weightKg,
      }),
    );
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid measurements.",
    });
    return;
  }
  const nextStep = nextPersistedSetupStep(prior?.currentStep, parsed.data.step);
  patch.currentStep = nextStep;

  let row: SetupRow;
  if (prior) {
    const [updated] = await db
      .update(fitnessSetupTable)
      .set({
        ...patch,
        // Do not let an older device's late save move persisted resume
        // progress backwards after another device advanced it.
        currentStep: sql`greatest(${fitnessSetupTable.currentStep}, ${nextStep})`,
      })
      .where(eq(fitnessSetupTable.userId, req.userId!))
      .returning();
    row = updated;
  } else {
    // This is an explicit Profile edit by an existing member, not a retroactive
    // onboarding requirement. req.userId is the sole owner—body userId values
    // are neither accepted by the contract nor read here.
    const [created] = await db
      .insert(fitnessSetupTable)
      .values({
        userId: req.userId!,
        requiredForOnboarding: false,
        currentStep: nextStep,
        ...patch,
      })
      .returning();
    row = created;
  }
  res.json(SaveFitnessSetupStepResponse.parse(response(row)));
});

router.post(
  "/fitness-setup/complete",
  requireUser,
  async (req, res): Promise<void> => {
    await ensureFitnessSetupTable();
    const prior = await ownSetup(req.userId!);
    if (!prior) {
      // Optional Profile setup may be started later, but no old account is ever
      // forced into first-login onboarding merely by calling this endpoint.
      res.status(409).json({ error: "Save your starting profile before completing it." });
      return;
    }
    if (!prior.completedAt && !canCompleteFitnessSetup(prior)) {
      res.status(400).json({
        error: "Please add a valid age, height, and weight in Body basics before continuing.",
      });
      return;
    }
    const [row] = await db
      .update(fitnessSetupTable)
      .set({
        // One atomic statement preserves the original completion timestamp if
        // two final requests arrive together; stale reads cannot overwrite it.
        completedAt: sql`coalesce(${fitnessSetupTable.completedAt}, now())`,
        currentStep: 4,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(fitnessSetupTable.userId, req.userId!),
          or(
            isNotNull(fitnessSetupTable.completedAt),
            and(
              gte(fitnessSetupTable.age, 13),
              lte(fitnessSetupTable.age, 120),
              gte(fitnessSetupTable.heightCm, 80),
              lte(fitnessSetupTable.heightCm, 260),
              gte(fitnessSetupTable.weightKg, 20),
              lte(fitnessSetupTable.weightKg, 400),
            ),
          ),
        ),
      )
      .returning();
    if (!row) {
      // The row changed between validation and the update. Return a useful
      // validation error rather than completing an invalid profile.
      res.status(400).json({
        error: "Please add a valid age, height, and weight in Body basics before continuing.",
      });
      return;
    }
    // Deliberately do not touch users.assessmentCompletedAt or users.assessment:
    // this short self-reported setup is not a medical or staff assessment.
    res.json(CompleteFitnessSetupResponse.parse(response(row)));
  },
);

export default router;