import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

const SOUND_KEYS = {
  members: "notificationSound.members",
  trainers: "notificationSound.trainers",
} as const;

type Audience = keyof typeof SOUND_KEYS;

async function readSound(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, key))
    .limit(1);
  return row?.value ?? null;
}

/**
 * Public: which custom notification sounds are configured. The mobile app
 * fetches this and plays the audio when a notification arrives; when a value
 * is null the app keeps the phone's default notification ringtone.
 */
router.get(
  "/settings/notification-sounds",
  async (_req: Request, res: Response) => {
    try {
      const [members, trainers] = await Promise.all([
        readSound(SOUND_KEYS.members),
        readSound(SOUND_KEYS.trainers),
      ]);
      res.json({ members, trainers });
    } catch (error) {
      res.status(500).json({ error: "Failed to load notification sounds" });
    }
  },
);

/** Admin: set or clear (url=null) the custom sound for an audience. */
router.put(
  "/admin/settings/notification-sounds",
  requireAdmin,
  async (req: Request, res: Response) => {
    const { audience, url } = (req.body ?? {}) as {
      audience?: string;
      url?: string | null;
    };
    if (audience !== "members" && audience !== "trainers") {
      res.status(400).json({ error: "audience must be 'members' or 'trainers'" });
      return;
    }
    if (url !== null && url !== undefined) {
      // Only accept our own DB-stored uploads — never arbitrary external URLs.
      if (typeof url !== "string" || !url.startsWith("/api/storage/db-images/")) {
        res.status(400).json({ error: "url must be an uploaded file path" });
        return;
      }
    }
    try {
      const key = SOUND_KEYS[audience as Audience];
      const value = url ?? null;
      await db
        .insert(appSettingsTable)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appSettingsTable.key,
          set: { value, updatedAt: new Date() },
        });
      const [members, trainers] = await Promise.all([
        readSound(SOUND_KEYS.members),
        readSound(SOUND_KEYS.trainers),
      ]);
      res.json({ members, trainers });
    } catch (error) {
      req.log.error({ err: error }, "Failed to save notification sound");
      res.status(500).json({ error: "Failed to save notification sound" });
    }
  },
);

export default router;
