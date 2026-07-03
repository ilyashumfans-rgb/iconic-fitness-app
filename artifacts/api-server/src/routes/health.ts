import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Deliberately dependency-free: no DB, no session, no Zod parse. This is the
// deployment startup probe (see artifact.toml health.startup path) — it must
// always return 200 as long as the process is up, or the deploy won't promote.
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
