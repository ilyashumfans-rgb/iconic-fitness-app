export class PtCheckoutError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function eligiblePtTrainers<T extends { id: string; name: string }>(
  gymId: number,
  trainers: T[],
  staff: { id: number; gymId: number | null; isActive: boolean; permissions: string[]; yoactivStaffId: string | null }[],
) {
  return trainers.flatMap((trainer) => {
    const matches = staff.filter(s => s.gymId === gymId && s.isActive &&
      s.permissions.includes("pt.manage") && !!s.yoactivStaffId && s.yoactivStaffId === trainer.id);
    // Ambiguous stable links must be repaired, never guessed.
    return matches.length === 1 ? [{ ...trainer, staffId: matches[0]!.id }] : [];
  });
}

export function requirePtTrainerId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !id.trim()) throw new PtCheckoutError(400, "Select a trainer before choosing your PT package.");
}

export function selectPtTrainer<T extends { id: string; name: string }>(id: unknown, roster: T[]): T {
  requirePtTrainerId(id);
  const trainer = roster.find(t => t.id === id);
  if (!trainer) throw new PtCheckoutError(409, "That trainer is no longer available at your membership branch. Please choose again.");
  return trainer;
}

export function requirePtHomeGym(homeGymId: number | null, requestedGymId: number) {
  if (homeGymId === null) throw new PtCheckoutError(403, "An active branch membership must be verified before purchasing PT. Sync your membership and retry.");
  if (homeGymId !== requestedGymId) throw new PtCheckoutError(403, "Please select a trainer at your active membership branch.");
}