/**
 * Casos de uso do agendamento: listar horários livres e criar um agendamento.
 * O servidor recalcula tudo; o que vem do navegador é só o pedido.
 */
import "server-only";
import { computeSlots } from "./availability";
import { getActiveService, getSettings, insertAppointment, listBlocks, listBusinessHours, listBusy, listServiceResources } from "./data";
import { isConflictError } from "./db";
import { addDays, addMinutes, isValidDate, nowInTz, weekdayOf } from "./time";
import type { PublicService, Settings } from "./types";

export type BookingError = "servico_invalido" | "data_invalida" | "horario_indisponivel";

/** Primeiro e último dia que a cliente pode escolher. */
export function bookingWindow(settings: Settings) {
  const today = nowInTz(settings.timezone).slice(0, 10);
  return { first: today, last: addDays(today, settings.janela_dias) };
}

/**
 * Horários livres do dia para cada recurso que faz o serviço (na ordem de preferência).
 * Cada recurso tem a própria agenda; bloqueios sem recurso valem para todos.
 */
async function slotsByResource(date: string, service: PublicService, settings: Settings, respectNotice: boolean) {
  const nextDay = addDays(date, 1);
  const [resourceIds, hours, busy, blocks] = await Promise.all([
    listServiceResources(service.id),
    listBusinessHours(),
    listBusy(`${date}T00:00`, `${nextDay}T00:00`),
    listBlocks(`${date}T00:00`, `${nextDay}T00:00`),
  ]);
  const dayHours = hours.find((h) => h.dia_semana === weekdayOf(date));
  const now = nowInTz(settings.timezone);
  return resourceIds.map((recursoId) => ({
    recursoId,
    slots: computeSlots({
      date,
      hours: dayHours,
      appointments: busy.filter((b) => b.recurso_id === recursoId),
      blocks: blocks.filter((b) => b.recurso_id === null || b.recurso_id === recursoId),
      now,
      minNoticeMin: respectNotice ? settings.antecedencia_horas * 60 : 0,
      durationMin: service.duracao_minutos,
      bufferMin: settings.intervalo_minutos,
      stepMin: settings.passo_minutos,
    }),
  }));
}

/** Um horário está livre se QUALQUER recurso do serviço estiver livre nele. */
const unionSlots = (byResource: { slots: string[] }[]) => [...new Set(byResource.flatMap((r) => r.slots))].sort();

export async function getAvailableSlots(date: string, serviceId: string) {
  if (!isValidDate(date)) return { error: "data_invalida" as const };
  const [settings, service] = await Promise.all([getSettings(), getActiveService(serviceId)]);
  if (!service) return { error: "servico_invalido" as const };
  const { first, last } = bookingWindow(settings);
  if (date < first || date > last) return { slots: [] };
  return { slots: unionSlots(await slotsByResource(date, service, settings, true)) };
}

export interface BookingRequest {
  servicoId: string;
  date: string;
  time: string;
  nome: string;
  whatsapp: string;
  observacao: string;
}

/**
 * Cria o agendamento. Pelo site (origem "site") valem a janela e a antecedência mínima;
 * pelo painel a dona pode encaixar alguém para daqui a pouco.
 */
export async function createBooking(
  req: BookingRequest,
  origem: "site" | "painel" = "site",
): Promise<{ ok: true; id: string; service: PublicService } | { ok: false; error: BookingError }> {
  const [settings, service] = await Promise.all([getSettings(), getActiveService(req.servicoId)]);
  if (!service) return { ok: false, error: "servico_invalido" };
  if (!isValidDate(req.date)) return { ok: false, error: "data_invalida" };
  if (origem === "site") {
    const { first, last } = bookingWindow(settings);
    if (req.date < first || req.date > last) return { ok: false, error: "data_invalida" };
  }

  const candidates = (await slotsByResource(req.date, service, settings, origem === "site"))
    .filter((r) => r.slots.includes(req.time))
    .map((r) => r.recursoId);
  if (candidates.length === 0) return { ok: false, error: "horario_indisponivel" };

  const starts_at = `${req.date}T${req.time}`;
  const ends_at = addMinutes(starts_at, service.duracao_minutos);
  // Tenta o primeiro recurso livre; se alguém o pegou no mesmo segundo (o banco recusa), tenta o próximo.
  for (const recurso_id of candidates) {
    try {
      const id = await insertAppointment({
        nome: req.nome,
        whatsapp: req.whatsapp,
        servico: service,
        recurso_id,
        starts_at,
        ends_at,
        blocked_until: addMinutes(ends_at, settings.intervalo_minutos),
        observacao: req.observacao,
        origem,
      });
      return { ok: true, id, service };
    } catch (e) {
      if (!isConflictError(e)) throw e;
    }
  }
  return { ok: false, error: "horario_indisponivel" };
}
