import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Card, Label, PageTitle } from "@/components/admin/page-title";
import { inputClass } from "@/components/ui/button";
import { getSettings } from "@/lib/data";
import { formatPhone } from "@/lib/format";
import { saveSettings } from "../actions";

export default async function ConfiguracoesPage() {
  const s = await getSettings();
  return (
    <>
      <PageTitle title="Ajustes" subtitle="Textos do site, contatos e regras da agenda." />
      <ActionForm action={saveSettings} className="space-y-6">
        <Card className="grid gap-4 sm:grid-cols-2">
          <h2 className="text-xl font-semibold sm:col-span-2">Site</h2>
          <Label text="Nome do negócio">
            <input name="nome_negocio" required defaultValue={s.nome_negocio} className={inputClass} />
          </Label>
          <Label text="Frase curta (acima do título)">
            <input name="slogan" defaultValue={s.slogan} className={inputClass} />
          </Label>
          <Label text="Título principal" className="sm:col-span-2">
            <input name="hero_titulo" defaultValue={s.hero_titulo} className={inputClass} />
          </Label>
          <Label text="Texto abaixo do título" className="sm:col-span-2">
            <textarea name="hero_subtitulo" rows={2} defaultValue={s.hero_subtitulo} className={inputClass} />
          </Label>
          <Label text="Sobre o negócio (opcional)" className="sm:col-span-2">
            <textarea name="sobre" rows={3} defaultValue={s.sobre} className={inputClass} />
          </Label>
        </Card>

        <Card className="grid gap-4 sm:grid-cols-2">
          <h2 className="text-xl font-semibold sm:col-span-2">Contato</h2>
          <Label text="WhatsApp do negócio">
            <input name="whatsapp" type="tel" defaultValue={s.whatsapp ? formatPhone(s.whatsapp) : ""} className={inputClass} />
          </Label>
          <Label text="Instagram (sem @)">
            <input name="instagram" defaultValue={s.instagram} className={inputClass} />
          </Label>
          <Label text="Endereço" className="sm:col-span-2">
            <input name="endereco" defaultValue={s.endereco} className={inputClass} />
          </Label>
          <Label text="Link do Google Maps (opcional)" className="sm:col-span-2">
            <input name="mapa_url" type="url" placeholder="https://maps.app.goo.gl/…" defaultValue={s.mapa_url} className={inputClass} />
          </Label>
        </Card>

        <Card className="grid gap-4 sm:grid-cols-2">
          <h2 className="text-xl font-semibold sm:col-span-2">Agenda</h2>
          <Label text="Intervalo entre clientes (min)">
            <input name="intervalo_minutos" type="number" min={0} max={120} defaultValue={s.intervalo_minutos} className={inputClass} />
          </Label>
          <Label text="Horários de quanto em quanto tempo (min)">
            <input name="passo_minutos" type="number" min={5} max={120} defaultValue={s.passo_minutos} className={inputClass} />
          </Label>
          <Label text="Antecedência mínima para agendar (horas)">
            <input name="antecedencia_horas" type="number" min={0} max={168} defaultValue={s.antecedencia_horas} className={inputClass} />
          </Label>
          <Label text="Agenda aberta para os próximos (dias)">
            <input name="janela_dias" type="number" min={7} max={365} defaultValue={s.janela_dias} className={inputClass} />
          </Label>
          <Label text="Como você chama cada agenda (ex.: Profissional, Quadra, Sala)" className="sm:col-span-2">
            <input name="rotulo_recurso" maxLength={30} defaultValue={s.rotulo_recurso} className={inputClass} />
          </Label>
          <Label text="Aviso mostrado ao agendar (opcional)" className="sm:col-span-2">
            <textarea name="aviso_agendamento" rows={2} defaultValue={s.aviso_agendamento} className={inputClass} />
          </Label>
        </Card>

        <Card className="grid gap-4">
          <h2 className="text-xl font-semibold">Mensagens de WhatsApp</h2>
          <p className="text-sm text-muted">Use [NOME], [SERVIÇO], [DATA] e [HORÁRIO]: são trocados pelos dados do agendamento.</p>
          <Label text="Mensagem que a cliente manda depois de agendar">
            <textarea name="msg_agendamento" rows={3} defaultValue={s.msg_agendamento} className={inputClass} />
          </Label>
          <Label text="Lembrete que você manda para a cliente">
            <textarea name="msg_lembrete" rows={3} defaultValue={s.msg_lembrete} className={inputClass} />
          </Label>
        </Card>

        <SubmitButton size="lg">Salvar ajustes</SubmitButton>
      </ActionForm>
    </>
  );
}
