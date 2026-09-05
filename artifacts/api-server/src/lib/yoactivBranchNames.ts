// Human-readable names for YoActiv branch IDs (from the YoActiv backstage
// branch list). Used to label branch pickers in the admin UI so admins can
// tell which physical studio an ID refers to. IDs not listed here (e.g. the
// second key's branch set) fall back to "Branch <id>" until names are added.
export const YOACTIV_BRANCH_NAMES: Record<number, string> = {
  5431: "1st Block Koramangala",
  5472: "HSR Layout",
  5489: "BTM Layout",
  5695: "4th Block Koramangala",
  5812: "Seegehalli",
  5838: "5th Block Koramangala",
  5915: "BTM 1st Stage",
  6175: "7th Block Koramangala",
  6319: "HSR Layout Sector 7",
  6351: "JP Nagar 7th Phase",
  6487: "Bellandur",
  6556: "Indiranagar",
  6664: "Bellandur Centro",
  6729: "Puttenahalli",
  7415: "Marathahalli",
  7697: "Corporate Koramangala",
  7727: "Brookefield",
  // PT Sales branch set (second YoActiv account — same studios, PT billing).
  6793: "1st Block Koramangala (PT Sales)",
  6794: "HSR Layout (PT Sales)",
  6795: "BTM Layout (PT Sales)",
  6796: "4th Block Koramangala (PT Sales)",
  6797: "5th Block Koramangala (PT Sales)",
  6798: "BTM 1st Stage (PT Sales)",
  6799: "7th Block Koramangala (PT Sales)",
  6800: "HSR Layout Sector 7 (PT Sales)",
  6801: "JP Nagar 7th Phase (PT Sales)",
  6802: "Bellandur (PT Sales)",
  6803: "Indiranagar (PT Sales)",
  6804: "Bellandur Centro (PT Sales)",
  6805: "Puttenahalli (PT Sales)",
  7416: "Marathahalli (PT Sales)",
  7443: "Seegehalli (PT Sales)",
  7728: "Brookefield (PT Sales)",
  7820: "Sandbox (test branch)",
};

const PT_TO_MEMBERSHIP_BRANCH: Record<number, number> = {
  6793: 5431,
  6794: 5472,
  6795: 5489,
  6796: 5695,
  6797: 5838,
  6798: 5915,
  6799: 6175,
  6800: 6319,
  6801: 6351,
  6802: 6487,
  6803: 6556,
  6804: 6664,
  6805: 6729,
  7416: 7415,
  7443: 5812,
  7728: 7727,
};

export function yoactivMembershipBranchId(branchId: number): number {
  return PT_TO_MEMBERSHIP_BRANCH[branchId] ?? branchId;
}

// Brookefield's PT Sales API key does not expose member/staff directories.
// Its people directory is maintained on the paired physical-studio branch.
export function yoactivPeopleDirectoryBranchId(branchId: number): number {
  return branchId === 7728 ? 7727 : branchId;
}

export function yoactivBranchName(branchId: number): string | null {
  return YOACTIV_BRANCH_NAMES[branchId] ?? null;
}
