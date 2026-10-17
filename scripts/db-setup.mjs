/**
 * Cria as tabelas no banco do cliente (Neon).
 *
 *   npm run db:setup            → só o schema (pode rodar de novo sem perder nada)
 *   npm run db:setup -- --seed  → schema + dados de exemplo (db/seed.sql)
 *
 * Lê DATABASE_URL do .env.local ou do ambiente.
 */
import { readFile } from "node:fs/promises";
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (connection string do Neon) no .env.local.");
  process.exit(1);
}

const files = ["db/schema.sql", ...(process.argv.includes("--seed") ? ["db/seed.sql"] : [])];
const pool = new Pool({ connectionString: url });
try {
  for (const file of files) {
    await pool.query(await readFile(file, "utf8"));
    console.log(`✔ ${file}`);
  }
  console.log("Banco pronto.");
} catch (e) {
  console.error("Erro ao montar o banco:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
