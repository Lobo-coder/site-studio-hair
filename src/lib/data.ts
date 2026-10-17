/**
 * Todas as leituras e escritas do banco ficam aqui. Telas, rotas da API e server actions
 * chamam estas funções; ninguém mais escreve SQL.
 */
import "server-only";
import { query } from "./db";
import type { Appointment, AppointmentStatus, Block, BusinessHour, PublicService, Resource, Service, Settings } from "./types";

const HM = (col: string) => `to_char(${col}, 'HH24:MI')`;
const DT = (col: string) => `to_char(${col}, 'YYYY-MM-DD"T"HH24:MI')`;

/* ---------- configurações ---------- */

export async function getSettings(): Promise<Settings> {
  const [row] = await query<Settings>("select * from configuracoes where id = 1");
  return row;
}

export async function updateSettings(s: Omit<Settings, "timezone">) {
  await query(
    `update configuracoes set
       nome_negocio = $1, slogan = $2, hero_titulo = $3, hero_subtitulo = $4, sobre = $5,
       whatsapp = $6, instagram = $7, endereco = $8, mapa_url = $9, aviso_agendamento = $10,
       intervalo_minutos = $11, passo_minutos = $12, antecedencia_horas = $13, janela_dias = $14,
       msg_agendamento = $15, msg_lembrete = $16, rotulo_recurso = $17
     where id = 1`,
    [
      s.nome_negocio, s.slogan, s.hero_titulo, s.hero_subtitulo, s.sobre,
      s.whatsapp, s.instagram, s.endereco, s.mapa_url, s.aviso_agendamento,
      s.intervalo_minutos, s.passo_minutos, s.antecedencia_horas, s.janela_dias,
      s.msg_agendamento, s.msg_lembrete, s.rotulo_recurso,
    ],
  );
}

/* ---------- recursos (profissionais, quadras, salas) ---------- */

export function listResources() {
  return query<Resource>("select id, nome, ativo, ordem from recursos order by ordem, nome");
}

export async function createResource(r: Omit<Resource, "id">) {
  await query("insert into recursos (nome, ativo, ordem) values ($1, $2, $3)", [r.nome, r.ativo, r.ordem]);
}

export async function updateResource(id: string, r: Omit<Resource, "id">) {
  await query("update recursos set nome = $2, ativo = $3, ordem = $4 where id = $1", [id, r.nome, r.ativo, r.ordem]);
}

/** Apaga se nunca teve agendamento; se tem histórico, só desativa. */
export async function deleteResource(id: string) {
  const [used] = await query<{ n: number }>("select count(*)::int as n from agendamentos where recurso_id = $1", [id]);
  if (used.n > 0) {
    await query("update recursos set ativo = false where id = $1", [id]);
    return "desativado" as const;
  }
  await query("delete from recursos where id = $1", [id]);
  return "apagado" as const;
}

/** Recursos ATIVOS que fazem o serviço, na ordem de preferência (o primeiro livre é o escolhido). */
export async function listServiceResources(serviceId: string) {
  const rows = await query<{ id: string }>(
    `select r.id from recursos r join servico_recursos sr on sr.recurso_id = r.id
      where sr.servico_id = $1 and r.ativo order by r.ordem, r.nome`,
    [serviceId],
  );
  return rows.map((r) => r.id);
}

/* ---------- serviços ---------- */

export function listPublicServices() {
  return query<PublicService>(
    "select id, nome, descricao, preco_centavos, duracao_minutos from servicos where ativo order by ordem, nome",
  );
}

export function listAllServices() {
  return query<Service>(
    `select s.id, s.nome, s.descricao, s.preco_centavos, s.duracao_minutos, s.ativo, s.ordem,
            array(select sr.recurso_id::text from servico_recursos sr where sr.servico_id = s.id) as recursos
       from servicos s order by s.ordem, s.nome`,
  );
}

export async function getActiveService(id: string) {
  const [row] = await query<PublicService>(
    "select id, nome, descricao, preco_centavos, duracao_minutos from servicos where id = $1 and ativo",
    [id],
  );
  return row ?? null;
}

