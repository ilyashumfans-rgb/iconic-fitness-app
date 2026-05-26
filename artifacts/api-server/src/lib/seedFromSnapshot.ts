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
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";
import snapshot from "./seed-snapshot.json" with { type: "json" };

type Row = Record<string, unknown>;

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
  _name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  rows: Row[],
  dateKeys: string[] = ["createdAt"],
): Promise<number> {
  if (rows.length === 0) return 0;
  const existing = await db.select().from(table).limit(1);
  if (existing.length > 0) return 0;

  const values = rows.map((r) => coerceDates(toCamel(r), dateKeys));
  await db.insert(table).values(values);

  const tableName: string = table[Symbol.for("drizzle:Name")] ?? _name;
  await db.execute(
    sql.raw(
      `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tableName}"), 0) + 1, false)`,
    ),
  );

  return values.length;
}

export async function seedFromSnapshot(): Promise<void> {
  try {
    const snap = snapshot as Record<string, Row[]>;
    const results: Record<string, number> = {};

    results.cities = await seedTable("cities", citiesTable, snap.cities ?? []);
    results.areas = await seedTable("areas", areasTable, snap.areas ?? []);
    results.amenities = await seedTable(
      "amenities",
      amenitiesTable,
      snap.amenities ?? [],
    );
    results.workouts = await seedTable(
      "workouts",
      workoutsTable,
      snap.workouts ?? [],
    );
    results.partners = await seedTable(
      "partners",
      partnersTable,
      snap.partners ?? [],
    );
    results.gyms = await seedTable("gyms", gymsTable, snap.gyms ?? [], []);
    results.trainers = await seedTable(
      "trainers",
      trainersTable,
      snap.trainers ?? [],
      [],
    );
    results.gym_amenities = await seedTable(
      "gym_amenities",
      gymAmenitiesTable,
      snap.gym_amenities ?? [],
      [],
    );
    results.gym_workouts = await seedTable(
      "gym_workouts",
      gymWorkoutsTable,
      snap.gym_workouts ?? [],
      [],
    );
    results.gym_workout_sessions = await seedTable(
      "gym_workout_sessions",
      gymWorkoutSessionsTable,
      snap.gym_workout_sessions ?? [],
      [],
    );
    results.gym_hours = await seedTable(
      "gym_hours",
      gymHoursTable,
      snap.gym_hours ?? [],
      [],
    );
    results.memberships = await seedTable(
      "memberships",
      membershipsTable,
      snap.memberships ?? [],
      [],
    );
    results.class_sessions = await seedTable(
      "class_sessions",
      classSessionsTable,
      snap.class_sessions ?? [],
      ["startsAt"],
    );
    results.products = await seedTable(
      "products",
      productsTable,
      snap.products ?? [],
    );

    const totalInserted = Object.values(results).reduce((a, b) => a + b, 0);
    if (totalInserted > 0) {
      logger.info(
        { inserted: results },
        "Seeded production database from snapshot",
      );
    }
  } catch (err) {
    logger.warn({ err }, "Failed to seed from snapshot");
  }
}
