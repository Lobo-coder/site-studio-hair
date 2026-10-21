import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { RETENCAO_MESES, getSettings } from "@/lib/data";
import { formatPhone, whatsappLink } from "@/lib/format";

export const metadata: Metadata = { title: "Privacidade" };

/**
 * Aviso de privacidade (LGPD). Descreve SÓ o que o sistema faz de verdade: se mudar o que é
 * coletado, os cookies ou o prazo de retenção, atualize este texto junto.
 * O negócio é o controlador dos dados; quem desenvolve e hospeda o site é operador.
 */
export default async function PrivacidadePage() {
  const s = await getSettings();
  const contato = s.whatsapp ? (
    <a href={whatsappLink(s.whatsapp)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
      WhatsApp {formatPhone(s.whatsapp)}
    </a>
  ) : (
    "os nossos canais de atendimento"
  );

  return (
    <>
      <header className="border-b border-line/70 bg-bg">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Brand name={s.nome_negocio} />
          <Link href="/" className="flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 leading-relaxed">
        <h1 className="font-display text-4xl">Privacidade</h1>
        <p className="mt-3 text-muted">Como {s.nome_negocio} cuida dos dados de quem agenda por este site.</p>

        <div className="mt-10 space-y-8 text-[15px]">
          <section>
            <h2 className="font-display text-2xl">Quais dados</h2>
            <p className="mt-2">
              Para reservar o seu horário pedimos só o <strong>nome</strong> e o <strong>WhatsApp</strong>, e você pode deixar uma
              observação se quiser. Junto ficam guardados o serviço, o dia e o horário escolhidos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl">Para que</h2>
            <p className="mt-2">
              Para organizar a agenda, confirmar o atendimento e, se precisar, falar com você pelo WhatsApp sobre o horário (por
              exemplo, um lembrete ou uma remarcação). Seus dados são usados para atender ao seu pedido de agendamento (LGPD, art.
              7º, V) e não são vendidos nem usados para propaganda.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl">Quem tem acesso</h2>
            <p className="mt-2">
              A equipe de {s.nome_negocio}, pelo painel do site, que exige login, e quem mantém o site, só quando precisa dar
              suporte. O site fica hospedado na Vercel e os dados num banco de dados da Neon, empresas que apenas armazenam as
              informações para que o site funcione.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl">Cookies</h2>
            <p className="mt-2">
              Este site não usa cookies de propaganda nem ferramentas de rastreamento. O único cookie é o de login da equipe no
              painel, necessário para o painel funcionar.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl">Por quanto tempo</h2>
            <p className="mt-2">
              O histórico de agendamentos é apagado automaticamente depois de {RETENCAO_MESES} meses. Você pode pedir para apagar os
              seus dados antes disso.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl">Seus direitos</h2>
            <p className="mt-2">
              Você pode pedir para ver, corrigir ou apagar os seus dados a qualquer momento pelo {contato}
              {s.endereco ? <> ou pessoalmente em {s.endereco}</> : null}.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