type ServiceInput = Omit<Service, "id">;

async function setServiceResources(serviceId: string, resourceIds: string[]) {
  await query("delete from servico_recursos where servico_id = $1 and not (recurso_id = any($2::uuid[]))", [
    serviceId,
    resourceIds,
  ]);
  await query(
    `insert into servico_recursos (servico_id, recurso_id)
     select $1, r.id from recursos r where r.id = any($2::uuid[])
     on conflict do nothing`,
    [serviceId, resourceIds],
  );
}

export async function createService(s: ServiceInput) {
  const [row] = await query<{ id: string }>(
    "insert into servicos (nome, descricao, preco_centavos, duracao_minutos, ativo, ordem) values ($1, $2, $3, $4, $5, $6) returning id",
    [s.nome, s.descricao, s.preco_centavos, s.duracao_minutos, s.ativo, s.ordem],
  );
  await setServiceResources(row.id, s.recursos);
}

export async function updateService(id: string, s: ServiceInput) {
  await query(
    "update servicos set nome = $2, descricao = $3, preco_centavos = $4, duracao_minutos = $5, ativo = $6, ordem = $7 where id = $1",
    [id, s.nome, s.descricao, s.preco_centavos, s.duracao_minutos, s.ativo, s.ordem],
  );
  await setServiceResources(id, s.recursos);
}

/** Apaga se nunca foi agendado; se tem histórico, só desativa (o histórico continua íntegro). */
export async function deleteService(id: string) {
  const [used] = await query<{ n: number }>("select count(*)::int as n from agendamentos where servico_id = $1", [id]);
  if (used.n > 0) {
    await query("update servicos set ativo = false where id = $1", [id]);
    return "desativado" as const;
  }
  await query("delete from servicos where id = $1", [id]);
  return "apagado" as const;
}

/* ---------- horário de funcionamento ---------- */

export function listBusinessHours() {
  return query<BusinessHour>(
    `select dia_semana, atende, ${HM("abre")} as abre, ${HM("fecha")} as fecha,
            ${HM("pausa_inicio")} as pausa_inicio, ${HM("pausa_fim")} as pausa_fim
       from horarios_funcionamento order by dia_semana`,
  );
}

export async function saveBusinessHours(hours: BusinessHour[]) {
  for (const h of hours) {
    await query(
      `insert into horarios_funcionamento (dia_semana, atende, abre, fecha, pausa_inicio, pausa_fim)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (dia_semana) do update set atende = $2, abre = $3, fecha = $4, pausa_inicio = $5, pausa_fim = $6`,
      [h.dia_semana, h.atende, h.abre, h.fecha, h.pausa_inicio, h.pausa_fim],
    );
  }
}

/* ---------- bloqueios ---------- */

/** Bloqueios que encostam no período [from, to). */
export function listBlocks(from: string, to: string) {
  return query<Block>(
    `select id, recurso_id, ${DT("inicio")} as inicio, ${DT("fim")} as fim, motivo
       from bloqueios where inicio < $2 and fim > $1 order by inicio`,
    [from, to],
  );
}

export async function createBlock(b: Omit<Block, "id">) {
  await query("insert into bloqueios (recurso_id, inicio, fim, motivo) values ($1, $2, $3, $4)", [
    b.recurso_id,
    b.inicio,
    b.fim,
    b.motivo,
  ]);
}

export async function deleteBlock(id: string) {
  await query("delete from bloqueios where id = $1", [id]);
}

/* ---------- agendamentos ---------- */

/** Períodos ocupados (só ativos) que encostam em [from, to). */
export function listBusy(from: string, to: string) {
  return query<{ recurso_id: string; starts_at: string; blocked_until: string }>(
    `select recurso_id, ${DT("starts_at")} as starts_at, ${DT("blocked_until")} as blocked_until
       from agendamentos
      where status in ('agendado', 'concluido') and starts_at < $2 and blocked_until > $1`,
    [from, to],
  );
}

