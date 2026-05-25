import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import dashboardRouter from "./dashboard";
import gymsRouter from "./gyms";
import classesRouter from "./classes";
import membershipsRouter from "./memberships";
import bookingsRouter from "./bookings";
import checkinsRouter from "./checkins";
import trainersRouter from "./trainers";
import walletRouter from "./wallet";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(dashboardRouter);
router.use(gymsRouter);
router.use(classesRouter);
router.use(membershipsRouter);
router.use(bookingsRouter);
router.use(checkinsRouter);
router.use(trainersRouter);
router.use(walletRouter);
router.use(adminRouter);

export default router;
