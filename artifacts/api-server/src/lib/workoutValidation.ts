import { AddWorkoutBody } from "@workspace/api-zod";

// Keep cross-field validation shared by create and replacement update.
export const workoutInputSchema = AddWorkoutBody.superRefine((value, ctx) => {
  // Orval emits z.number() for OpenAPI integers; enforce storage-safe integers here.
  for (const field of ["durationMin", "calories", "steps", "sets", "reps"] as const) {
    if (value[field] != null && !Number.isSafeInteger(value[field])) {
      ctx.addIssue({ code: "custom", path: [field], message: "Must be a whole number" });
    }
  }
  if (value.exerciseName != null && !value.exerciseName.trim()) {
    ctx.addIssue({ code: "custom", path: ["exerciseName"], message: "Exercise name cannot be blank" });
  }
}).transform((value) => ({
  ...value,
  exerciseName: value.exerciseName?.trim() || null,
  sets: value.sets ?? null,
  reps: value.reps ?? null,
})).superRefine((value, ctx) => {
  const complete = value.exerciseName !== null && value.sets !== null && value.reps !== null;
  const any = value.exerciseName !== null || value.sets !== null || value.reps !== null;
  if (any && !complete) {
    ctx.addIssue({ code: "custom", message: "Exercise name, sets and reps must be provided together" });
  }
  if (value.durationMin <= 0 && !complete) {
    ctx.addIssue({ code: "custom", message: "Enter positive duration or an exercise with sets and reps" });
  }
});