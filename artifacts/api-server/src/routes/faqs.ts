import { Router, type IRouter, type Request, type Response } from "express";
import { asc, eq, sql } from "drizzle-orm";
import { db, faqsTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

function cleanStr(value: unknown, max = 4000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

// Public — active FAQs for the apps (mobile + web). Also the AI assistant's
// knowledge source, so anything staff add here immediately "teaches" the AI.
router.get("/faqs", async (_req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(faqsTable)
    .where(eq(faqsTable.isActive, true))
    .orderBy(asc(faqsTable.sortOrder), asc(faqsTable.id));
  res.json(
    rows.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      category: r.category,
    })),
  );
});

// Admin — full list including inactive rows.
router.get("/admin/faqs", requireAdmin, async (_req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(faqsTable)
    .orderBy(asc(faqsTable.sortOrder), asc(faqsTable.id));
  res.json(rows);
});

router.post("/admin/faqs", requireAdmin, async (req: Request, res: Response) => {
  const question = cleanStr(req.body?.question, 500);
  const answer = cleanStr(req.body?.answer);
  if (!question || !answer) {
    res.status(400).json({ error: "Both question and answer are required" });
    return;
  }
  const category = cleanStr(req.body?.category, 100) || "General";
  const sortOrder = Number.isFinite(Number(req.body?.sortOrder))
    ? Number(req.body?.sortOrder)
    : 0;
  const isActive = req.body?.isActive === false ? false : true;
  const [row] = await db
    .insert(faqsTable)
    .values({ question, answer, category, sortOrder, isActive })
    .returning();
  res.status(201).json(row);
});

router.put(
  "/admin/faqs/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const question = cleanStr(req.body?.question, 500);
    const answer = cleanStr(req.body?.answer);
    if (!question || !answer) {
      res.status(400).json({ error: "Both question and answer are required" });
      return;
    }
    const category = cleanStr(req.body?.category, 100) || "General";
    const sortOrder = Number.isFinite(Number(req.body?.sortOrder))
      ? Number(req.body?.sortOrder)
      : 0;
    const isActive = req.body?.isActive === false ? false : true;
    const [row] = await db
      .update(faqsTable)
      .set({
        question,
        answer,
        category,
        sortOrder,
        isActive,
        updatedAt: sql`now()`,
      })
      .where(eq(faqsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "FAQ not found" });
      return;
    }
    res.json(row);
  },
);

router.delete(
  "/admin/faqs/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(faqsTable).where(eq(faqsTable.id, id));
    res.json({ ok: true });
  },
);

export default router;
