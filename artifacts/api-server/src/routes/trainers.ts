import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, trainersTable } from "@workspace/db";
import {
  ListTrainersQueryParams,
  ListTrainersResponse,
  ListLiveTrainersResponse,
  GetTrainerParams,
  GetTrainerResponse,
} from "@workspace/api-zod";
import { fetchYoactivTrainers, yoactivConfigured } from "../lib/yoactiv";

const router: IRouter = Router();

// NOTE: must be registered before /trainers/:trainerId so "live" isn't
// captured as a trainer id.
router.get("/trainers/live", async (_req, res): Promise<void> => {
  if (!yoactivConfigured()) {
    res.json(ListLiveTrainersResponse.parse([]));
    return;
  }
  const trainers = await fetchYoactivTrainers();
  res.json(ListLiveTrainersResponse.parse(trainers));
});

router.get("/trainers", async (req, res): Promise<void> => {
  const parsed = ListTrainersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let rows = await db.select().from(trainersTable);
  if (parsed.data.specialty)
    rows = rows.filter(
      (t) => t.specialty.toLowerCase() === parsed.data.specialty!.toLowerCase(),
    );
  res.json(ListTrainersResponse.parse(rows));
});

router.get("/trainers/:trainerId", async (req, res): Promise<void> => {
  const params = GetTrainerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [t] = await db
    .select()
    .from(trainersTable)
    .where(eq(trainersTable.id, params.data.trainerId));
  if (!t) {
    res.status(404).json({ error: "Trainer not found" });
    return;
  }
  res.json(GetTrainerResponse.parse(t));
});

export default router;
