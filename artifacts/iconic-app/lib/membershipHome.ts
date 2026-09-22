import type { MyMembership } from "@workspace/api-client-react";
import { istDateStr } from "@/lib/dates";

export function membershipGreeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23",
  }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export function canCheckInAtHome(membership: MyMembership, now: Date): boolean {
  if (membership.status !== "active" || !membership.homeGymId || membership.homeGymId <= 0) return false;
  if (membership.expiryKnown === false) return false;
  const expiry = new Date(membership.renewsOn);
  return Number.isFinite(expiry.getTime()) && istDateStr(expiry) >= istDateStr(now);
}