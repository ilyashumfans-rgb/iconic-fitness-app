import { AccessToken } from "livekit-server-sdk";
import { PtCheckoutError } from "./ptTrainerPolicy";
import { joinWindowOpen, JOIN_LATE_MIN } from "./networkCoach";

/** Server-only LiveKit config. Values are read from process.env and never logged or returned (except the public ws URL). */
export function livekitConfig() {
  const url = (process.env.LIVEKIT_URL ?? "").trim();
  const apiKey = (process.env.LIVEKIT_API_KEY ?? "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET ?? "").trim();
  return url && apiKey && apiSecret ? { url, apiKey, apiSecret } : null;
}

export type Minter = (args: { identity: string; name: string; room: string; ttlSeconds: number }) => Promise<string>;
export const livekitMinter: Minter = async ({ identity, name, room, ttlSeconds }) => {
  const cfg = livekitConfig();
  if (!cfg) throw new PtCheckoutError(503, "Video calls are not configured yet.");
  const at = new AccessToken(cfg.apiKey, cfg.apiSecret, { identity, name, ttl: ttlSeconds });
  // Join-only grant for this ONE private room. No roomCreate/admin/record (egress) permissions.
  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: false, roomAdmin: false, roomRecord: false, roomList: false });
  return at.toJwt();
};

/** Authorize + mint a short-lived token for a paid booking inside its session window. */
export async function issueCallToken(
  booking: { id: number; status: string; starts_at: Date; ends_at: Date; room_name: string } | null,
  who: { identity: string; name: string },
  mint: Minter = livekitMinter,
  now = new Date(),
) {
  if (!booking) throw new PtCheckoutError(404, "Session not found.");
  if (booking.status !== "paid") throw new PtCheckoutError(409, booking.status === "completed" ? "This session is already completed." : "Only paid sessions can be joined.");
  const s = new Date(booking.starts_at), e = new Date(booking.ends_at);
  if (!joinWindowOpen(s, e, now)) throw new PtCheckoutError(403, "The call opens 10 minutes before your session starts.");
  const cfg = livekitConfig();
  if (!cfg && mint === livekitMinter) throw new PtCheckoutError(503, "Video calls are not configured yet.");
  // Short expiry: 10 minutes, never past the end of the join window (LiveKit only checks at connect time).
  const windowLeft = Math.floor((e.getTime() + JOIN_LATE_MIN * 60_000 - now.getTime()) / 1000);
  const ttlSeconds = Math.max(60, Math.min(600, windowLeft));
  const token = await mint({ identity: who.identity, name: who.name, room: booking.room_name, ttlSeconds });
  return { token, url: cfg?.url ?? "", roomName: booking.room_name, expiresInSeconds: ttlSeconds, endsAt: e.toISOString() };
}