/** Agendamentos (todos os status) que começam em [from, to), com a cliente. */
export function listAppointments(from: string, to: string) {
  return query<Appointment>(
    `select a.id, ${DT("a.starts_at")} as starts_at, ${DT("a.ends_at")} as ends_at, a.status,
            a.servico_nome, a.preco_centavos, a.duracao_minutos, a.observacao, a.origem,
            r.nome as recurso_nome, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp
       from agendamentos a
       join clientes c on c.id = a.cliente_id
       join recursos r on r.id = a.recurso_id
      where a.starts_at >= $1 and a.starts_at < $2
      order by a.starts_at`,
    [from, to],
  );
}

export interface NewAppointment {
  nome: string;
  whatsapp: string;
  servico: PublicService;
  recurso_id: string;
  starts_at: string;
  ends_at: string;
  blocked_until: string;
  observacao: string;
  origem: "site" | "painel";
}

/**
 * Cria cliente (ou atualiza o nome, se o WhatsApp já existe) e o agendamento num único
 * comando SQL: se a constraint anti-conflito recusar, nada é gravado.
 */
export async function insertAppointment(a: NewAppointment) {
  const [row] = await query<{ id: string }>(
    `with c as (
       insert into clientes (nome, whatsapp) values ($1, $2)
       on conflict (whatsapp) do update set nome = excluded.nome
       returning id
     )
     insert into agendamentos (cliente_id, servico_id, starts_at, ends_at, blocked_until,
                               servico_nome, preco_centavos, duracao_minutos, observacao, origem, recurso_id)
     select c.id, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12 from c
     returning id`,
    [
      a.nome, a.whatsapp, a.servico.id, a.starts_at, a.ends_at, a.blocked_until,
      a.servico.nome, a.servico.preco_centavos, a.servico.duracao_minutos, a.observacao, a.origem, a.recurso_id,
    ],
  );
  return row.id;
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus) {
  await query("update agendamentos set status = $2 where id = $1", [id, status]);
}

/* ---------- resumo do painel ---------- */

export interface Summary {
  hoje: number;
  semana: number;
  mes: number;
  /** soma de agendado + concluído no mês */
  faturamento_mes: number;
  /** só o que já foi concluído no mês */
  concluido_mes: number;
  /** por profissional (recurso), no mês */
  por_recurso: { nome: string; atendimentos: number; total: number }[];
}

/** Contagens e somas de hoje, da semana e do mês (só agendamentos ativos). Datas YYYY-MM-DD. */
export async function getSummary(p: { today: string; weekStart: string; monthStart: string; monthEnd: string }): Promise<Summary> {
  const active = "a.status in ('agendado', 'concluido')";
  const [[tot], porRecurso] = await Promise.all([
    query<{ hoje: number; semana: number; mes: number; faturamento_mes: number; concluido_mes: number }>(
      `select count(*) filter (where a.starts_at >= $1::date and a.starts_at < $1::date + 1)::int as hoje,
              count(*) filter (where a.starts_at >= $2::date and a.starts_at < $2::date + 7)::int as semana,
              count(*) filter (where a.starts_at >= $3::date and a.starts_at < $4::date)::int as mes,
              coalesce(sum(a.preco_centavos) filter (where a.starts_at >= $3::date and a.starts_at < $4::date), 0)::int as faturamento_mes,
              coalesce(sum(a.preco_centavos) filter (where a.starts_at >= $3::date and a.starts_at < $4::date and a.status = 'concluido'), 0)::int as concluido_mes
         from agendamentos a
        where ${active}`,
      [p.today, p.weekStart, p.monthStart, p.monthEnd],
    ),
    query<{ nome: string; atendimentos: number; total: number }>(
      `select r.nome, count(a.id)::int as atendimentos, coalesce(sum(a.preco_centavos), 0)::int as total
         from recursos r
         left join agendamentos a on a.recurso_id = r.id and ${active}
                                 and a.starts_at >= $1::date and a.starts_at < $2::date
        where r.ativo
        group by r.id, r.nome, r.ordem
        order by r.ordem, r.nome`,
      [p.monthStart, p.monthEnd],
    ),
  ]);
  return { ...tot, por_recurso: porRecurso };
}
