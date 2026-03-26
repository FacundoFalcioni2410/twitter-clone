import { execSync } from "child_process";
import path from "path";
import * as dotenv from "dotenv";

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
  const testUrl = process.env.DATABASE_URL!.replace(
    /\/([^/?]+)(\?.*)?$/,
    "/$1_test$2"
  );
  process.env.DATABASE_URL = testUrl;

  // Seed the test database so E2E tests have consistent data
  execSync("npx tsx prisma/seed.ts", {
    env: { ...process.env },
    stdio: "inherit",
  });
}
