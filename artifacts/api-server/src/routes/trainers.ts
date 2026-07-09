import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, trainersTable } from "@workspace/db";
import {
  ListTrainersQueryParams,
  ListTrainersResponse,
  ListLiveTrainersQueryParams,
  ListLiveTrainersResponse,
  GetTrainerParams,
  GetTrainerResponse,
} from "@workspace/api-zod";
import { gymsTable } from "@workspace/db";
import { fetchYoactivTrainers, yoactivConfigured } from "../lib/yoactiv";

const router: IRouter = Router();

// NOTE: must be registered before /trainers/:trainerId so "live" isn't
// captured as a trainer id.
router.get("/trainers/live", async (req, res): Promise<void> => {
  if (!yoactivConfigured()) {
    res.json(ListLiveTrainersResponse.parse([]));
    return;
  }
  const parsed = ListLiveTrainersQueryParams.safeParse(req.query);
  let branchId: number | undefined;
  if (parsed.success && parsed.data.gymId !== undefined) {
    const [gym] = await db
      .select({ yoactivBranchId: gymsTable.yoactivBranchId })
      .from(gymsTable)
      .where(eq(gymsTable.id, parsed.data.gymId));
    // A gym without a branch mapping has no live roster — the app then shows
    // the local trainer profiles instead of another branch's coaches.
    if (!gym?.yoactivBranchId) {
      res.json(ListLiveTrainersResponse.parse([]));
      return;
    }
    branchId = gym.yoactivBranchId;
  }
  const trainers = await fetchYoactivTrainers(branchId);
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
