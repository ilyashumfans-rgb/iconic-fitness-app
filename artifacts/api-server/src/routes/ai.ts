import { Router, type IRouter } from "express";
import { AiChatBody, AiChatResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are the friendly AI assistant for Iconic Fitness, one of Bengaluru's leading fitness chains. Answer member and visitor questions clearly, warmly, and concisely. Only use the information below. If you don't know an answer, say so politely and suggest contacting the team on WhatsApp at +91 94800 00248. Do not invent prices, timings, or branches. Keep replies short and helpful. Do not use emojis.

ABOUT
Iconic Fitness is one of Bengaluru's leading fitness chains, offering top-class gym facilities, personal training, group classes, and diet consultations. The goal is to help members transform their fitness journey safely and effectively. We have 16+ branches across Bengaluru.

BRANCHES (all memberships give access to every location)
Koramangala (1st, ST Bed, 5th, 7th Block), BTM Layout & Thavarekere, Maruti Nagar, HSR Layout (Sector 2 & 7), Indiranagar 80 Feet Road, JP Nagar (7th Phase & Puttanahalli), Bellandur (Green Glan Layout & next to Centro Mall), Marathahalli, Brookfield, and Whitefield - Seegehalli.

OPERATING HOURS
5:00 AM to 11:00 PM (some branches open till 12:00 AM). Open all 7 days, 365 days a year.

MEMBERSHIP PLANS (incl. taxes)
1 Month - Rs 3,540. 3 Months - Rs 7,260. 6 Months - Rs 8,999. 12 Months - Rs 17,999. Limited-time offer: 15 months for Rs 9,999 + taxes (limited slots only).

WHAT'S INCLUDED
Unlimited gym access, group classes (Zumba, HIIT, Yoga, Aerobics and more), locker & shower facilities, access to all branches, and a free diet consultation with the in-house dietician.

PERSONAL TRAINERS
Certified personal trainers are available at all branches. Personal training sessions are charged separately.

GROUP CLASS TIMINGS
Morning: 7:00 AM - 8:00 AM and Evening: 7:00 PM - 8:00 PM, Monday to Saturday. Beginner-friendly classes with trial sessions available.

DIETICIAN
An in-house dietician provides customized meal plans for weight loss, muscle gain, and fitness goals.

CONTACT
WhatsApp: +91 94800 00248.`;

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

export default router;
