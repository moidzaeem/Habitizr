import { drizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@db/schema";
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}
const dbURL = process.env.DATABASE_URL + '&sslrootcert=./db/ca-certificate.crt'
console.log('DB URL: ', dbURL);
export const db = drizzle(dbURL);

// export const db = drizzle({
//   connection: {
//     connectionString: process.env.DATABASE_URL
//   }, schema,
//   ws: ws,
// });
