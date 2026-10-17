import type { NextRequest } from "next/server";
import { getAvailableSlots } from "@/lib/booking";

/** GET /api/horarios?data=YYYY-MM-DD&servico=<id> — horários livres do dia para o serviço. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const result = await getAvailableSlots(params.get("data") ?? "", params.get("servico") ?? "");
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ horarios: result.slots }, { headers: { "Cache-Control": "no-store" } });
}
