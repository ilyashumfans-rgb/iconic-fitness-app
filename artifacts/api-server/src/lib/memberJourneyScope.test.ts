import assert from "node:assert/strict";
import { test } from "node:test";
import { Pool } from "pg";
import { journeyInScope, journeyScopeWhere } from "./memberJourneyScope";

test("production list SQL and detail/mutation predicate agree on synthetic cross-branch members", { skip: !process.env.DATABASE_URL }, async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const q = await pool.connect();
  try {
    await q.query("BEGIN");
    await q.query("CREATE TEMP TABLE journey_scope_fixture(user_id int,gym_id int,trainer_id int,general_trainer_id int,dietician_id int) ON COMMIT DROP");
    await q.query("INSERT INTO journey_scope_fixture VALUES(101,1,7,NULL,NULL),(102,2,7,NULL,NULL),(103,1,8,NULL,NULL)");
    for (const s of [
      { actor: "staff:7", gyms: [1], manage: true, trainerId: 7 },
      { actor: "corporate:1", gyms: [1], manage: false },
      { actor: "ungranted:1", gyms: [], manage: true },
      { actor: "admin:1", gyms: null, manage: true },
    ]) {
      const all = (await q.query("SELECT * FROM journey_scope_fixture")).rows;
      const visible = (await q.query(`SELECT * FROM journey_scope_fixture WHERE ${journeyScopeWhere}`, [s.gyms, "trainerId" in s ? s.trainerId : null])).rows;
      assert.deepEqual(visible.map(r => r.user_id), all.filter(r => journeyInScope(s, r)).map(r => r.user_id));
    }
    assert(!journeyInScope({ actor: "staff:7", gyms: [1], trainerId: 7, manage: true }, { gym_id: 2, trainer_id: 7 }));
    await q.query("CREATE TEMP TABLE journey_event_fixture(user_id int,version int,UNIQUE(user_id,version)) ON COMMIT DROP");
    await q.query("INSERT INTO journey_event_fixture VALUES(101,1)");
    const duplicate = await q.query("INSERT INTO journey_event_fixture VALUES(101,1) ON CONFLICT DO NOTHING RETURNING *");
    assert.equal(duplicate.rowCount, 0);
  } finally { await q.query("ROLLBACK"); q.release(); await pool.end(); }
});