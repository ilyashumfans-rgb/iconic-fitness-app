import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, walletsTable, walletTransactionsTable } from "@workspace/db";
import { GetWalletResponse } from "@workspace/api-zod";
import { CURRENT_USER_ID } from "../lib/currentUser";

const router: IRouter = Router();

router.get("/wallet", async (_req, res): Promise<void> => {
  const [w] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, CURRENT_USER_ID));
  const txns = await db
    .select()
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.userId, CURRENT_USER_ID))
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
