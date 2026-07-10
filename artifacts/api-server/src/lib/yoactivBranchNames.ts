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
  7820: "Sandbox (test branch)",
};

export function yoactivBranchName(branchId: number): string | null {
  return YOACTIV_BRANCH_NAMES[branchId] ?? null;
}
