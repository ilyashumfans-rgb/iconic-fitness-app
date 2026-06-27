import { Router, type IRouter } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  waterLogsTable,
  mealLogsTable,
  workoutLogsTable,
} from "@workspace/db";
import {
  AiChatBody,
  AiChatResponse,
  AiCoachBody,
  AiCoachResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import { computeHealthMetrics, deriveGoals, weightPlan } from "../lib/healthMetrics";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are the friendly AI assistant for Iconic Fitness, one of Bengaluru's leading fitness chains. Answer member and visitor questions clearly, warmly, and concisely. Only use the information below. If you don't know an answer, say so politely and suggest contacting the team on WhatsApp at +91 94800 00248. Do not invent prices, timings, or branches. Keep replies short and helpful. Do not use emojis.

ABOUT
Iconic Fitness is one of Bengaluru's leading fitness chains, offering premium gym facilities, certified personal training, group classes, and in-house diet consultations across 16+ branches in Bengaluru. The mission is to help members transform their fitness safely and effectively through expert coaching and a supportive community.

BRANCHES (all memberships give access to every location)
Koramangala (1st Block, ST Bed, 5th Block, 7th Block), BTM Layout & Thavarekere, Maruti Nagar, HSR Layout (Sector 2 & 7), Indiranagar (80 Feet Road), JP Nagar (7th Phase & Puttanahalli), Bellandur (Green Glen Layout & next to Centro Mall), Marathahalli, and Whitefield - Seegehalli.

OPERATING HOURS
Most branches: 5:00 AM to 11:00 PM. Some branches open until 12:00 AM. Open 7 days a week, all year round.

MEMBERSHIP PLANS (incl. taxes)
1 Month - Rs 3,540. 3 Months - Rs 7,260. 6 Months - Rs 8,999. 12 Months - Rs 17,999. Limited-time offer: 15 months for Rs 9,999 + taxes (limited slots only).

WHAT'S INCLUDED
Unlimited access to gym facilities across all branches, group classes (Zumba, HIIT, Yoga, Aerobics, Strength and more), locker & shower facilities, and a free diet consultation with the in-house dietician.

PERSONAL TRAINERS
Certified personal trainers are available at all branches. Personal training sessions and customised coaching packages are charged separately; ask your home branch for trainer rates and availability.

GROUP CLASS TIMINGS
Typical slots: Morning 7:00 AM - 8:00 AM and Evening 7:00 PM - 8:00 PM, Monday to Saturday. Beginner-friendly classes and trial sessions are available. Check the schedule in the app or at your branch.

DIETICIAN
The in-house dietician provides personalised meal plans for weight loss, muscle gain, performance goals, and general nutrition guidance. One diet consultation is included with membership; follow-up packages may be chargeable.

CANCELLATION, TRANSFER & PAUSE
Memberships are non-refundable. Transfers or pauses are allowed for valid reasons such as medical issues, relocation, or extended travel. Supporting documentation may be required; contact support to initiate a transfer or pause request.

HYGIENE & SAFETY
Regular sanitisation of equipment throughout the day, daily cleanliness checks for locker rooms and showers, first aid available at every branch, and daily fragrance and hygiene standards monitored by staff.

PAYMENT OPTIONS
We accept cash, cards, UPI, and online payments. For online payments, use the official payment link provided by staff at registration.

MOBILE APP
Yes, there is an Iconic Fitness mobile app to browse classes, view schedules, book sessions, and manage membership. Search "Iconic Fitness" on the Google Play Store or App Store, or ask staff for the direct download link.

EXPERIENCE
Iconic Fitness recently celebrated 7 years in the fitness industry, with steady growth across Bengaluru and expanding interest in franchise partnerships.

FRANCHISE OPPORTUNITIES
Iconic Fitness is open for franchise partnerships. For franchise queries, contact support@iconicfitnessindia.com or call +91 97429 00400 / +91 94800 00248.

CONTACT
For membership and general enquiries: call +91 70263 22322 (IVR), email support@iconicfitnessindia.com or iconicfitnessindia@gmail.com, or visit www.iconicfitnessindia.com. WhatsApp: +91 94800 00248.`;

router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = AiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ reply: "Sorry, I couldn't understand that request." });
    return;
  }

  if (
    !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
    !process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  ) {
    res.status(503).json(
      AiChatResponse.parse({
        reply:
          "The AI assistant isn't available right now. Please reach us on WhatsApp at +91 94800 00248 and we'll be happy to help.",
      }),
    );
    return;
  }

  try {
    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...parsed.data.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "Sorry, I didn't catch that. Could you rephrase?";

    res.json(AiChatResponse.parse({ reply }));
  } catch (err) {
    req.log.error({ err }, "AI chat request failed");
    res.status(502).json(
      AiChatResponse.parse({
        reply:
          "Something went wrong on our end. Please try again, or reach us on WhatsApp at +91 94800 00248.",
      }),
    );
  }
});

const COACH_SYSTEM_PROMPT = `You are "Coach", a warm, expert personal fitness coach inside the Iconic Fitness member app. You speak directly to one member.

Your job:
- Give personalized, practical, motivating fitness, nutrition, and habit advice.
- Use the member's live data below (profile, today's totals, goals, streak, recent activity) to ground every answer in their reality. Reference real numbers when relevant ("you're at 1.2L of your 3L water goal").
- Be encouraging but honest. Celebrate progress; gently nudge when they're behind.
- Keep replies concise and skimmable. Use short paragraphs or simple dashes for lists. Plain text only — no markdown headings, no emojis.
- When suggesting a workout or meals, be specific and realistic for a gym member in Bengaluru, India (Indian foods are great examples for nutrition).

