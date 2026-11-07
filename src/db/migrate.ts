import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import neo4j from "neo4j-driver";

import { neo4jDriver } from "../config/neo4j.js";

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../../migrations");
const FILE_PATTERN = /^V(\d+)__(\w+)\.cypher$/;

type Migration = {
  version: number;
  name: string;
  checksum: string;
  statements: string[];
};

type AppliedMigration = {
  version: number;
  checksum: string;
};

const parseStatements = (content: string) =>
  content
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

async function loadMigrations(): Promise<Migration[]> {
  const files = await readdir(MIGRATIONS_DIR);
  const migrations: Migration[] = [];

  for (const file of files) {
    const match = FILE_PATTERN.exec(file);

    if (!match) {
      continue;
    }

    const content = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");

    migrations.push({
      version: Number(match[1]),
      name: match[2],
      checksum: createHash("sha256").update(content).digest("hex"),
      statements: parseStatements(content),
    });
  }

  migrations.sort((a, b) => a.version - b.version);

  const versions = migrations.map((m) => m.version);
  if (new Set(versions).size !== versions.length) {
    throw new Error("Duplicate migration versions found");
  }

  return migrations;
}

async function loadApplied(): Promise<Map<number, AppliedMigration>> {
  const { records } = await neo4jDriver.executeQuery(
    `
      MATCH (m:Migration)
      RETURN m.version AS version, m.checksum AS checksum
    `,
    {},
    { routing: neo4j.routing.READ }
  );

  return new Map(
    records.map((record) => [
      record.get("version"),
      { version: record.get("version"), checksum: record.get("checksum") },
    ])
  );
}

export async function migrate() {
  await neo4jDriver.executeQuery(`
    CREATE CONSTRAINT migration_version IF NOT EXISTS
    FOR (m:Migration) REQUIRE m.version IS UNIQUE
  `);

  const migrations = await loadMigrations();
  const applied = await loadApplied();

  for (const migration of migrations) {
    const label = `V${migration.version}__${migration.name}`;
    const existing = applied.get(migration.version);

    if (existing) {
      if (existing.checksum !== migration.checksum) {
        throw new Error(`Checksum mismatch for ${label}: applied migrations must not be edited`);
      }
      continue;
    }

    // Schema and data writes can't share a transaction: one tx per statement
    for (const statement of migration.statements) {
      await neo4jDriver.executeQuery(statement);
    }

    await neo4jDriver.executeQuery(
      `
        CREATE (:Migration {
          version: $version,
          name: $name,
          checksum: $checksum,
          appliedAt: datetime()
        })
      `,
      {
        version: migration.version,
        name: migration.name,
        checksum: migration.checksum,
      }
    );

    console.log(`Applied ${label}`);
  }

  console.log("Migrations up to date");
}

if (import.meta.filename === process.argv[1]) {
  try {
    await migrate();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await neo4jDriver.close();
  }
}
