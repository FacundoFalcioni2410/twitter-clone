import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });
process.env.DATABASE_URL = process.env.DATABASE_URL!.replace(
  /\/([^/?]+)(\?.*)?$/,
  "/$1_test$2"
);