ONBOARDING ASSESSMENT (do this FIRST when the member has not completed their assessment — see ASSESSMENT STATUS below):
- Your first goal with a new member is a friendly fitness assessment. Open by asking ONE clear question: are they new to the gym / just starting out, or already training regularly (experienced)? Adapt everything to their answer — gentle, foundational guidance for beginners; more advanced programming for experienced members.
- Then collect the rest conversationally, just a few questions at a time (never dump a long form, never ask everything at once). Cover, over several messages:
  - Personal: age, gender, height (cm), current weight (kg), target weight (kg), occupation, daily activity level (sedentary / light / moderate / active / very_active).
  - Health: any conditions (diabetes, blood pressure, thyroid, asthma, heart disease, joint pain), previous injuries, current medications, smoking, alcohol. Reassure them this only helps keep their plan safe and they can skip anything.
  - Goal: their main goal (weight loss, muscle gain, fat loss, body recomposition, strength, endurance, or general fitness).
  - Lifestyle: typical sleep hours, stress level (low / medium / high), food preference (veg / non-veg / vegan / eggetarian), whether they train at a gym or at home, and minutes available per workout.
- Acknowledge answers warmly as you go. Once you have enough, call the save_assessment tool with everything collected (omit anything they declined). Saving also calculates their health metrics and sets personalized daily goals automatically — do not make the member do math.
- After saving, present their results in plain language: BMI (with category), estimated body fat %, BMR, daily calorie target, protein and water targets, ideal weight range, and a fitness score.
- Use their HEIGHT and WEIGHT to tell them concretely what to do: whether they should lose, gain, or maintain weight, roughly how many kg, and a realistic timeframe at a safe pace (about 0.5 kg/week to lose, 0.25 kg/week to gain). Use the "Weight plan (from height & weight)" line in MEMBER DATA below as your basis — never recommend crash dieting or losing weight too fast. If they're already in the healthy range, focus on body composition (strength + recomposition) rather than the scale.
- Then give a short personalized starter plan that matches that weight direction: a weekly workout split, daily focus, cardio vs strength balance, meal direction (respecting their food preference), sleep and hydration targets, and rest days — realistic for their experience level and available time.
- If the member is NEW (just starting out / experience level "new"), warmly recommend they train with one of Iconic Fitness's certified personal trainers (PT) and encourage them to commit to at least one month of PT. Explain the benefit plainly: a PT teaches correct form, prevents injury, builds the right foundation and habits, and keeps them accountable so they see results faster in their first weeks. Suggest they ask the front desk at their branch or message the team on WhatsApp at +91 94800 00248 to set it up. Be encouraging, not pushy, and mention it once during onboarding (don't repeat it every message).
- Finally, tell them you'll check in daily, and suggest they switch on Daily Reminders in their Profile so they get nudges for water, meals, workouts, steps and sleep.

