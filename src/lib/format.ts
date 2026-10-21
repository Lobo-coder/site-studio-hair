/** Dinheiro, telefone e mensagens de WhatsApp. Funções puras, usadas no servidor e no navegador. */
import { formatDateLong } from "./time";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatMoney = (centavos: number) => brl.format(centavos / 100);

/** "R$ 35,00" / "35" / "35,5" → centavos. null se inválido. */
export function parseMoney(input: string): number | null {
  const clean = input.replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/**
 * Telefone brasileiro → só dígitos com DDI 55 ("5583999998888").
 * Aceita "(83) 99999-8888", "83999998888", "+55 83 99999-8888". null se inválido.
 */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return /^55\d{10,11}$/.test(d) ? d : null;
}

/** "5583999998888" → "(83) 99999-8888" */
export function formatPhone(digits: string) {
  const d = digits.startsWith("55") ? digits.slice(2) : digits;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export interface MessageData {
  nome: string;
  servico: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
}

/** Troca [NOME], [SERVIÇO], [DATA] e [HORÁRIO] no modelo de mensagem. */
export function fillMessage(template: string, m: MessageData) {
  const firstName = m.nome.trim().split(/\s+/)[0] ?? "";
  return template
    .replaceAll("[NOME]", firstName)
    .replaceAll("[SERVIÇO]", m.servico)
    .replaceAll("[SERVICO]", m.servico)
    .replaceAll("[DATA]", formatDateLong(m.data))
    .replaceAll("[HORÁRIO]", m.horario)
    .replaceAll("[HORARIO]", m.horario);
}

export const whatsappLink = (phone: string, text?: string) =>
  `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/** Plural simples de um rótulo: "Quadra" → "Quadras", "Profissional" → "Profissionais". */
export function plural(word: string) {
  if (/l$/i.test(word)) return word.replace(/l$/i, "is");
  if (/m$/i.test(word)) return word.replace(/m$/i, "ns");
  if (/[rszx]$/i.test(word)) return `${word}es`;
  return `${word}s`;
}
