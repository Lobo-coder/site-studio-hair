import { z } from "zod";
import { normalizePhone } from "./format";
import { DATE_RE, TIME_RE } from "./time";

const trimmed = (max: number) => z.string().trim().max(max);

export const bookingSchema = z.object({
  servicoId: z.uuid({ error: "Escolha um serviço." }),
  date: z.string().regex(DATE_RE, "Data inválida."),
  time: z.string().regex(TIME_RE, "Horário inválido."),
  nome: trimmed(80).min(2, "Digite seu nome."),
  whatsapp: z.string().transform((v, ctx) => {
    const phone = normalizePhone(v);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "WhatsApp inválido. Use DDD + número." });
      return z.NEVER;
    }
    return phone;
  }),
  observacao: trimmed(500).default(""),
});

export type BookingInput = z.input<typeof bookingSchema>;

/** Primeiro erro de validação em texto, para mostrar na tela. */
export const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Dados inválidos.";
