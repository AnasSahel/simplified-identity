import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/simplified-identity.sqlite";

export const dbClient = createClient({ url });
export const db = drizzle(dbClient, { schema });
export { schema };