DAILY GUIDANCE (once the assessment is complete):
- Greet them and give a brief daily check-in grounded in today's numbers: what they've done and what's still pending toward each goal (water, calories, protein, steps, workout), plus their streak.
- Give ONE specific, actionable nudge for today (e.g. "you're 900ml short on water — have a glass now", or "great consistency — add 2.5kg to your squat next session"). Keep their weight plan (lose / gain / maintain, from the MEMBER DATA below) in mind so your nudges move them toward it.
- Gently remind them about any action they haven't done yet today.
- If MEMBER DATA shows the member is still in their first month as a NEW member, occasionally (not every day) encourage them to take personal training (PT) sessions for at least their first month to build correct form and habits — set it up via the front desk or WhatsApp +91 94800 00248.

Actions you can take (tools):
- save_assessment: save the member's assessment answers; this also auto-calculates their metrics and sets their goals. Use it once you've gathered their details during onboarding, or again whenever they want to redo or update their assessment.
- You can also update the member's tracker for them: log_water, log_meal, log_workout, and update_goals. All logs are saved for TODAY in the member's timezone.
- Only call a logging tool when the member clearly wants to record or change something ("I drank 500ml", "log my breakfast", "I ran 5km", "set my step goal to 10000"). Do not log on hypotheticals, plans, or questions.
- When the member describes food or a workout without exact numbers, estimate sensible values yourself (calories, protein, duration, steps) and log them — then tell them what you saved so they can correct it. Use realistic estimates for Indian foods.
- After saving, briefly confirm what you logged in plain language and how it moves them toward their goal. If a save fails, tell them honestly and suggest they log it manually in the app.
- If a request is ambiguous (e.g. amount or meal type unclear), make a reasonable assumption rather than refusing, and state the assumption.

