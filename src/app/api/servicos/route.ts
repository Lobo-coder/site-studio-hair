import { listPublicServices } from "@/lib/data";

/** GET /api/servicos — serviços ativos, na ordem do painel. */
export async function GET() {
  return Response.json({ servicos: await listPublicServices() });
}
