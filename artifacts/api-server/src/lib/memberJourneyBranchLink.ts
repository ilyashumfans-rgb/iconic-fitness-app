import { pool } from "@workspace/db";
/** Call only after explicit private sync receipt verification, never guessed phone/email. */
export async function saveConfirmedJourneyBranch(userId: number, branchId: number, verifiedMobile: string): Promise<void> {
  await pool.query(`INSERT INTO member_journey_branch_links(user_id,gym_id)
    SELECT $1,id FROM gyms WHERE yoactiv_branch_id=$2 AND (SELECT count(*) FROM gyms WHERE yoactiv_branch_id=$2)=1
    AND EXISTS(SELECT 1 FROM users WHERE id=$1 AND right(regexp_replace(mobile,'\\D','','g'),10)=$3)
    ON CONFLICT(user_id) DO UPDATE SET gym_id=EXCLUDED.gym_id`, [userId, branchId, verifiedMobile]);
}