Safety:
- You are not a doctor. For pain, injury, medical conditions, pregnancy, or medication questions, advise consulting a doctor or the in-house dietician/trainer at their branch.
- Never recommend extreme calorie restriction, crash diets, or unsafe training. Promote sustainable habits.`;

function istDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}
function dateNDaysAgo(n: number): string {
  return istDateStr(new Date(Date.now() - n * 86_400_000));
}

async function buildCoachContext(userId: number): Promise<string> {
  const today = dateNDaysAgo(0);
  const weekSince = dateNDaysAgo(6);
  const since90 = dateNDaysAgo(89);

  const [profileRows, waterRows, mealRows, workoutTodayRows, weekRows] =
    await Promise.all([
      db
        .select({
          name: usersTable.name,
          gender: usersTable.gender,
          age: usersTable.age,
          heightCm: usersTable.heightCm,
          weightKg: usersTable.weightKg,
          fitnessGoal: usersTable.fitnessGoal,
          waterGoalMl: usersTable.waterGoalMl,
          calorieGoal: usersTable.calorieGoal,
          proteinGoalG: usersTable.proteinGoalG,
          stepGoal: usersTable.stepGoal,
          weeklyGoal: usersTable.weeklyGoal,
          experienceLevel: usersTable.experienceLevel,
          targetWeightKg: usersTable.targetWeightKg,
          activityLevel: usersTable.activityLevel,
          foodPreference: usersTable.foodPreference,
          assessment: usersTable.assessment,
          assessmentCompletedAt: usersTable.assessmentCompletedAt,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId)),
      db
        .select({ ml: sql<number>`coalesce(sum(${waterLogsTable.amountMl}),0)::int` })
        .from(waterLogsTable)
        .where(
          and(eq(waterLogsTable.userId, userId), eq(waterLogsTable.loggedDate, today)),
        ),
      db
        .select({
          cals: sql<number>`coalesce(sum(${mealLogsTable.calories}),0)::int`,
          protein: sql<number>`coalesce(sum(${mealLogsTable.proteinG}),0)::int`,
          carbs: sql<number>`coalesce(sum(${mealLogsTable.carbsG}),0)::int`,
          fat: sql<number>`coalesce(sum(${mealLogsTable.fatG}),0)::int`,
        })
        .from(mealLogsTable)
        .where(
          and(eq(mealLogsTable.userId, userId), eq(mealLogsTable.loggedDate, today)),
        ),
      db
        .select({
          cals: sql<number>`coalesce(sum(${workoutLogsTable.calories}),0)::int`,
          steps: sql<number>`coalesce(sum(${workoutLogsTable.steps}),0)::int`,
          mins: sql<number>`coalesce(sum(${workoutLogsTable.durationMin}),0)::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(workoutLogsTable)
        .where(
          and(
            eq(workoutLogsTable.userId, userId),
            eq(workoutLogsTable.loggedDate, today),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(workoutLogsTable)
        .where(
          and(
            eq(workoutLogsTable.userId, userId),
            gte(workoutLogsTable.loggedDate, weekSince),
          ),
        ),
    ]);

  // Streak = consecutive IST days with any tracking activity (water / meal / workout).
  const [waterDays, mealDays, workoutDays] = await Promise.all([
    db
      .selectDistinct({ d: waterLogsTable.loggedDate })
      .from(waterLogsTable)
      .where(
        and(eq(waterLogsTable.userId, userId), gte(waterLogsTable.loggedDate, since90)),
      ),
    db
      .selectDistinct({ d: mealLogsTable.loggedDate })
      .from(mealLogsTable)
      .where(
        and(eq(mealLogsTable.userId, userId), gte(mealLogsTable.loggedDate, since90)),
      ),
    db
      .selectDistinct({ d: workoutLogsTable.loggedDate })
      .from(workoutLogsTable)
      .where(
        and(
          eq(workoutLogsTable.userId, userId),
          gte(workoutLogsTable.loggedDate, since90),
        ),
      ),
  ]);
  const active = new Set<string>();
  for (const r of [...waterDays, ...mealDays, ...workoutDays]) active.add(r.d);
  let streak = 0;
  let i = active.has(dateNDaysAgo(0)) ? 0 : 1;
  for (; i <= 90; i++) {
    if (active.has(dateNDaysAgo(i))) streak++;
    else break;
  }

  const p = profileRows[0];
  const water = waterRows[0];
  const meals = mealRows[0];
  const w = workoutTodayRows[0];
  const week = weekRows[0];

  const waterGoal = p?.waterGoalMl ?? 3000;
  const calorieGoal = p?.calorieGoal ?? 2200;
  const proteinGoal = p?.proteinGoalG ?? 120;
  const stepGoal = p?.stepGoal ?? 8000;
  const weeklyGoal = p?.weeklyGoal ?? 5;

  const metrics = computeHealthMetrics({
    heightCm: p?.heightCm ?? 0,
    weightKg: p?.weightKg ?? 0,
    age: p?.age ?? 0,
    gender: p?.gender ?? null,
    activityLevel: p?.activityLevel ?? null,
  });
  const weightRec = weightPlan({
    heightCm: p?.heightCm ?? 0,
    weightKg: p?.weightKg ?? 0,
    age: p?.age ?? 0,
    gender: p?.gender ?? null,
    activityLevel: p?.activityLevel ?? null,
    targetWeightKg: p?.targetWeightKg ?? null,
  });
  const assessmentDone = !!p?.assessmentCompletedAt;
  const daysSinceAssessment = assessmentDone
    ? Math.floor(
        (Date.now() -
          new Date(p!.assessmentCompletedAt as unknown as string).getTime()) /
          86_400_000,
      )
    : null;
  const isNewMember = (p?.experienceLevel ?? "").toLowerCase() === "new";
  const inFirstMonth =
    isNewMember && daysSinceAssessment != null && daysSinceAssessment < 30;

  return [
    "MEMBER DATA (live, in Asia/Kolkata time):",
    `Name: ${p?.name ?? "Member"}`,
    `Profile: ${p?.age ?? "?"} yrs, ${p?.gender ?? "?"}, ${p?.heightCm ?? "?"} cm, ${p?.weightKg ?? "?"} kg`,
    `Primary goal: ${p?.fitnessGoal ?? "general_fitness"}`,
    `ASSESSMENT STATUS: ${
      assessmentDone
        ? `COMPLETED on ${istDateStr(new Date(p!.assessmentCompletedAt as unknown as string))} — skip onboarding, give daily guidance.`
        : "NOT COMPLETED — run the onboarding assessment before anything else."
    }`,
    `Experience level: ${p?.experienceLevel ?? "unknown"}`,
    `Activity level: ${p?.activityLevel ?? "unknown"}`,
    `Food preference: ${p?.foodPreference ?? "unknown"}`,
    `Target weight: ${p?.targetWeightKg != null ? `${p.targetWeightKg} kg` : "not set"}`,
    p?.assessment
      ? `Assessment details: ${JSON.stringify(p.assessment).slice(0, 900)}`
      : null,
    metrics.bmi > 0
      ? `Health metrics: BMI ${metrics.bmi} (${metrics.bmiCategory}), body fat ~${metrics.bodyFatPct}%, BMR ${metrics.bmr} kcal, TDEE ${metrics.tdee} kcal, ideal weight ${metrics.idealWeightLowKg}-${metrics.idealWeightHighKg} kg, hydration target ${metrics.hydrationMl} ml`
      : "Health metrics: not enough profile data yet (need height, weight, age).",
    weightRec ? `Weight plan (from height & weight): ${weightRec.summary}` : null,
    inFirstMonth
      ? `New-member status: NEW member, ${daysSinceAssessment} day(s) in — still in their first month. Encourage a personal trainer (PT) for at least the first month.`
      : isNewMember
        ? "New-member status: NEW member, past their first month."
        : null,
    `Today's date: ${today}`,
    `Water today: ${water?.ml ?? 0} ml of ${waterGoal} ml goal`,
    `Calories eaten today: ${meals?.cals ?? 0} kcal of ${calorieGoal} kcal goal`,
    `Protein today: ${meals?.protein ?? 0} g of ${proteinGoal} g goal (carbs ${meals?.carbs ?? 0} g, fat ${meals?.fat ?? 0} g)`,
    `Workouts today: ${w?.count ?? 0} (${w?.mins ?? 0} min, ${w?.cals ?? 0} kcal burned, ${w?.steps ?? 0} steps of ${stepGoal} step goal)`,
    `This week: ${week?.count ?? 0} workouts of a ${weeklyGoal}/week goal`,
    `Current streak: ${streak} day(s)`,
  ]
    .filter(Boolean)
    .join("\n");
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const WORKOUT_TYPES = [
  "run",
  "walk",
  "strength",
  "cycling",
  "yoga",
  "hiit",
  "swim",
  "sports",
  "other",
] as const;

