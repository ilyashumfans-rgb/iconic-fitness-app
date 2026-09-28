import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "@workspace/db/schema";
import type { Pool } from "pg";

export type RequiredColumn = { table: string; column: string; type: string };
export type CatalogColumn = { table_name: string; column_name: string; sql_type: string };

const normalizeType = (type: string): string =>
  type.toLowerCase().replace(/^serial$/, "integer").replace(/^bigserial$/, "bigint")
    .replace(/^smallserial$/, "smallint").replace(/^timestamp$/, "timestamp without time zone")
    .replace(/^timestamptz$/, "timestamp with time zone");

/** Derive requirements from every exported table, including future additions.
 * Import only the schema barrel: checking must never initialize routes/seeders.
 */
export function requiredColumns(): RequiredColumn[] {
  return Object.values(schema).filter((value) => is(value, PgTable)).flatMap((table) => {
    const config = getTableConfig(table as PgTable);
    return config.columns.map((column) => ({
      table: config.name, column: column.name, type: normalizeType(column.getSQLType()),
    }));
  }).sort((a, b) => `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`));
}

export function findSchemaDrift(required: RequiredColumn[], actual: CatalogColumn[]): string[] {
  const tables = new Set(actual.map((column) => column.table_name));
  const columns = new Map(actual.map((column) => [
    `${column.table_name}.${column.column_name}`, normalizeType(column.sql_type),
  ]));
  const missingTables = new Set<string>();
  const issues: string[] = [];
  for (const column of required) {
    if (!tables.has(column.table)) {
      if (!missingTables.has(column.table)) issues.push(`Missing table: public.${column.table}`);
      missingTables.add(column.table);
      continue;
    }
    const key = `${column.table}.${column.column}`;
    const actualType = columns.get(key);
    if (!actualType) issues.push(`Missing column: public.${key} (expected ${column.type})`);
    else if (actualType !== normalizeType(column.type)) {
      issues.push(`Incompatible type: public.${key} (expected ${column.type}, found ${actualType})`);
    }
  }
  return issues;
}

/** Read-only even if accidentally called with a privileged connection.
 * Extra tables/columns (notably user_sessions) are deliberately ignored.
 */
export async function checkSchemaCompatibility(pool: Pick<Pool, "connect">): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const result = await client.query<CatalogColumn>(`
      SELECT c.relname AS table_name, a.attname AS column_name,
             pg_catalog.format_type(a.atttypid, a.atttypmod) AS sql_type
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        AND a.attnum > 0 AND NOT a.attisdropped
    `);
    return findSchemaDrift(requiredColumns(), result.rows);
  } finally {
    try { await client.query("ROLLBACK"); } finally { client.release(); }
  }
}