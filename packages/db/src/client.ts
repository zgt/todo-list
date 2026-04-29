import { env } from "node:process";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

const pool = new Pool({ connectionString: env.POSTGRES_URL });

export const db = drizzle({
  client: pool,
  schema,
  casing: "snake_case",
});
