import { createBooking } from "@/lib/booking";
import { getSettings } from "@/lib/data";
import { fillMessage, whatsappLink } from "@/lib/format";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { bookingSchema, firstError } from "@/lib/validation";

const ERRORS = {
  servico_invalido: "Esse serviço não está mais disponível.",
  data_invalida: "Essa data não está disponível para agendamento.",
  horario_indisponivel: "Esse horário acabou de ser ocupado. Escolha outro, por favor.",
} as const;

/** POST /api/agendar — cria o agendamento e devolve o link do WhatsApp de confirmação. */
export async function POST(request: Request) {
  if (!rateLimit(`agendar:${clientIp(request.headers)}`, 8, 10 * 60_000)) {
    return Response.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });

  const result = await createBooking(parsed.data);
  if (!result.ok) {
    const status = result.error === "horario_indisponivel" ? 409 : 400;
    return Response.json({ error: ERRORS[result.error], code: result.error }, { status });
  }

  const settings = await getSettings();
  const text = fillMessage(settings.msg_agendamento, {
    nome: parsed.data.nome,
    servico: result.service.nome,
    data: parsed.data.date,
    horario: parsed.data.time,
  });
  return Response.json(
    { id: result.id, whatsappUrl: settings.whatsapp ? whatsappLink(settings.whatsapp, text) : null },
    { status: 201 },
  );
}
