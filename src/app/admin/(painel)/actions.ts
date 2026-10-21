"use server";

/**
 * Ações do painel. TODA ação começa com requireAdmin(): uma server action é um endpoint
 * público, quem chama não precisa ter passado pela tela.
 */
import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createBooking } from "@/lib/booking";
import {
  createBlock,
  createResource,
  createService,
  deleteBlock,
  deleteClientData,
  deleteResource,
  deleteService,
  saveBusinessHours,
  setAppointmentStatus,
  updateResource,
  updateService,
  updateSettings,
} from "@/lib/data";
import { isConflictError } from "@/lib/db";
import { normalizePhone, parseMoney } from "@/lib/format";
import { DATE_RE, TIME_RE, addDays, toMin } from "@/lib/time";
import { bookingSchema, firstError } from "@/lib/validation";

export type ActionState = { ok?: string; error?: string } | null;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const int = (fd: FormData, key: string) => Number.parseInt(str(fd, key), 10);

/* ---------- agendamentos ---------- */

const statusSchema = z.enum(["agendado", "concluido", "cancelado", "faltou"]);

export async function changeStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = z.uuid().safeParse(str(fd, "id"));
  const status = statusSchema.safeParse(str(fd, "status"));
  if (!id.success || !status.success) return { error: "Pedido inválido." };
  try {
    await setAppointmentStatus(id.data, status.data);
  } catch (e) {
    // Reativar um cancelado cujo horário já foi ocupado por outra pessoa.
    if (isConflictError(e)) return { error: "Esse horário já está ocupado por outro agendamento." };
    throw e;
  }
  refresh();
  return { ok: "Atualizado." };
}

/** Pedido de exclusão de dados (LGPD): apaga o cliente e todo o histórico dele. */
export async function forgetClient(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = z.uuid().safeParse(str(fd, "id"));
  if (!id.success) return { error: "Pedido inválido." };
  await deleteClientData(id.data);
  refresh();
  return { ok: "Dados apagados." };
}

