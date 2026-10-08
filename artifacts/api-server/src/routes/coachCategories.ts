import { Router, type RequestHandler } from "express";
import { requireAdmin } from "../lib/adminAuth";
import { PtCheckoutError } from "../lib/ptTrainerPolicy";
import { resolvePtTrainerRoster } from "../lib/ptTrainerResolver";
import { trainerPhotoMap } from "../lib/trainerPhotos";
import { trainerBranch, trainerProfileMap, verifiedTrainer } from "../lib/liveTrainerProfiles";
import {
  assignedRoster, assignmentInput, categoryId, coachCategoryInput, createCategory, deleteCategory,
  getAssignment, getCategory, listCategories, reorderCategories, setAssignment, updateCategory,
} from "../lib/coachCategories";
import { z } from "zod";

const handle = (fn: RequestHandler): RequestHandler => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (error) {
    if (error instanceof PtCheckoutError) { res.status(error.status).json({ error: error.message }); return; }
    next(error);
  }
};
const bad = (res: Parameters<RequestHandler>[1], error: z.ZodError) =>
  res.status(400).json({ error: error.issues[0]?.message ?? "Invalid input" });

export function createCoachCategoriesRouter(deps: {
  roster?: typeof resolvePtTrainerRoster;
  verifyTrainer?: (gymId: number, trainerId: string) => Promise<unknown>;
  photos?: typeof trainerPhotoMap;
  profiles?: typeof trainerProfileMap;
} = {}) {
  const router = Router();
  const roster = deps.roster ?? resolvePtTrainerRoster;
  const verify = deps.verifyTrainer ?? verifiedTrainer;
  const photos = deps.photos ?? trainerPhotoMap;
  const profiles = deps.profiles ?? trainerProfileMap;

  router.get("/coach-categories", handle(async (req, res) => {
    const gymId = trainerBranch(req.query.gymId);
    const [categories, trainers] = await Promise.all([listCategories(), assignedRoster(gymId, roster)]);
    res.setHeader("Cache-Control", "no-store");
    res.json(categories.filter(c => c.published).map(c => ({
      ...c, coachCount: trainers.filter(t => t.categoryIds.includes(c.id)).length,
    })));
  }));
  router.get("/coach-categories/:categoryId/trainers", handle(async (req, res) => {
    const gymId = trainerBranch(req.query.gymId);
    const id = categoryId(req.params.categoryId);
    const category = await getCategory(id);
    if (!category || !category.published) throw new PtCheckoutError(404, "Category not found.");
    const trainers = (await assignedRoster(gymId, roster)).filter(t => t.categoryIds.includes(id));
    const ids = trainers.map(t => t.id);
    const [photoMap, profileMap] = await Promise.all([photos(ids), profiles(gymId, ids)]);
    res.setHeader("Cache-Control", "no-store");
    res.json(trainers.map(t => ({ id: t.id, name: t.name, photoUrl: profileMap.get(t.id)?.photoUrl || photoMap.get(t.id) || null })));
  }));

  router.get("/admin/coach-categories", requireAdmin, handle(async (_req, res) => { res.json(await listCategories()); }));
  router.post("/admin/coach-categories", requireAdmin, handle(async (req, res) => {
    const parsed = coachCategoryInput.safeParse(req.body);
    if (!parsed.success) { bad(res, parsed.error); return; }
    res.status(201).json(await createCategory(parsed.data));
  }));
  router.post("/admin/coach-categories/reorder", requireAdmin, handle(async (req, res) => {
    const parsed = z.object({ ids: z.array(z.string().min(1).max(64)).max(200) }).strict().safeParse(req.body);
    if (!parsed.success) { bad(res, parsed.error); return; }
    res.json(await reorderCategories(parsed.data.ids));
  }));
  router.put("/admin/coach-categories/:categoryId", requireAdmin, handle(async (req, res) => {
    const parsed = coachCategoryInput.safeParse(req.body);
    if (!parsed.success) { bad(res, parsed.error); return; }
    res.json(await updateCategory(categoryId(req.params.categoryId), parsed.data));
  }));
  router.delete("/admin/coach-categories/:categoryId", requireAdmin, handle(async (req, res) => {
    await deleteCategory(categoryId(req.params.categoryId));
    res.status(204).end();
  }));
  router.get("/admin/trainers/live/:trainerId/categories", requireAdmin, handle(async (req, res) => {
    const gymId = trainerBranch(req.query.gymId);
    const trainerId = String(req.params.trainerId);
    await verify(gymId, trainerId);
    res.json(await getAssignment(gymId, trainerId));
  }));
  router.put("/admin/trainers/live/:trainerId/categories", requireAdmin, handle(async (req, res) => {
    const parsed = assignmentInput.safeParse(req.body);
    if (!parsed.success) { bad(res, parsed.error); return; }
    const gymId = trainerBranch(req.query.gymId);
    const trainerId = String(req.params.trainerId);
    await verify(gymId, trainerId);
    res.json(await setAssignment(gymId, trainerId, parsed.data.categoryIds));
  }));
  return router;
}
export default createCoachCategoriesRouter();