const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;
const EXPERIENCE_LEVELS = ["new", "experienced"] as const;
const STRESS_LEVELS = ["low", "medium", "high"] as const;
const FOOD_PREFERENCES = ["veg", "non-veg", "vegan", "eggetarian"] as const;
const WORKOUT_LOCATIONS = ["gym", "home"] as const;

// Tool/function definitions exposed to the model so it can write the member's tracker.
const COACH_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "save_assessment",
      description:
        "Save the member's fitness assessment answers. This also auto-calculates their health metrics (BMI, body fat, BMR, TDEE) and sets personalized daily goals. Call once you've gathered their details during onboarding, or again when they want to update it. Include only the fields you have.",
      parameters: {
        type: "object",
        properties: {
          experienceLevel: { type: "string", enum: ["new", "experienced"] },
          age: { type: "integer", description: "Age in years." },
          gender: { type: "string", description: "e.g. male, female, other." },
          heightCm: { type: "number", description: "Height in centimetres." },
          weightKg: { type: "number", description: "Current weight in kilograms." },
          targetWeightKg: { type: "number", description: "Goal weight in kilograms." },
          occupation: { type: "string" },
          activityLevel: {
            type: "string",
            enum: ["sedentary", "light", "moderate", "active", "very_active"],
          },
          fitnessGoal: {
            type: "string",
            description:
              "Main goal, e.g. weight loss, muscle gain, fat loss, body recomposition, strength, endurance, general fitness.",
          },
          sleepHours: { type: "number", description: "Typical hours of sleep per night." },
          stressLevel: { type: "string", enum: ["low", "medium", "high"] },
          foodPreference: {
            type: "string",
            enum: ["veg", "non-veg", "vegan", "eggetarian"],
          },
          workoutLocation: { type: "string", enum: ["gym", "home"] },
          availableWorkoutMin: {
            type: "integer",
            description: "Minutes available per workout session.",
          },
          healthConditions: {
            type: "array",
            items: { type: "string" },
            description:
              "Conditions/injuries, e.g. diabetes, blood pressure, thyroid, asthma, heart disease, joint pain.",
          },
          medications: { type: "string", description: "Current medications, if any." },
          smoking: { type: "boolean" },
          alcohol: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "log_water",
      description:
        "Log water the member drank today. Use when they mention drinking water.",
      parameters: {
        type: "object",
        properties: {
          amountMl: {
            type: "integer",
            description: "Amount of water in millilitres (e.g. 250 for a glass).",
          },
        },
        required: ["amountMl"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "log_meal",
      description:
        "Log a meal/snack the member ate today. Estimate calories and macros if not given.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short name of the food/meal." },
          mealType: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
          },
          calories: { type: "integer", description: "Estimated calories (kcal)." },
          proteinG: { type: "integer", description: "Estimated protein in grams." },
          carbsG: { type: "integer", description: "Estimated carbs in grams." },
          fatG: { type: "integer", description: "Estimated fat in grams." },
        },
        required: ["name", "mealType", "calories"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "log_workout",
      description:
        "Log a workout/activity the member did today. Estimate calories burned and steps if not given.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "run",
              "walk",
              "strength",
              "cycling",
              "yoga",
              "hiit",
              "swim",
              "sports",
              "other",
            ],
          },
          durationMin: { type: "integer", description: "Duration in minutes." },
          calories: { type: "integer", description: "Estimated calories burned." },
          steps: { type: "integer", description: "Steps taken, if relevant." },
        },
        required: ["type", "durationMin"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_goals",
      description:
        "Update one or more of the member's daily/weekly goals. Only include fields the member wants to change.",
      parameters: {
        type: "object",
        properties: {
          waterGoalMl: { type: "integer", description: "Daily water goal in ml." },
          calorieGoal: { type: "integer", description: "Daily calorie goal (kcal)." },
          proteinGoalG: { type: "integer", description: "Daily protein goal in grams." },
          stepGoal: { type: "integer", description: "Daily step goal." },
          weeklyGoal: { type: "integer", description: "Workouts per week goal." },
        },
      },
    },
  },
];

