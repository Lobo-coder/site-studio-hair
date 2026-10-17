/**
 * Regra de negócio central: quais horários estão livres num dia.
 * Função PURA (sem banco, sem relógio): tudo entra por parâmetro, então é fácil de testar.
 *
 * - Cada agendamento ativo ocupa [starts_at, blocked_until), onde blocked_until é o fim do
 *   atendimento + intervalo entre clientes (padrão 0).
 * - Um atendimento novo que começa em `t` precisa de [t, t + duração + intervalo) livre.
 * - A pausa do dia e os bloqueios valem só para o atendimento em si (sem o intervalo).
 */
import type { BusinessHour } from "./types";
import { absToDt, dtToAbs, intervalsOverlap, timePart, toMin } from "./time";

export interface BusyPeriod {
  starts_at: string;
  blocked_until: string;
}

export interface BlockedPeriod {
  inicio: string;
  fim: string;
}

export interface SlotInput {
  date: string;
  hours?: BusinessHour;
  /** Somente agendamentos ATIVOS. */
  appointments: BusyPeriod[];
  blocks: BlockedPeriod[];
  /** "Agora" no fuso do negócio. Omitido = sem restrição de passado. */
  now?: string;
  minNoticeMin?: number;
  durationMin: number;
  bufferMin: number;
  stepMin: number;
}

type Range = [number, number];

const overlaps = (a: Range, b: Range) => intervalsOverlap(a[0], a[1], b[0], b[1]);

export function computeSlots(input: SlotInput): string[] {
  const { date, hours, durationMin, bufferMin, stepMin } = input;
  if (!hours || !hours.atende || durationMin <= 0 || stepMin <= 0) return [];

  const day0 = dtToAbs(`${date}T00:00`);
  const open = day0 + toMin(hours.abre);
  const close = day0 + toMin(hours.fecha);
  if (close <= open) return [];
  const pause: Range | null =
    hours.pausa_inicio && hours.pausa_fim ? [day0 + toMin(hours.pausa_inicio), day0 + toMin(hours.pausa_fim)] : null;

  const busy: Range[] = input.appointments.map((a) => [dtToAbs(a.starts_at), dtToAbs(a.blocked_until)]);
  const blocks: Range[] = input.blocks.map((b) => [dtToAbs(b.inicio), dtToAbs(b.fim)]);
  const earliest = input.now ? dtToAbs(input.now) + (input.minNoticeMin ?? 0) : -Infinity;
  const latestStart = close - durationMin;

  // Candidatos: a grade regular + "encaixes" logo depois de cada obstáculo, para não
  // desperdiçar tempo (ex.: atendimento até 15:10 → oferece 15:10, não só 15:30).
  const candidates = new Set<number>();
  for (let t = open; t <= latestStart; t += stepMin) candidates.add(t);
  const anchors = [...busy.map((b) => b[1]), ...blocks.map((b) => b[1])];
  if (pause) anchors.push(pause[1]);
  for (const t of anchors) if (t >= open && t <= latestStart) candidates.add(t);

  return [...candidates]
    .sort((a, b) => a - b)
    .filter((t) => {
      if (t < earliest) return false;
      const service: Range = [t, t + durationMin];
      if (pause && overlaps(service, pause)) return false;
      if (blocks.some((b) => overlaps(service, b))) return false;
      const withBuffer: Range = [t, t + durationMin + bufferMin];
      return !busy.some((b) => overlaps(withBuffer, b));
    })
    .map((t) => timePart(absToDt(t)));
}

/** Texto do horário de um dia ("09:00 às 18:00"). */
export function describeHours(h: BusinessHour) {
  if (!h.atende) return "Fechado";
  const base = `${h.abre} às ${h.fecha}`;
  return h.pausa_inicio && h.pausa_fim ? `${base} (pausa ${h.pausa_inicio}–${h.pausa_fim})` : base;
}
