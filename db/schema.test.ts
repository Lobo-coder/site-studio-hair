/**
 * Roda o schema.sql num Postgres de verdade (PGlite) e confere a regra mais importante:
 * o banco recusa dois agendamentos no mesmo horário.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { beforeAll, describe, expect, it } from "vitest";

const sql = (f: string) => readFileSync(path.join(__dirname, f), "utf8");
const db = new PGlite({ extensions: { btree_gist } });
let cliente: string;
let quadra1: string;
let quadra2: string;

async function agendar(inicio: string, fim: string, status = "agendado", recurso = quadra1) {
  await db.query(
    `insert into agendamentos (cliente_id, recurso_id, starts_at, ends_at, blocked_until, status, servico_nome, preco_centavos, duracao_minutos)
     values ($1, $2, $3, $4, $4, $5, 'Teste', 1000, 60)`,
    [cliente, recurso, inicio, fim, status],
  );
}

beforeAll(async () => {
  await db.exec(sql("schema.sql"));
  await db.exec(sql("schema.sql")); // rodar duas vezes não pode dar erro
  await db.exec(sql("seed.sql"));
  const r = await db.query<{ id: string }>("insert into clientes (nome, whatsapp) values ('Ana', '5583999998888') returning id");
  cliente = r.rows[0].id;
  quadra1 = (await db.query<{ id: string }>("select id from recursos limit 1")).rows[0].id;
  quadra2 = (await db.query<{ id: string }>("insert into recursos (nome) values ('Quadra 2') returning id")).rows[0].id;
});

describe("schema", () => {
  it("cria configuração, horários e serviços de exemplo", async () => {
    expect((await db.query("select * from configuracoes")).rows).toHaveLength(1);
    expect((await db.query("select * from horarios_funcionamento")).rows).toHaveLength(7);
    expect((await db.query("select * from servicos")).rows.length).toBeGreaterThan(0);
    // todo serviço de exemplo já vem ligado a um recurso
    const semRecurso = await db.query("select id from servicos s where not exists (select 1 from servico_recursos sr where sr.servico_id = s.id)");
    expect(semRecurso.rows).toHaveLength(0);
  });

  it("recusa sobreposição, mas aceita encostar na borda", async () => {
    await agendar("2026-10-12 09:00", "2026-10-12 10:00");
    await expect(agendar("2026-10-12 09:30", "2026-10-12 10:30")).rejects.toMatchObject({ code: "23P01" });
    await expect(agendar("2026-10-12 10:00", "2026-10-12 11:00")).resolves.toBeUndefined();
  });

  it("recursos diferentes podem ter o mesmo horário", async () => {
    await agendar("2026-10-13 09:00", "2026-10-13 10:00");
    await expect(agendar("2026-10-13 09:00", "2026-10-13 10:00", "agendado", quadra2)).resolves.toBeUndefined();
    await expect(agendar("2026-10-13 09:00", "2026-10-13 10:00", "agendado", quadra2)).rejects.toMatchObject({ code: "23P01" });
  });

  it("cancelado não ocupa o horário", async () => {
    await agendar("2026-10-12 14:00", "2026-10-12 15:00", "cancelado");
    await expect(agendar("2026-10-12 14:00", "2026-10-12 15:00")).resolves.toBeUndefined();
  });
});
