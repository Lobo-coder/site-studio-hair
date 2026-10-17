import { Plus } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Label, PageTitle } from "@/components/admin/page-title";
import { inputClass } from "@/components/ui/button";
import { getSettings, listAllServices, listResources } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { formatDuration } from "@/lib/time";
import type { Resource, Service } from "@/lib/types";
import { removeService, saveService } from "../actions";

export default async function ServicosPage() {
  const [services, resources, settings] = await Promise.all([listAllServices(), listResources(), getSettings()]);
  const names = new Map(resources.map((r) => [r.id, r.nome]));
  const formProps = { resources, label: settings.rotulo_recurso };
  return (
    <>
      <PageTitle title="Serviços" subtitle="O que aparece no site, com preço e duração. A duração define os horários livres." />
      <ul className="space-y-3">
        {services.map((s) => (
          <li key={s.id}>
            <details className="group rounded-2xl border border-line bg-surface">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4">
                <span>
                  <span className="font-semibold">{s.nome}</span>
                  {!s.ativo && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">oculto</span>}
                  <span className="block text-sm text-muted">
                    {formatMoney(s.preco_centavos)} · {formatDuration(s.duracao_minutos)}
                    {resources.length > 1 && ` · ${s.recursos.map((id) => names.get(id)).filter(Boolean).join(", ") || "ninguém atende"}`}
                  </span>
                </span>
                <span className="text-sm font-medium text-primary">Editar</span>
              </summary>
              <div className="border-t border-line p-4">
                <ServiceForm service={s} {...formProps} />
                <ActionForm action={removeService} confirm={`Apagar "${s.nome}"?`} className="mt-3">
                  <input type="hidden" name="id" value={s.id} />
                  <SubmitButton variant="danger" size="sm">
                    Apagar serviço
                  </SubmitButton>
                </ActionForm>
              </div>
            </details>
          </li>
        ))}
      </ul>

      <details className="group mt-6 rounded-2xl border border-dashed border-line bg-surface" open={services.length === 0}>
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold">
          <Plus className="size-4 transition group-open:rotate-45" /> Novo serviço
        </summary>
        <div className="border-t border-line p-4">
          <ServiceForm {...formProps} />
        </div>
      </details>
    </>
  );
}

function ServiceForm({ service, resources, label }: { service?: Service; resources: Resource[]; label: string }) {
  return (
    <ActionForm action={saveService} className="grid gap-4 sm:grid-cols-4">
      {service && <input type="hidden" name="id" value={service.id} />}
      <Label text="Nome" className="sm:col-span-4">
        <input name="nome" required minLength={2} maxLength={80} defaultValue={service?.nome} className={inputClass} />
      </Label>
      <Label text="Descrição (opcional)" className="sm:col-span-4">
        <input name="descricao" maxLength={300} defaultValue={service?.descricao} className={inputClass} />
      </Label>
      <Label text="Preço (R$)">
        <input
          name="preco"
          required
          inputMode="decimal"
          placeholder="50,00"
          defaultValue={service ? (service.preco_centavos / 100).toFixed(2).replace(".", ",") : ""}
          className={inputClass}
        />
      </Label>
      <Label text="Duração (min)">
        <input
          name="duracao_minutos"
          type="number"
          required
          min={5}
          max={600}
          step={5}
          defaultValue={service?.duracao_minutos ?? 60}
          className={inputClass}
        />
      </Label>
      <Label text="Ordem no site">
        <input name="ordem" type="number" defaultValue={service?.ordem ?? 0} className={inputClass} />
      </Label>
      <fieldset className="sm:col-span-4">
        <legend className="mb-1.5 text-sm font-medium">Onde/quem atende ({label.toLowerCase()})</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {resources.map((r) => (
            <label key={r.id} className={`flex items-center gap-2 text-sm ${r.ativo ? "" : "text-muted"}`}>
              <input
                type="checkbox"
                name="recursos"
                value={r.id}
                defaultChecked={service ? service.recursos.includes(r.id) : resources.length === 1}
                className="size-4 accent-primary"
              />
              {r.nome}
              {!r.ativo && " (inativo)"}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input type="checkbox" name="ativo" defaultChecked={service?.ativo ?? true} className="size-4 accent-primary" /> Mostrar no site
      </label>
      <div className="sm:col-span-4">
        <SubmitButton>{service ? "Salvar alterações" : "Criar serviço"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
