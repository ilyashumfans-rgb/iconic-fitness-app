import { useEffect, useState } from "react";
import { Link } from "wouter";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { MemberJourneyWorkspace } from "@/components/MemberJourneyWorkspace";
import { agencyApi } from "@/lib/agencyApi";

export function StaffMemberJourney() {
  return <StaffLayout title="Member Journey"><MemberJourneyWorkspace portal="staff" /></StaffLayout>;
}
export function PartnerMemberJourney() {
  return <PartnerLayout title="Member Journey"><MemberJourneyWorkspace portal="partner" /></PartnerLayout>;
}
export function AgencyMemberJourney() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const authenticate = () => {
    setState("loading");
    agencyApi.me().then(() => setState("ready")).catch(e => {setError(e.message); setState("error");});
  };
  useEffect(authenticate, []);
  return <div className="min-h-screen bg-lime-50/40 text-slate-900"><header className="border-b bg-white p-4"><nav className="mx-auto flex max-w-6xl flex-wrap gap-5"><strong>Agency Portal</strong><Link data-testid="link-agency-dashboard" href="/agency">Dashboard</Link><Link data-testid="link-agency-journey" href="/agency/member-journey">Member Journey</Link></nav></header><main className="mx-auto max-w-6xl p-4 sm:p-6">
    {state === "loading" ? <p>Checking agency access…</p> : state === "error" ? <div role="alert"><p>{error}</p><button data-testid="button-agency-auth-retry" onClick={authenticate}>Retry</button><Link data-testid="link-agency-login" className="ml-4 underline" href="/agency/login">Sign in</Link></div> : <MemberJourneyWorkspace portal="agency" />}
  </main></div>;
}