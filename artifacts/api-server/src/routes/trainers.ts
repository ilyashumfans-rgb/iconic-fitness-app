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
import { resolvePtTrainerRoster } from "../lib/ptTrainerResolver";
import { PtCheckoutError } from "../lib/ptTrainerPolicy";
import { trainerPhotoMap } from "../lib/trainerPhotos";
import { microCache } from "../lib/microCache";
import { liveTrainerProfile, trainerBranch, trainerProfileMap } from "../lib/liveTrainerProfiles";

const router: IRouter = Router();

// 30s micro-cache: trainer rosters are public and identical for everyone.
const TRAINERS_TTL_MS = 30_000;

router.get("/trainers/live/:trainerId", async (req, res) => {
  try {
    res.json(await liveTrainerProfile(trainerBranch(req.query.gymId), String(req.params.trainerId)));
  } catch (error) {
    if (!(error instanceof PtCheckoutError)) throw error;
    res.status(error.status).json({ error: error.message });
  }
});

// NOTE: must be registered before /trainers/:trainerId so "live" isn't
// captured as a trainer id.
router.get("/trainers/live", microCache(TRAINERS_TTL_MS), async (req, res): Promise<void> => {
  const parsed = ListLiveTrainersQueryParams.safeParse(req.query);
  if (!parsed.success || parsed.data.gymId === undefined) {
    // A mobile roster without a selected branch must never aggregate trainers
    // from every configured YoActiv branch.
    res.json(ListLiveTrainersResponse.parse([]));
    return;
  }
  try {
    const visibleTrainers = await resolvePtTrainerRoster(parsed.data.gymId);
    const photos = await trainerPhotoMap(visibleTrainers.map((t) => t.id));
    const profiles = await trainerProfileMap(parsed.data.gymId, visibleTrainers.map(t => t.id));
    res.json(
      ListLiveTrainersResponse.parse(
        visibleTrainers.map((t) => ({
          id: t.id,
          name: t.name,
          photoUrl: profiles.get(t.id)?.photoUrl || photos.get(t.id) || null,
        })),
      ),
    );
  } catch (error) {
    if (!(error instanceof PtCheckoutError)) throw error;
    res.status(error.status).json({ error: error.message });
  }
});

router.get("/trainers", microCache(TRAINERS_TTL_MS), async (req, res): Promise<void> => {
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
