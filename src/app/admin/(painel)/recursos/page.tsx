import { Plus } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Card, Label, PageTitle } from "@/components/admin/page-title";
import { inputClass } from "@/components/ui/button";
import { getSettings, listResources } from "@/lib/data";
import { plural } from "@/lib/format";
import type { Resource } from "@/lib/types";
import { removeResource, saveResource } from "../actions";

export default async function RecursosPage() {
  const [settings, resources] = await Promise.all([getSettings(), listResources()]);
  const label = settings.rotulo_recurso;

  return (
    <>
      <PageTitle
        title={plural(label)}
        subtitle={`Cada ${label.toLowerCase()} tem a própria agenda: dois clientes podem marcar o mesmo horário em ${plural(label).toLowerCase()} diferentes.`}
      />
      <ul className="space-y-3">
        {resources.map((r) => (
          <li key={r.id}>
            <Card>
              <ResourceForm resource={r} />
              <ActionForm action={removeResource} confirm={`Apagar "${r.nome}"?`} className="mt-3">
                <input type="hidden" name="id" value={r.id} />
                <SubmitButton variant="danger" size="sm">
                  Apagar
                </SubmitButton>
              </ActionForm>
            </Card>
          </li>
        ))}
      </ul>

      <details className="group mt-6 rounded-2xl border border-dashed border-line bg-surface" open={resources.length === 0}>
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold">
          <Plus className="size-4 transition group-open:rotate-45" /> Adicionar {label.toLowerCase()}
        </summary>
        <div className="border-t border-line p-4">
          <ResourceForm />
        </div>
      </details>
      <p className="mt-4 text-sm text-muted">
        Depois de adicionar, marque em <strong>Serviços</strong> quais serviços cada um atende. O nome usado aqui (&quot;{label}&quot;) pode
        ser trocado em Ajustes.
      </p>
    </>
  );
}

function ResourceForm({ resource }: { resource?: Resource }) {
  return (
    <ActionForm action={saveResource} className="grid items-end gap-4 sm:grid-cols-[1fr_8rem_auto_auto]">
      {resource && <input type="hidden" name="id" value={resource.id} />}
      <Label text="Nome">
        <input name="nome" required maxLength={60} defaultValue={resource?.nome} className={inputClass} />
      </Label>
      <Label text="Ordem">
        <input name="ordem" type="number" defaultValue={resource?.ordem ?? 0} className={inputClass} />
      </Label>
      <label className="flex items-center gap-2 pb-3 text-sm">
        <input type="checkbox" name="ativo" defaultChecked={resource?.ativo ?? true} className="size-4 accent-primary" /> Ativo
      </label>
      <SubmitButton className="mb-0.5">{resource ? "Salvar" : "Adicionar"}</SubmitButton>
    </ActionForm>
  );
}
