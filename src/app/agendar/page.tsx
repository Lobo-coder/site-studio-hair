import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BookingWizard } from "@/components/public/booking-wizard";
import { Brand } from "@/components/ui/brand";
import { bookingWindow } from "@/lib/booking";
import { getSettings, listBusinessHours, listPublicServices } from "@/lib/data";

export const metadata: Metadata = { title: "Agendar" };

export default async function AgendarPage({ searchParams }: PageProps<"/agendar">) {
  const [{ servico }, settings, services, hours] = await Promise.all([
    searchParams,
    getSettings(),
    listPublicServices(),
    listBusinessHours(),
  ]);
  const { first, last } = bookingWindow(settings);
  const initialServiceId = typeof servico === "string" && services.some((s) => s.id === servico) ? servico : null;

  return (
    <>
      <header className="border-b border-line/70 bg-bg">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Brand name={settings.nome_negocio} />
          <Link href="/" className="flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <BookingWizard
          services={services}
          initialServiceId={initialServiceId}
          openWeekdays={hours.filter((h) => h.atende).map((h) => h.dia_semana)}
          firstDate={first}
          lastDate={last}
          notice={settings.aviso_agendamento}
        />
      </main>
    </>
  );
}