function clampInt(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampFloat(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(max, Math.max(min, n)) * 10) / 10;
}

function oneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] | null {
  const v = String(value ?? "").trim().toLowerCase();
  return (allowed as readonly string[]).includes(v) ? (v as T[number]) : null;
}

function strOrNull(value: unknown, max = 300): string | null {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, max) : null;
}

// Executes a single tool call against the authenticated member's own records.
async function runCoachTool(
  userId: number,
  name: string,
  rawArgs: string,
): Promise<{ ok: boolean; message: string }> {
  let args: Record<string, unknown>;
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { ok: false, message: "Invalid tool arguments." };
  }
  const today = dateNDaysAgo(0);
  try {
    switch (name) {
      case "log_water": {
        const amountMl = clampInt(args["amountMl"], 1, 10000);
        if (!amountMl) {
          return { ok: false, message: "amountMl must be a positive number." };
        }
        await db
          .insert(waterLogsTable)
          .values({ userId, loggedDate: today, amountMl });
        return { ok: true, message: `Logged ${amountMl} ml of water for today.` };
      }
      case "log_meal": {
        const mealType = MEAL_TYPES.includes(args["mealType"] as never)
          ? (args["mealType"] as (typeof MEAL_TYPES)[number])
          : "snack";
        const mealName = String(args["name"] ?? "").trim() || "Meal";
        const calories = clampInt(args["calories"], 0, 10000) ?? 0;
        const proteinG = clampInt(args["proteinG"], 0, 1000) ?? 0;
        const carbsG = clampInt(args["carbsG"], 0, 1000) ?? 0;
        const fatG = clampInt(args["fatG"], 0, 1000) ?? 0;
        await db.insert(mealLogsTable).values({
          userId,
          loggedDate: today,
          mealType,
          name: mealName,
          calories,
          proteinG,
          carbsG,
          fatG,
        });
        return {
          ok: true,
          message: `Logged ${mealName} as ${mealType}: ${calories} kcal, ${proteinG}g protein.`,
        };
      }
      case "log_workout": {
        const type = WORKOUT_TYPES.includes(args["type"] as never)
          ? (args["type"] as (typeof WORKOUT_TYPES)[number])
          : "other";
        const durationMin = clampInt(args["durationMin"], 0, 1440) ?? 0;
        const calories = clampInt(args["calories"], 0, 10000) ?? 0;
        const steps = clampInt(args["steps"], 0, 200000) ?? 0;
        if (durationMin <= 0 && steps <= 0) {
          return {
            ok: false,
            message: "Need a duration or steps to log a workout.",
          };
        }
        await db.insert(workoutLogsTable).values({
          userId,
          loggedDate: today,
          type,
          durationMin,
          calories,
          steps,
        });
        return {
          ok: true,
          message: `Logged a ${durationMin}-min ${type} workout: ${calories} kcal, ${steps} steps.`,
        };
      }
      case "update_goals": {
        const updates: Record<string, number> = {};
        const water = clampInt(args["waterGoalMl"], 250, 10000);
        const cal = clampInt(args["calorieGoal"], 800, 8000);
        const protein = clampInt(args["proteinGoalG"], 10, 400);
        const step = clampInt(args["stepGoal"], 1000, 50000);
        const weekly = clampInt(args["weeklyGoal"], 1, 14);
        if (water !== null) updates["waterGoalMl"] = water;
        if (cal !== null) updates["calorieGoal"] = cal;
        if (protein !== null) updates["proteinGoalG"] = protein;
        if (step !== null) updates["stepGoal"] = step;
        if (weekly !== null) updates["weeklyGoal"] = weekly;
        if (Object.keys(updates).length === 0) {
          return { ok: false, message: "No valid goal values provided." };
        }
        await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
        const summary = Object.entries(updates)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
        return { ok: true, message: `Updated goals: ${summary}.` };
      }
      case "save_assessment": {
        const [cur] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, userId));
        if (!cur) return { ok: false, message: "Member not found." };

        // Effective profile: prefer newly-provided values, fall back to existing.
        const heightCm = clampFloat(args["heightCm"], 80, 260) ?? cur.heightCm;
        const weightKg = clampFloat(args["weightKg"], 20, 400) ?? cur.weightKg;
        const age = clampInt(args["age"], 5, 120) ?? cur.age;
        const gender = strOrNull(args["gender"], 30) ?? cur.gender;
        const fitnessGoal = strOrNull(args["fitnessGoal"], 80) ?? cur.fitnessGoal;
        const experienceLevel =
          oneOf(args["experienceLevel"], EXPERIENCE_LEVELS) ??
          cur.experienceLevel ??
          null;
        const activityLevel =
          oneOf(args["activityLevel"], ACTIVITY_LEVELS) ?? cur.activityLevel ?? null;
        const foodPreference =
          oneOf(args["foodPreference"], FOOD_PREFERENCES) ??
          cur.foodPreference ??
          null;
        const targetWeightKg =
          clampFloat(args["targetWeightKg"], 20, 400) ?? cur.targetWeightKg ?? null;

        // Merge the lifestyle/health blob: only overwrite keys the model
        // actually provided this call, so a later partial save never wipes
        // details captured earlier in the conversation.
        const existingAssessment =
          cur.assessment &&
          typeof cur.assessment === "object" &&
          !Array.isArray(cur.assessment)
            ? (cur.assessment as Record<string, unknown>)
            : {};
        const provided: Record<string, unknown> = {};
        if ("occupation" in args)
          provided["occupation"] = strOrNull(args["occupation"], 120);
        if ("sleepHours" in args)
          provided["sleepHours"] = clampFloat(args["sleepHours"], 0, 24);
        if ("stressLevel" in args)
          provided["stressLevel"] = oneOf(args["stressLevel"], STRESS_LEVELS);
        if ("workoutLocation" in args)
          provided["workoutLocation"] = oneOf(
            args["workoutLocation"],
            WORKOUT_LOCATIONS,
          );
        if ("availableWorkoutMin" in args)
          provided["availableWorkoutMin"] = clampInt(
            args["availableWorkoutMin"],
            0,
            600,
          );
        if ("healthConditions" in args)
          provided["healthConditions"] = Array.isArray(args["healthConditions"])
            ? (args["healthConditions"] as unknown[])
                .map((c) => strOrNull(c, 80))
                .filter((c): c is string => !!c)
                .slice(0, 30)
            : [];
        if ("medications" in args)
          provided["medications"] = strOrNull(args["medications"], 300);
        if ("smoking" in args)
          provided["smoking"] =
            typeof args["smoking"] === "boolean" ? args["smoking"] : null;
        if ("alcohol" in args)
          provided["alcohol"] =
            typeof args["alcohol"] === "boolean" ? args["alcohol"] : null;
        const assessment = {
          ...existingAssessment,
          ...provided,
          updatedAt: new Date().toISOString(),
        };

        const goals = deriveGoals({
          heightCm,
          weightKg,
          age,
          gender,
          activityLevel,
          fitnessGoal,
          experienceLevel,
        });
        const metrics = computeHealthMetrics({
          heightCm,
          weightKg,
          age,
          gender,
          activityLevel,
        });

        // Only mark the assessment complete once the core profile is captured.
        // Once stamped, keep the original completion time.
        const missing = [
          experienceLevel == null && "experience level (new/experienced)",
          !(age > 0) && "age",
          !gender && "gender",
          !(heightCm > 0) && "height",
          !(weightKg > 0) && "weight",
          !fitnessGoal && "main goal",
        ].filter((m): m is string => !!m);
        const coreComplete = missing.length === 0;
        const assessmentCompletedAt =
          cur.assessmentCompletedAt ?? (coreComplete ? new Date() : null);

        await db
          .update(usersTable)
          .set({
            age,
            gender,
            heightCm,
            weightKg,
            fitnessGoal,
            experienceLevel,
            targetWeightKg,
            activityLevel,
            foodPreference,
            assessment,
            assessmentCompletedAt,
            ...goals,
          })
          .where(eq(usersTable.id, userId));

        if (!coreComplete) {
          return {
            ok: true,
            message:
              `Saved progress so far (experience: ${experienceLevel ?? "not set yet"}). ` +
              `Still missing before the assessment is complete: ${missing.join(", ")}. ` +
              `Keep gathering these from the member, then call save_assessment again. Do not present final metrics yet.`,
          };
        }

        return {
          ok: true,
          message:
            `Assessment saved (experience: ${experienceLevel ?? "unknown"}). ` +
            `Metrics: BMI ${metrics.bmi} (${metrics.bmiCategory}), body fat ~${metrics.bodyFatPct}%, ` +
            `BMR ${metrics.bmr} kcal, TDEE ${metrics.tdee} kcal, ideal weight ${metrics.idealWeightLowKg}-${metrics.idealWeightHighKg} kg. ` +
            `Goals set: ${goals.calorieGoal} kcal/day, ${goals.proteinGoalG} g protein, ${goals.waterGoalMl} ml water, ${goals.stepGoal} steps, ${goals.weeklyGoal} workouts/week. ` +
            `Now present these results to the member in plain language and give their personalized starter plan.`,
        };
      }
      default:
        return { ok: false, message: `Unknown tool: ${name}` };
    }
  } catch {
    return { ok: false, message: "Failed to save. Ask the member to try again." };
  }
}

