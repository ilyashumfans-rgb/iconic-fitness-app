export type JourneyScope = { actor: string; gyms: number[] | null; manage: boolean; clinical?: boolean; trainerId?: number };
export const journeyScopeWhere = "($1::int[] IS NULL OR gym_id=ANY($1)) AND ($2::int IS NULL OR $2 IN(trainer_id,general_trainer_id,dietician_id))";
export function journeyInScope(s: JourneyScope, row: { gym_id: number; trainer_id?: number; general_trainer_id?: number; dietician_id?: number }): boolean {
  return (!s.gyms || s.gyms.includes(row.gym_id)) && (!s.trainerId || [row.trainer_id, row.general_trainer_id, row.dietician_id].includes(s.trainerId));
}