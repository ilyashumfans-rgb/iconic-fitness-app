import { db, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./adminAuth";
import { logger } from "./logger";

const DEFAULT_EMAIL = "admin@gymco.in";
const DEFAULT_PASSWORD = "gymco@admin";

export async function seedDefaultAdmin(): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.email, DEFAULT_EMAIL))
      .limit(1);
    if (existing.length > 0) return;
    const passwordHash = await hashPassword(DEFAULT_PASSWORD);
    await db.insert(adminsTable).values({
      email: DEFAULT_EMAIL,
      passwordHash,
      name: "GYMCO Admin",
      role: "superadmin",
    });
    logger.info(
      { email: DEFAULT_EMAIL },
      "Seeded default admin account (rotate password after first login).",
    );
  } catch (err) {
    logger.warn({ err }, "Failed to seed default admin");
  }
}