export async function createManualBooking(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = bookingSchema.safeParse({
    servicoId: str(fd, "servicoId"),
    date: str(fd, "date"),
    time: str(fd, "time"),
    nome: str(fd, "nome"),
    whatsapp: str(fd, "whatsapp"),
    observacao: str(fd, "observacao"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const result = await createBooking(parsed.data, "painel");
  if (!result.ok) {
    return {
      error:
        result.error === "horario_indisponivel"
          ? "Esse horário não está livre (ocupado, bloqueado ou fora do expediente)."
          : "Serviço ou data inválidos.",
    };
  }
  refresh();
  return { ok: "Agendamento criado." };
}

/* ---------- recursos (profissionais, quadras, salas) ---------- */

export async function saveResource(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const nome = str(fd, "nome");
  if (nome.length < 1 || nome.length > 60) return { error: "Nome: de 1 a 60 letras." };
  const data = { nome, ativo: fd.get("ativo") === "on", ordem: int(fd, "ordem") || 0 };
  const id = str(fd, "id");
  if (id) {
    if (!z.uuid().safeParse(id).success) return { error: "Pedido inválido." };
    await updateResource(id, data);
  } else {
    await createResource(data);
  }
  refresh();
  return { ok: "Salvo." };
}

export async function removeResource(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = z.uuid().safeParse(str(fd, "id"));
  if (!id.success) return { error: "Pedido inválido." };
  const result = await deleteResource(id.data);
  refresh();
  return { ok: result === "apagado" ? "Apagado." : "Tem agendamentos no histórico, então foi só desativado." };
}

/* ---------- serviços ---------- */

function readService(fd: FormData) {
  const preco = parseMoney(str(fd, "preco"));
  const nome = str(fd, "nome");
  const duracao = int(fd, "duracao_minutos");
  if (nome.length < 2 || nome.length > 80) return { error: "Nome do serviço: de 2 a 80 letras." };
  if (preco === null) return { error: "Preço inválido." };
  if (!(duracao >= 5 && duracao <= 600)) return { error: "Duração: de 5 a 600 minutos." };
  if (fd.getAll("recursos").length === 0) return { error: "Marque quem/onde faz este serviço." };
  return {
    data: {
      nome,
      descricao: str(fd, "descricao").slice(0, 300),
      preco_centavos: preco,
      duracao_minutos: duracao,
      ativo: fd.get("ativo") === "on",
      ordem: int(fd, "ordem") || 0,
      recursos: fd.getAll("recursos").map(String).filter((id) => z.uuid().safeParse(id).success),
    },
  };
}

export async function saveService(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const s = readService(fd);
  if ("error" in s) return { error: s.error };
  const id = str(fd, "id");
  if (id) {
    if (!z.uuid().safeParse(id).success) return { error: "Pedido inválido." };
    await updateService(id, s.data);
  } else {
    await createService(s.data);
  }
  refresh();
  return { ok: "Serviço salvo." };
}

export async function removeService(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = z.uuid().safeParse(str(fd, "id"));
  if (!id.success) return { error: "Pedido inválido." };
  const result = await deleteService(id.data);
  refresh();
  return { ok: result === "apagado" ? "Serviço apagado." : "Serviço tem histórico, então foi só desativado." };
}

/* ---------- horário de funcionamento e bloqueios ---------- */

export async function saveHours(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const hours = [];
  for (let d = 0; d <= 6; d++) {
    const atende = fd.get(`atende_${d}`) === "on";
    const abre = str(fd, `abre_${d}`) || "09:00";
    const fecha = str(fd, `fecha_${d}`) || "18:00";
    const pi = str(fd, `pausa_inicio_${d}`);
    const pf = str(fd, `pausa_fim_${d}`);
    if (![abre, fecha].every((t) => TIME_RE.test(t))) return { error: "Horário inválido." };
    if (atende && toMin(fecha) <= toMin(abre)) return { error: "O horário de fechar precisa ser depois do de abrir." };
    const hasPause = Boolean(pi || pf);
    if (hasPause) {
      if (!TIME_RE.test(pi) || !TIME_RE.test(pf)) return { error: "Preencha início e fim da pausa (ou deixe os dois vazios)." };
      if (toMin(pf) <= toMin(pi) || toMin(pi) < toMin(abre) || toMin(pf) > toMin(fecha)) {
        return { error: "A pausa precisa ficar dentro do expediente." };
      }
    }
    hours.push({ dia_semana: d, atende, abre, fecha, pausa_inicio: hasPause ? pi : null, pausa_fim: hasPause ? pf : null });
  }
  await saveBusinessHours(hours);
  refresh();
  return { ok: "Horários salvos." };
}

export async function addBlock(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const date = str(fd, "data");
  const ate = str(fd, "ate") || date;
  const diaInteiro = fd.get("dia_inteiro") === "on";
  const inicioHora = str(fd, "inicio");
  const fimHora = str(fd, "fim");
  if (!DATE_RE.test(date) || !DATE_RE.test(ate) || ate < date) return { error: "Datas inválidas." };

  let inicio: string, fim: string;
  if (diaInteiro) {
    inicio = `${date}T00:00`;
    fim = `${addDays(ate, 1)}T00:00`;
  } else {
    if (!TIME_RE.test(inicioHora) || !TIME_RE.test(fimHora)) return { error: "Informe o horário de início e de fim." };
    inicio = `${date}T${inicioHora}`;
    fim = `${ate}T${fimHora}`;
    if (fim <= inicio) return { error: "O fim precisa ser depois do início." };
  }
  const recurso = str(fd, "recurso_id");
  if (recurso && !z.uuid().safeParse(recurso).success) return { error: "Pedido inválido." };
  await createBlock({ recurso_id: recurso || null, inicio, fim, motivo: str(fd, "motivo").slice(0, 120) });
  refresh();
  return { ok: "Bloqueio criado. Agendamentos que já existiam nesse período continuam valendo." };
}

export async function removeBlock(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = z.uuid().safeParse(str(fd, "id"));
  if (!id.success) return { error: "Pedido inválido." };
  await deleteBlock(id.data);
  refresh();
  return { ok: "Bloqueio removido." };
}

/* ---------- configurações ---------- */

export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const whatsappRaw = str(fd, "whatsapp");
  const whatsapp = whatsappRaw ? normalizePhone(whatsappRaw) : "";
  if (whatsapp === null) return { error: "WhatsApp inválido. Use DDD + número." };

  const ranges = {
    intervalo_minutos: [0, 120],
    passo_minutos: [5, 120],
    antecedencia_horas: [0, 168],
    janela_dias: [7, 365],
  } as const;
  const nums = {} as Record<keyof typeof ranges, number>;
  for (const [key, [min, max]] of Object.entries(ranges) as [keyof typeof ranges, readonly [number, number]][]) {
    const n = int(fd, key);
    if (!(n >= min && n <= max)) return { error: `Valor fora do permitido em "${key.replace("_", " ")}" (${min} a ${max}).` };
    nums[key] = n;
  }

  const nome = str(fd, "nome_negocio");
  if (nome.length < 2) return { error: "Informe o nome do negócio." };

  await updateSettings({
    nome_negocio: nome,
    slogan: str(fd, "slogan"),
    hero_titulo: str(fd, "hero_titulo") || nome,
    hero_subtitulo: str(fd, "hero_subtitulo"),
    sobre: str(fd, "sobre"),
    whatsapp,
    instagram: str(fd, "instagram").replace(/^@/, ""),
    endereco: str(fd, "endereco"),
    mapa_url: /^https:\/\//.test(str(fd, "mapa_url")) ? str(fd, "mapa_url") : "",
    aviso_agendamento: str(fd, "aviso_agendamento"),
    msg_agendamento: str(fd, "msg_agendamento"),
    msg_lembrete: str(fd, "msg_lembrete"),
    rotulo_recurso: str(fd, "rotulo_recurso").slice(0, 30) || "Profissional",
    ...nums,
  });
  refresh();
  return { ok: "Configurações salvas." };
}
