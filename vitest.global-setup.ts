import { execSync } from "child_process";
import path from "path";
import * as dotenv from "dotenv";
import pg from "pg";

function deriveTestUrl(): string {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
  return process.env.DATABASE_URL!.replace(/\/([^/?]+)(\?.*)?$/, "/$1_test$2");
}

export async function setup() {
  const testUrl = deriveTestUrl();
  process.env.DATABASE_URL = testUrl;

  const dbUrl = new URL(testUrl);
  const dbName = dbUrl.pathname.replace(/^\//, "");
  const adminUrl = testUrl.replace(`/${dbName}`, "/postgres");

  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();

  const { rowCount } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName]
  );

  if (!rowCount) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`\n  ✓ Created test database: ${dbName}`);
  }

  await client.end();

  execSync("npx prisma migrate deploy", {
    env: { ...process.env },
    stdio: "inherit",
  });
}
