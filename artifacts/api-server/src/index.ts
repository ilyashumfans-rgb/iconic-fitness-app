import app from "./app";
import { logger } from "./lib/logger";
import { ensureSessionTable } from "./lib/adminAuth";
import { ensureStoreColumns } from "./routes/store";
import { ensureCommunityTables } from "./routes/community";
import { ensureWhatsappOtpTables } from "./lib/whatsappOtpSchema";
import { ensureComplaintsSchema } from "./lib/complaintsSchema";
import { pool } from "@workspace/db";
import { ensureSchemaAdditions } from "./lib/schemaAdditions";
import { ensureNetworkCoachSchema } from "./lib/networkCoachSchema";
import { migrateNetworkPricingOnce } from "./lib/networkCoach";
import { migrateNetworkCapabilityOnce } from "./lib/coachCategories";
import { checkSchemaCompatibility } from "./lib/schemaCompatibility";
import { startRenewalScheduler } from "./lib/renewalStore";
import { startNetworkCoachReminderScheduler } from "./lib/networkCoachReminders";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main(): Promise<void> {
  await ensureSessionTable();
  await ensureWhatsappOtpTables();
  try {
    await ensureComplaintsSchema();
  } catch (err) {
    logger.error({ err }, "Could not ensure complaints schema");
    throw err;
  }
  // Additive store columns (payment + GST/shipping) must exist before any
  // route selects from products/product_orders — run before listen so a
  // freshly published database self-migrates ahead of the first request.
  try {
    await ensureStoreColumns();
  } catch (err) {
    logger.error({ err }, "Could not ensure store columns");
    throw err;
  }
  try {
    await ensureCommunityTables();
  } catch (err) {
    logger.error({ err }, "Could not ensure community tables");
    throw err;
  }

  await ensureSchemaAdditions(pool);
  await ensureNetworkCoachSchema(pool);
  await migrateNetworkCapabilityOnce();
  await migrateNetworkPricingOnce();
  const schemaIssues = await checkSchemaCompatibility(pool);
  if (schemaIssues.length) {
    throw new Error(`Database schema incompatible; refusing API traffic:\n${schemaIssues.join("\n")}`);
  }

  startRenewalScheduler();
  startNetworkCoachReminderScheduler();
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal error during server startup");
  process.exit(1);
});
