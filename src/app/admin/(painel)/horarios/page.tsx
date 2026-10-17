import { Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Card, Label, PageTitle } from "@/components/admin/page-title";
import { inputClass } from "@/components/ui/button";
import { getSettings, listBlocks, listBusinessHours, listResources } from "@/lib/data";
import { WEEKDAYS, addDays, capitalize, formatDateLong, formatDateShort, timePart, todayInTz } from "@/lib/time";
import type { Block } from "@/lib/types";
import { addBlock, removeBlock, saveHours } from "../actions";

export default async function HorariosPage() {
  const settings = await getSettings();
  const today = todayInTz(settings.timezone);
  const [hours, blocks, resources] = await Promise.all([
    listBusinessHours(),
    listBlocks(`${today}T00:00`, `${addDays(today, 400)}T00:00`),
    listResources(),
  ]);
  const names = new Map(resources.map((r) => [r.id, r.nome]));
  const week = [...hours.filter((h) => h.dia_semana !== 0), ...hours.filter((h) => h.dia_semana === 0)];
  const small = `${inputClass} px-2 py-2`;

  return (
    <>
      <PageTitle title="Horários" subtitle="Quando você atende. O site só oferece horários dentro do expediente." />

      <Card>
        <ActionForm action={saveHours}>
          <div className="space-y-3">
            {week.map((h) => (
              <fieldset
                key={h.dia_semana}
                className="grid grid-cols-2 items-end gap-2 border-b border-line pb-3 sm:grid-cols-[9rem_repeat(4,1fr)]"
              >
                <label className="col-span-2 flex items-center gap-2 pb-2 font-medium sm:col-span-1">
                  <input type="checkbox" name={`atende_${h.dia_semana}`} defaultChecked={h.atende} className="size-4 accent-primary" />
                  {WEEKDAYS[h.dia_semana]}
                </label>
                <Label text="Abre">
                  <input type="time" name={`abre_${h.dia_semana}`} defaultValue={h.abre} className={small} />
                </Label>
                <Label text="Fecha">
                  <input type="time" name={`fecha_${h.dia_semana}`} defaultValue={h.fecha} className={small} />
                </Label>
                <Label text="Pausa de">
                  <input type="time" name={`pausa_inicio_${h.dia_semana}`} defaultValue={h.pausa_inicio ?? ""} className={small} />
                </Label>
                <Label text="até">
                  <input type="time" name={`pausa_fim_${h.dia_semana}`} defaultValue={h.pausa_fim ?? ""} className={small} />
                </Label>
              </fieldset>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">A pausa é opcional (ex.: almoço). Deixe os dois campos vazios para não ter pausa.</p>
          <SubmitButton className="mt-4">Salvar horários</SubmitButton>
        </ActionForm>
      </Card>

      <h2 className="mb-1 mt-10 text-2xl font-semibold">Bloqueios</h2>
      <p className="mb-4 text-sm text-muted">Folgas, feriados, viagens ou um compromisso: o site não oferece esses horários.</p>

      <Card>
        <ActionForm action={addBlock} className="grid gap-4 sm:grid-cols-2">
          <Label text="De (data)">
            <input type="date" name="data" required min={today} defaultValue={today} className={inputClass} />
          </Label>
          <Label text="Até (data, opcional)">
            <input type="date" name="ate" min={today} className={inputClass} />
          </Label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="dia_inteiro" defaultChecked className="size-4 accent-primary" /> Dia inteiro (desmarque para
            bloquear só algumas horas)
          </label>
          <Label text="Hora de início">
            <input type="time" name="inicio" className={inputClass} />
          </Label>
          <Label text="Hora de fim">
            <input type="time" name="fim" className={inputClass} />
          </Label>
          {resources.length > 1 && (
            <Label text={`${settings.rotulo_recurso}`} className="sm:col-span-2">
              <select name="recurso_id" className={inputClass}>
                <option value="">Todos</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </Label>
          )}
          <Label text="Motivo (só você vê)" className="sm:col-span-2">
            <input name="motivo" maxLength={120} placeholder="Ex.: feriado, consulta médica" className={inputClass} />
          </Label>
          <div className="sm:col-span-2">
            <SubmitButton>Bloquear</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      {blocks.length > 0 && (
        <ul className="mt-4 space-y-2">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
              <span>
                <span className="font-medium">{describeBlock(b)}</span>
                {resources.length > 1 && <span className="text-muted"> · {b.recurso_id ? names.get(b.recurso_id) : "todos"}</span>}
                {b.motivo && <span className="text-muted"> · {b.motivo}</span>}
              </span>
              <ActionForm action={removeBlock} confirm="Remover este bloqueio?">
                <input type="hidden" name="id" value={b.id} />
                <button
                  type="submit"
                  className="rounded-full p-2 text-muted hover:bg-danger-soft hover:text-danger"
                  aria-label="Remover bloqueio"
                >
                  <Trash2 className="size-4" />
                </button>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function describeBlock(b: Block) {
  const allDay = timePart(b.inicio) === "00:00" && timePart(b.fim) === "00:00";
  const first = b.inicio.slice(0, 10);
  const last = allDay ? addDays(b.fim.slice(0, 10), -1) : b.fim.slice(0, 10);
  if (allDay) return first === last ? capitalize(formatDateLong(first)) : `${formatDateShort(first)} a ${formatDateShort(last)}`;
  if (first === last) return `${capitalize(formatDateLong(first))}, ${timePart(b.inicio)} às ${timePart(b.fim)}`;
  return `${formatDateShort(first)} ${timePart(b.inicio)} a ${formatDateShort(last)} ${timePart(b.fim)}`;
}
