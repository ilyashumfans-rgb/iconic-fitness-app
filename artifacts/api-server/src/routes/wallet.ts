import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, walletsTable, walletTransactionsTable } from "@workspace/db";
import { GetWalletResponse } from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";

const router: IRouter = Router();

router.get("/wallet", requireUser, async (req, res): Promise<void> => {
  const [w] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, req.userId!));
  const txns = await db
    .select()
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.userId, req.userId!))
    .orderBy(desc(walletTransactionsTable.createdAt))
    .limit(20);
  res.json(
    GetWalletResponse.parse({
      balanceInr: w?.balanceInr ?? 0,
      rewardPoints: w?.rewardPoints ?? 0,
      transactions: txns,
    }),
  );
});

export default router;
