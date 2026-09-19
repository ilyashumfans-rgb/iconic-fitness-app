export type CommunityStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "unpublished"
  | "withdrawn";

export type CommunityVisibility = {
  status: string;
  publicSharingConsent: boolean;
  authorUserId: number;
};

export type CommunityCoachPost = CommunityVisibility & {
  trainerStaffId: number | null;
  trainerYoactivStaffId: string | null;
};

export type CommunityCoachStaff = {
  id: number;
  gymId: number | null;
  yoactivStaffId: string | null;
  isActive: boolean;
  permissions: string[];
};

export type CommunityCoachCandidate = {
  id: number;
  name: string;
  yoactivStaffId: string;
};

export type CommunityCoachGym = {
  id: number;
  name: string;
};

/** The sole public condition. A status alone never makes a photo public. */
export function isPublicCommunityPost(post: Pick<CommunityVisibility, "status" | "publicSharingConsent">): boolean {
  return post.status === "approved" && post.publicSharingConsent === true;
}

/** Used for both post detail and private image access. */
export function canReadCommunityPost(
  post: CommunityVisibility,
  requester: { userId?: number; isCurrentAdmin: boolean },
): boolean {
  return (
    requester.isCurrentAdmin ||
    requester.userId === post.authorUserId ||
    isPublicCommunityPost(post)
  );
}

/**
 * Resolve the public coach shape only after post visibility and all current
 * roster/identity constraints have passed. The route supplies the candidate
 * from availableCommunityTrainers, so a missing candidate means the live
 * branch roster no longer contains this coach.
 */
export function resolveCommunityCoach(
  post: CommunityCoachPost,
  requester: { userId?: number; isCurrentAdmin: boolean },
  staff: CommunityCoachStaff | null,
  candidate: CommunityCoachCandidate | null,
  gym: CommunityCoachGym | null,
): { name: string; gymId: number; gymName: string; trainerId: string } | null {
  if (!canReadCommunityPost(post, requester)) return null;
  if (
    post.trainerStaffId === null ||
    post.trainerYoactivStaffId === null ||
    !staff ||
    !candidate ||
    !gym ||
    staff.id !== post.trainerStaffId ||
    staff.yoactivStaffId !== post.trainerYoactivStaffId ||
    !staff.isActive ||
    !staff.permissions.includes("pt.manage") ||
    staff.gymId !== gym.id ||
    candidate.id !== staff.id ||
    candidate.yoactivStaffId !== staff.yoactivStaffId
  ) {
    return null;
  }
  return {
    name: candidate.name,
    gymId: gym.id,
    gymName: gym.name,
    trainerId: candidate.yoactivStaffId,
  };
}

/** Server-owned fields for creation: client payload never controls these. */
export function newCommunitySubmission(authorUserId: number) {
  return {
    authorUserId,
    status: "pending" as const,
    publicSharingConsent: true,
  };
}

export function canModerateCommunityPost(
  currentStatus: string,
  currentConsent: boolean,
  action: "approve" | "reject" | "unpublish",
): boolean {
  if (action === "approve") {
    return (
      currentConsent === true &&
      (currentStatus === "pending" ||
        currentStatus === "rejected" ||
        currentStatus === "unpublished")
    );
  }
  if (action === "reject") {
    return currentStatus === "pending" || currentStatus === "approved";
  }
  return currentStatus === "approved";
}

/** Source states used directly in the moderation UPDATE predicate. */
export function communityModerationSourceStatuses(
  action: "approve" | "reject" | "unpublish",
): CommunityStatus[] {
  const all: CommunityStatus[] = [
    "pending",
    "approved",
    "rejected",
    "unpublished",
    "withdrawn",
  ];
  return all.filter((status) =>
    canModerateCommunityPost(status, action === "approve", action),
  );
}