router.post("/ai/coach", requireUser, async (req, res): Promise<void> => {
  const parsed = AiCoachBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json(AiCoachResponse.parse({ reply: "Sorry, I couldn't understand that." }));
    return;
  }

  if (
    !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
    !process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  ) {
    res.status(503).json(
      AiCoachResponse.parse({
        reply:
          "Your AI coach isn't available right now. Please try again in a little while.",
      }),
    );
    return;
  }

  try {
    const context = await buildCoachContext(req.userId!);
    const { openai } = await import("@workspace/integrations-openai-ai-server");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [
      { role: "system", content: `${COACH_SYSTEM_PROMPT}\n\n${context}` },
      ...parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let reply = "";
    // Tool-calling loop: let the model log/update the member's tracker, then reply.
    for (let turn = 0; turn < 5; turn++) {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 8192,
        tools: COACH_TOOLS,
        messages,
      });
      const message = completion.choices[0]?.message;
      if (!message) break;
      messages.push(message);

      const toolCalls = message.tool_calls ?? [];
      if (toolCalls.length === 0) {
        reply = message.content?.trim() ?? "";
        break;
      }

      for (const call of toolCalls) {
        if (call.type !== "function") continue;
        const result = await runCoachTool(
          req.userId!,
          call.function.name,
          call.function.arguments,
        );
        req.log.info(
          { tool: call.function.name, ok: result.ok },
          "AI coach tool call",
        );
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    if (!reply) reply = "Let's keep going — tell me a bit more and I'll help.";

    res.json(AiCoachResponse.parse({ reply }));
  } catch (err) {
    req.log.error({ err }, "AI coach request failed");
    res.status(502).json(
      AiCoachResponse.parse({
        reply: "Something went wrong on our end. Please try again in a moment.",
      }),
    );
  }
});

export default router;
