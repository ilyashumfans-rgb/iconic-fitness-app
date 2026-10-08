/** Read only explicit mappings belonging to the selected local gym. */
export async function mappedPtTrainers<T extends { id: string; name: string }>(
  membershipBranchId: number | null,
  ptBranchId: number | null,
  fetchBranch: (branchId: number) => Promise<T[]>,
): Promise<T[]> {
  const ids = [...new Set([membershipBranchId, ptBranchId].filter(
    (id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0,
  ))];
  // Fail closed if either configured directory cannot be verified. Checkout
  // must not silently treat a partial/stale roster as complete.
  const rosters = await Promise.all(ids.map(fetchBranch));
  const unique = new Map<string, T>();
  for (const trainer of rosters.flat()) {
    // Preserve upstream stable IDs (also used to key photos and staff links).
    // Never collapse distinct people by name or mobile.
    if (!unique.has(trainer.id)) unique.set(trainer.id, trainer);
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}
