/**
 * Data e hora SEM fuso horário.
 * Tudo é string: "YYYY-MM-DD", "HH:mm" e "YYYY-MM-DDTHH:mm". O UTC serve só de
 * calculadora interna (sem horário de verão, sem surpresa de fuso).
 */

const pad = (n: number) => String(n).padStart(2, "0");

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDate(s: string) {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function utcFromDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dateFromUtc(dt: Date) {
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(date: string, n: number) {
  const dt = utcFromDate(date);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dateFromUtc(dt);
}

/** 0 = domingo … 6 = sábado */
export function weekdayOf(date: string) {
  return utcFromDate(date).getUTCDay();
}

export function startOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(date: string, n: number) {
  const [y, m] = date.split("-").map(Number);
  return dateFromUtc(new Date(Date.UTC(y, m - 1 + n, 1)));
}

export function daysInMonth(date: string) {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** "09:30" → 570 */
export function toMin(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** datetime → minutos absolutos (comparável e somável). */
export function dtToAbs(dt: string) {
  const [date, time] = dt.split("T");
  return Math.floor(utcFromDate(date).getTime() / 60_000) + toMin(time);
}

export function absToDt(abs: number) {
  const dt = new Date(abs * 60_000);
  return `${dateFromUtc(dt)}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
}

export function addMinutes(dt: string, n: number) {
  return absToDt(dtToAbs(dt) + n);
}

/**
 * Regra ÚNICA de sobreposição (intervalos [início, fim)): só há conflito quando
 * novoInício < fimExistente E novoFim > inícioExistente. Terminar às 16:00 e outro
 * começar às 16:00 não é conflito. É a mesma regra da constraint do banco.
 */
export const intervalsOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && aEnd > bStart;

export const datePart = (dt: string) => dt.slice(0, 10);
export const timePart = (dt: string) => dt.slice(11, 16);

/* ---------- "agora" no fuso do negócio ---------- */

export function nowInTz(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export const todayInTz = (timezone: string) => datePart(nowInTz(timezone));

/* ---------- formatação pt-BR ---------- */

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { ...opts, timeZone: "UTC" }).format(utcFromDate(date));

export const formatDateLong = (date: string) => fmt(date, { weekday: "long", day: "numeric", month: "long" });
export const formatDateShort = (date: string) => fmt(date, { day: "2-digit", month: "2-digit" });
export const formatMonthYear = (date: string) => fmt(date, { month: "long", year: "numeric" });
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h${pad(m)}`;
  if (h) return h === 1 ? "1 hora" : `${h} horas`;
  return `${m} min`;
}
