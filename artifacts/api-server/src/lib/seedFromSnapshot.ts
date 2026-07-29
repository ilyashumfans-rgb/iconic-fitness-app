import {
  db,
  citiesTable,
  areasTable,
  amenitiesTable,
  workoutsTable,
  partnersTable,
  gymsTable,
  trainersTable,
  gymAmenitiesTable,
  gymWorkoutsTable,
  gymWorkoutSessionsTable,
  gymHoursTable,
  membershipsTable,
  classSessionsTable,
  productsTable,
  uploadedImagesTable,
  yoactivPackagePrefsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";
import snapshot from "./seed-snapshot.json" with { type: "json" };

type Row = Record<string, unknown>;

// A drizzle executor: either the root `db` or a transaction handle. Both expose
// the same query-builder surface we use here (select/insert/execute).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Executor = any;

function camelize(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toCamel(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    out[camelize(k)] = v;
  }
  return out;
}

function coerceDates(row: Row, dateKeys: string[]): Row {
  for (const k of dateKeys) {
    const v = row[k];
    if (typeof v === "string") row[k] = new Date(v);
  }
  return row;
}

async function seedTable(
  dbx: Executor,
  _name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  rows: Row[],
  dateKeys: string[] = ["createdAt"],
): Promise<number> {
  if (rows.length === 0) return 0;
  const existing = await dbx.select().from(table).limit(1);
  if (existing.length > 0) return 0;

  const values = rows.map((r) => coerceDates(toCamel(r), dateKeys));
  await dbx.insert(table).values(values);

  // Only realign the id sequence for tables whose primary key is backed by a
  // serial/identity sequence. Tables with a non-serial id (e.g. text ids) have
  // no sequence, so pg_get_serial_sequence returns NULL and setval would error.
  const tableName: string = table[Symbol.for("drizzle:Name")] ?? _name;
  await dbx.execute(
    sql.raw(
      `DO $$
       DECLARE seq text;
       BEGIN
         seq := pg_get_serial_sequence('"${tableName}"', 'id');
         IF seq IS NOT NULL THEN
           PERFORM setval(seq, COALESCE((SELECT MAX(id) FROM "${tableName}"), 0) + 1, false);
         END IF;
       END $$;`,
    ),
  );

  return values.length;
}

// Runs all per-table seeds against the given executor. Throws on any failure so
// callers (e.g. a transaction) can roll back. seedTable skips tables that
// already contain rows, so this is a no-op on an already-populated database.
async function seedAll(dbx: Executor): Promise<Record<string, number>> {
  const snap = snapshot as Record<string, Row[]>;
  const results: Record<string, number> = {};

  results.cities = await seedTable(dbx, "cities", citiesTable, snap.cities ?? []);
  results.areas = await seedTable(dbx, "areas", areasTable, snap.areas ?? []);
  results.amenities = await seedTable(
    dbx,
    "amenities",
    amenitiesTable,
    snap.amenities ?? [],
  );
  results.workouts = await seedTable(
    dbx,
    "workouts",
    workoutsTable,
    snap.workouts ?? [],
  );
  results.partners = await seedTable(
    dbx,
    "partners",
    partnersTable,
    snap.partners ?? [],
  );
  results.gyms = await seedTable(dbx, "gyms", gymsTable, snap.gyms ?? [], []);
  results.trainers = await seedTable(
    dbx,
    "trainers",
    trainersTable,
    snap.trainers ?? [],
    [],
  );
  results.gym_amenities = await seedTable(
    dbx,
    "gym_amenities",
    gymAmenitiesTable,
    snap.gym_amenities ?? [],
    [],
  );
  results.gym_workouts = await seedTable(
    dbx,
    "gym_workouts",
    gymWorkoutsTable,
    snap.gym_workouts ?? [],
    [],
  );
  results.gym_workout_sessions = await seedTable(
    dbx,
    "gym_workout_sessions",
    gymWorkoutSessionsTable,
    snap.gym_workout_sessions ?? [],
    [],
  );
  results.gym_hours = await seedTable(
    dbx,
    "gym_hours",
    gymHoursTable,
    snap.gym_hours ?? [],
    [],
  );
  results.memberships = await seedTable(
    dbx,
    "memberships",
    membershipsTable,
    snap.memberships ?? [],
    [],
  );
  results.class_sessions = await seedTable(
    dbx,
    "class_sessions",
    classSessionsTable,
    snap.class_sessions ?? [],
    ["startsAt"],
  );
  results.products = await seedTable(
    dbx,
    "products",
    productsTable,
    snap.products ?? [],
  );
  results.uploaded_images = await seedTable(
    dbx,
    "uploaded_images",
    uploadedImagesTable,
    snap.uploaded_images ?? [],
  );
  // Which YoActiv package variations are member-visible per branch. Packages
  // are default-hidden, so without these rows every branch's paid purchase
  // flow would show an empty plan list and fall back to enquiries.
  results.yoactiv_package_prefs = await seedTable(
    dbx,
    "yoactiv_package_prefs",
    yoactivPackagePrefsTable,
    snap.yoactiv_package_prefs ?? [],
    ["updatedAt"],
  );

  return results;
}

// Startup seeder: best-effort, never throws. Seeds only empty tables, so it is
// a no-op once a database has data.
export async function seedFromSnapshot(): Promise<Record<string, number>> {
  try {
    const results = await seedAll(db);
    const totalInserted = Object.values(results).reduce((a, b) => a + b, 0);
    if (totalInserted > 0) {
      logger.info(
        { inserted: results },
        "Seeded database from snapshot",
      );
    }
    return results;
  } catch (err) {
    logger.warn({ err }, "Failed to seed from snapshot");
    return {};
  }
}

// Tables wiped (CASCADE) before a forced reseed. Order does not matter with
// CASCADE — dependent rows (bookings, memberships, etc.) are removed too.
const CATALOG_TABLES = [
  "cities",
  "areas",
  "amenities",
  "workouts",
  "partners",
  "gyms",
  "trainers",
  "gym_amenities",
  "gym_workouts",
  "gym_workout_sessions",
  "gym_hours",
  "memberships",
  "class_sessions",
  "products",
  "uploaded_images",
  "yoactiv_package_prefs",
];

/**
 * Destructively replaces the catalog (gyms, partners, areas, images, etc.)
 * with the bundled dev snapshot. The truncate + full reseed run inside a single
 * transaction: if anything fails, the whole operation rolls back and throws, so
 * the database is never left empty or partially populated. A sanity check
 * ensures the snapshot actually produced core rows before committing.
 *
 * Intended to be triggered explicitly by an admin to mirror dev data onto a
 * fresh production database.
 */
export async function forceReseedFromSnapshot(): Promise<
  Record<string, number>
> {
  const quoted = CATALOG_TABLES.map((t) => `"${t}"`).join(", ");
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql.raw(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`),
    );
    const results = await seedAll(tx);
    if (!results.gyms || !results.partners) {
      throw new Error(
        `Reseed sanity check failed (gyms=${results.gyms ?? 0}, partners=${results.partners ?? 0}); rolling back`,
      );
    }
    logger.info({ inserted: results }, "Force-reseeded catalog from snapshot");
    return results;
  });
}
