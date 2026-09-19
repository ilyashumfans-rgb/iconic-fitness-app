export function showFitnessJourney(input: {
  signedIn: boolean; ready: boolean; pendingSync: number; ownerId?: string;
  accountId?: string | null; success: boolean; fetching: boolean; eligible?: boolean;
  automaticSyncState: string;
}): boolean {
  return input.signedIn && input.ready && input.pendingSync === 0 &&
    ["synced", "confirmation_required", "mobile_conflict"].includes(input.automaticSyncState) &&
    input.success && !input.fetching && !!input.accountId &&
    input.ownerId === input.accountId && input.eligible === true;
}