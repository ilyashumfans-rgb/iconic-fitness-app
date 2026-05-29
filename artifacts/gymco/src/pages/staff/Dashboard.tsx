import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  UserPlus,
  Users as UsersIcon,
  KeyRound,
  FileText,
  Building2,
} from "lucide-react";
import { StaffLayout, StaffCard } from "@/components/staff/StaffLayout";
import { staffApi, type StaffUser, PERMISSION_LABELS } from "@/lib/staffApi";

const TILES = [
  {
    perm: "partner.onboard",
    href: "/staff/partner-onboarding",
    label: "Partner Onboarding",
    desc: "Create new partner gym or vendor accounts.",
    icon: <UserPlus className="h-6 w-6" />,
  },
  {
    perm: "partner.view",
    href: "/staff/partners",
    label: "View Partners",
    desc: "Browse and look up partner accounts.",
    icon: <UsersIcon className="h-6 w-6" />,
  },
  {
    perm: "partner.document_upload",
    href: "/staff/partner-documents",
    label: "Partner Documents",
    desc: "Upload contracts, KYC and other docs to a partner.",
    icon: <FileText className="h-6 w-6" />,
  },
  {
    perm: "partner.assign_login",
    href: "/staff/reset-partner-password",
    label: "Reset Partner Password",
    desc: "Issue a new login password to a partner.",
    icon: <KeyRound className="h-6 w-6" />,
  },
  {
    perm: "gym.manage",
    href: "/staff/gym-management",
    label: "Gym Management",
    desc: "Edit any partner gym — details, pricing, and map location.",
    icon: <Building2 className="h-6 w-6" />,
  },
];

export default function StaffDashboard() {
  const [me, setMe] = useState<StaffUser | null>(null);
  useEffect(() => {
    staffApi.me().then(setMe).catch(() => {});
  }, []);

  const allowed = me ? TILES.filter((t) => me.permissions.includes(t.perm)) : [];

  return (
    <StaffLayout title="Dashboard">
      <div className="mb-6">
        <p className="text-sm text-slate-500">
          Welcome{me ? `, ${me.name}` : ""}. Here's what you have access to.
        </p>
      </div>
      {allowed.length === 0 ? (
        <StaffCard className="p-8 max-w-xl">
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            No features assigned yet
          </h2>
          <p className="text-sm text-slate-500">
            Ask an admin to grant you permissions in the Admin → Staff
            Management panel.
          </p>
        </StaffCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allowed.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group"
            >
              <StaffCard className="p-5 hover:border-orange-500/50 transition-colors h-full">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-400/10 border border-orange-200 text-orange-700 flex items-center justify-center mb-4">
                  {t.icon}
                </div>
                <div className="text-base font-bold text-slate-900 mb-1">
                  {t.label}
                </div>
                <div className="text-xs text-slate-500">{t.desc}</div>
              </StaffCard>
            </Link>
          ))}
        </div>
      )}

      {me && me.permissions.length > 0 && (
        <div className="mt-8">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
            Your permissions
          </div>
          <div className="flex flex-wrap gap-1.5">
            {me.permissions.map((p) => (
              <span
                key={p}
                className="text-[11px] px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200"
              >
                {PERMISSION_LABELS[p] ?? p}
              </span>
            ))}
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
