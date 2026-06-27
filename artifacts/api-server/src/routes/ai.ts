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
- Use the member's live data below (today's totals, goals, streak, recent activity) to ground every answer in their reality. Reference real numbers when relevant ("you're at 1.2L of your 3L water goal").
- Be encouraging but honest. Celebrate progress; gently nudge when they're behind.
- Keep replies concise and skimmable. Use short paragraphs or simple dashes for lists. Plain text only — no markdown headings, no emojis.
- When suggesting a workout or meals, be specific and realistic for a gym member in Bengaluru, India (Indian foods are great examples for nutrition).

Safety:
- You are not a doctor. For pain, injury, medical conditions, pregnancy, or medication questions, advise consulting a doctor or the in-house dietician/trainer at their branch.
- Never recommend extreme calorie restriction, crash diets, or unsafe training. Promote sustainable habits.

If the member has logged little or no data yet, encourage them to start logging water, meals, and workouts so you can coach them better.`;

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

  return [
    "MEMBER DATA (live, in Asia/Kolkata time):",
    `Name: ${p?.name ?? "Member"}`,
    `Profile: ${p?.age ?? "?"} yrs, ${p?.gender ?? "?"}, ${p?.heightCm ?? "?"} cm, ${p?.weightKg ?? "?"} kg`,
    `Primary goal: ${p?.fitnessGoal ?? "general_fitness"}`,
    `Today's date: ${today}`,
    `Water today: ${water?.ml ?? 0} ml of ${waterGoal} ml goal`,
    `Calories eaten today: ${meals?.cals ?? 0} kcal of ${calorieGoal} kcal goal`,
    `Protein today: ${meals?.protein ?? 0} g of ${proteinGoal} g goal (carbs ${meals?.carbs ?? 0} g, fat ${meals?.fat ?? 0} g)`,
    `Workouts today: ${w?.count ?? 0} (${w?.mins ?? 0} min, ${w?.cals ?? 0} kcal burned, ${w?.steps ?? 0} steps of ${stepGoal} step goal)`,
    `This week: ${week?.count ?? 0} workouts of a ${weeklyGoal}/week goal`,
    `Current streak: ${streak} day(s)`,
  ].join("\n");
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
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: `${COACH_SYSTEM_PROMPT}\n\n${context}` },
        ...parsed.data.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "Let's keep going — tell me a bit more and I'll help.";

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
