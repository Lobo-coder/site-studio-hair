/**
 * Acesso ao banco. Só o servidor chega aqui: o navegador nunca fala com o banco.
 *
 * - Com DATABASE_URL (Vercel / Neon): driver HTTP do Neon, ideal para funções serverless.
 *   Se o banco estiver vazio (projeto Neon recém-criado), o schema e os dados iniciais são
 *   aplicados sozinhos no primeiro acesso, então não é obrigatório rodar `npm run db:setup`.
 * - Sem DATABASE_URL (só em desenvolvimento): PGlite, um Postgres de verdade rodando dentro do
 *   Node e gravando em `.data/`. Serve para desenvolver e para mostrar o site a um cliente
 *   sem criar nada no Neon. O schema e os dados de exemplo são aplicados sozinhos.
 *
 * Datas/horas sempre voltam como TEXTO (as queries usam to_char), então os dois bancos
 * devolvem exatamente o mesmo formato.
 */
import "server-only";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { Pool, neon } from "@neondatabase/serverless";

type Params = unknown[];
type Runner = (text: string, params: Params) => Promise<Record<string, unknown>[]>;

const g = globalThis as unknown as { __dbRunner?: Promise<Runner> };

async function createRunner(): Promise<Runner> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const sql = neon(url);
    const [{ t }] = (await sql.query("select to_regclass('public.configuracoes') as t")) as { t: string | null }[];
    if (!t) await setupRemote(url);
    return (text, params) => sql.query(text, params) as Promise<Record<string, unknown>[]>;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL não configurada. Defina a connection string do Neon nas variáveis de ambiente.");
  }
  return createLocalRunner();
}

/** Banco vazio: aplica db/schema.sql + db/seed.sql (o Pool aceita vários comandos de uma vez). */
async function setupRemote(url: string) {
  const pool = new Pool({ connectionString: url });
  try {
    for (const file of ["schema.sql", "seed.sql"]) {
      await pool.query(await readFile(path.join(process.cwd(), "db", file), "utf8"));
    }
    console.log("[db] Banco vazio: schema e dados iniciais aplicados.");
  } finally {
    await pool.end();
  }
}

async function createLocalRunner(): Promise<Runner> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  await mkdir(path.join(process.cwd(), ".data"), { recursive: true });
  const db = new PGlite(path.join(process.cwd(), ".data", "pglite"), { extensions: { btree_gist } });
  const fresh = (await db.query("select to_regclass('public.configuracoes') as t")).rows[0] as { t: string | null };
  if (!fresh.t) {
    for (const file of ["schema.sql", "seed.sql"]) {
      await db.exec(await readFile(path.join(process.cwd(), "db", file), "utf8"));
    }
    console.log("[db] Banco local de demonstração criado em .data/pglite");
  }
  return async (text, params) => (await db.query(text, params)).rows as Record<string, unknown>[];
}

export async function query<T = Record<string, unknown>>(text: string, params: Params = []): Promise<T[]> {
  // Dado do banco é sempre do momento da requisição: nunca entra em página pré-renderizada no build.
  await connection();
  g.__dbRunner ??= createRunner().catch((e) => {
    g.__dbRunner = undefined; // não guarda a falha: a próxima requisição tenta de novo
    throw e;
  });
  const run = await g.__dbRunner;
  return (await run(text, params)) as T[];
}

/** Código do Postgres para violação da constraint de exclusão (horário já ocupado). */
export const isConflictError = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: string }).code === "23P01";
