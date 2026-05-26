import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

export const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URI || "",
  max: parseInt(process.env.DB_POOL_MAX || "20", 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECT_TIMEOUT || "5000", 10),
});

export const db = drizzle(pool, { schema });
