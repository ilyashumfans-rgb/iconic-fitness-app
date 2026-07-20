import { websiteUrl } from "@/lib/links";

export type LeadKind = "class" | "gym" | "general" | "membership";

export type LeadPayload = {
  kind: LeadKind;
  name: string;
  phone: string;
  email?: string;
  preferredDate: string;
  preferredTime: string;
  message?: string;
  gymId?: number | null;
  gymName?: string;
  /** For PT-session enquiries this carries the coach's name. */
  className?: string;
  source?: string;
};

/** Submit an enquiry/lead to the public GYMCO leads endpoint (no auth required). */
export async function submitLead(payload: LeadPayload): Promise<void> {
  const res = await fetch(`${websiteUrl}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = "Could not send your request. Please try again.";
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) msg = data.error;
    } catch {
      // Keep the default message if the error body isn't JSON.
    }
    throw new Error(msg);
  }
}
