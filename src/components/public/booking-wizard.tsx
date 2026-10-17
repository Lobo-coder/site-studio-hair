"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Clock, Loader2, MessageCircle } from "lucide-react";
import { Calendar } from "./calendar";
import { btn, inputClass } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { capitalize, formatDateLong, formatDuration, startOfMonth, weekdayOf } from "@/lib/time";
import type { PublicService } from "@/lib/types";

interface Props {
  services: PublicService[];
  initialServiceId: string | null;
  openWeekdays: number[];
  firstDate: string;
  lastDate: string;
  notice: string;
}

type Step = "servico" | "horario" | "dados" | "pronto";

const STEPS: { id: Step; label: string }[] = [
  { id: "servico", label: "Serviço" },
  { id: "horario", label: "Dia e horário" },
  { id: "dados", label: "Seus dados" },
];

export function BookingWizard({ services, initialServiceId, openWeekdays, firstDate, lastDate, notice }: Props) {
  const [step, setStep] = useState<Step>(initialServiceId ? "horario" : "servico");
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId);
  const [date, setDate] = useState<string | null>(null);
  const [month, setMonth] = useState(startOfMonth(firstDate));
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<{ key: string; list: string[] } | null>(null);
  const [slotsError, setSlotsError] = useState(false);
  const [reload, setReload] = useState(0);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [observacao, setObservacao] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const slotsKey = serviceId && date ? `${serviceId}|${date}|${reload}` : null;
  const loadingSlots = slotsKey !== null && slots?.key !== slotsKey && !slotsError;

  // Busca os horários livres sempre que muda o serviço ou o dia.
  useEffect(() => {
    if (!slotsKey || !serviceId || !date) return;
    let cancelled = false;
    fetch(`/api/horarios?data=${date}&servico=${serviceId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { horarios: string[] }) => !cancelled && setSlots({ key: slotsKey, list: d.horarios }))
      .catch(() => !cancelled && setSlotsError(true));
    return () => {
      cancelled = true;
    };
  }, [slotsKey, serviceId, date]);

  const isDayEnabled = (d: string) => d >= firstDate && d <= lastDate && openWeekdays.includes(weekdayOf(d));

  function pickService(id: string) {
    setServiceId(id);
    setTime(null);
    setSlotsError(false);
    setStep("horario");
  }

  function pickDate(d: string) {
    setDate(d);
    setTime(null);
    setSlotsError(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !date || !time) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicoId: service.id, date, time, nome, whatsapp, observacao }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setWhatsappUrl(data.whatsappUrl ?? null);
        setStep("pronto");
      } else if (res.status === 409) {
        // Alguém pegou o horário enquanto a pessoa preenchia: volta para escolher outro.
        setTime(null);
        setReload((n) => n + 1);
        setStep("horario");
        setError(data.error);
      } else {
        setError(data.error ?? "Não foi possível agendar. Tente de novo.");
      }
    } catch {
      setError("Sem conexão. Verifique a internet e tente de novo.");
    } finally {
      setSending(false);
    }
  }

  if (step === "pronto" && service && date && time) {
    return (
      <div className="animate-fade-up rounded-3xl border border-line bg-surface p-8 text-center shadow-soft">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <Check className="size-7" />
        </span>
        <h1 className="mt-4 text-3xl font-semibold">Horário agendado!</h1>
        <p className="mt-2 text-muted">
          {service.nome} · {capitalize(formatDateLong(date))} às {time}
        </p>
        {notice && <p className="mx-auto mt-5 max-w-md rounded-2xl bg-surface-2 p-4 text-sm text-muted">{notice}</p>}
        <div className="mt-6 flex flex-col items-center gap-3">
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={btn("whatsapp", "lg")}>
              <MessageCircle className="size-5" /> Avisar pelo WhatsApp
            </a>
          )}
          <Link href="/" className={btn("ghost", "md")}>
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div>
      <ol className="mb-6 flex gap-2" aria-label="Etapas">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-line"}`} />
            <p className={`mt-1.5 text-xs ${i === stepIndex ? "font-semibold text-ink" : "text-muted"}`}>{s.label}</p>
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {step === "servico" && (
        <section className="animate-fade-up">
          <h1 className="text-3xl font-semibold">O que você quer agendar?</h1>
          <ul className="mt-5 space-y-3">
            {services.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pickService(s.id)}
                  className={`flex w-full items-center justify-between gap-4 rounded-2xl border bg-surface p-4 text-left transition hover:border-primary/50 ${
                    s.id === serviceId ? "border-primary" : "border-line"
                  }`}
                >
                  <span>
                    <span className="block font-semibold">{s.nome}</span>
                    {s.descricao && <span className="mt-0.5 block text-sm text-muted">{s.descricao}</span>}
                    <span className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <Clock className="size-3.5" /> {formatDuration(s.duracao_minutos)}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold text-primary">{formatMoney(s.preco_centavos)}</span>
                </button>
              </li>
            ))}
          </ul>
          {services.length === 0 && <p className="mt-5 text-muted">Nenhum serviço disponível no momento.</p>}
        </section>
      )}

      {step === "horario" && service && (
        <section className="animate-fade-up">
          <SelectedService service={service} onChange={() => setStep("servico")} />
          <h1 className="mt-6 text-3xl font-semibold">Quando?</h1>
          <div className="mt-5 rounded-3xl border border-line bg-surface p-4 sm:p-6">
            <Calendar
              value={date}
              onChange={pickDate}
              month={month}
              onMonthChange={setMonth}
              isEnabled={isDayEnabled}
              minDate={firstDate}
              maxDate={lastDate}
            />
          </div>

          {date && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold">{capitalize(formatDateLong(date))}</h2>
              {loadingSlots ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin" /> Buscando horários…
                </p>
              ) : slotsError ? (
                <p className="mt-3 text-sm text-danger">Não foi possível carregar os horários. Tente outro dia ou recarregue a página.</p>
              ) : slots?.list.length ? (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {slots.list.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTime(t)}
                      aria-pressed={t === time}
                      className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                        t === time ? "border-primary bg-primary text-white" : "border-line bg-surface hover:border-primary"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">Nenhum horário livre nesse dia. Tente outra data.</p>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={!date || !time}
            onClick={() => {
              setError(null);
              setStep("dados");
            }}
            className={btn("primary", "lg", "mt-8 w-full")}
          >
            Continuar
          </button>
        </section>
      )}

      {step === "dados" && service && date && time && (
        <form onSubmit={submit} className="animate-fade-up">
          <SelectedService service={service} onChange={() => setStep("servico")} />
          <button
            type="button"
            onClick={() => setStep("horario")}
            className="mt-2 w-full rounded-2xl border border-line bg-surface p-4 text-left text-sm hover:border-primary/50"
          >
            <span className="font-semibold">
              {capitalize(formatDateLong(date))} às {time}
            </span>
            <span className="float-right text-primary">Trocar</span>
          </button>

          <h1 className="mt-6 text-3xl font-semibold">Seus dados</h1>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Nome</span>
              <input required minLength={2} maxLength={80} autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">WhatsApp (com DDD)</span>
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(83) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Observação <span className="font-normal text-muted">(opcional)</span>
              </span>
              <textarea rows={3} maxLength={500} value={observacao} onChange={(e) => setObservacao(e.target.value)} className={inputClass} />
            </label>
          </div>
          {notice && <p className="mt-5 rounded-2xl bg-surface-2 p-4 text-sm text-muted">{notice}</p>}
          <button type="submit" disabled={sending} className={btn("primary", "lg", "mt-6 w-full")}>
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
            Confirmar agendamento
          </button>
        </form>
      )}
    </div>
  );
}

function SelectedService({ service, onChange }: { service: PublicService; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-full rounded-2xl border border-line bg-surface p-4 text-left text-sm hover:border-primary/50"
    >
      <span className="font-semibold">{service.nome}</span>
      <span className="text-muted">
        {" "}
        · {formatDuration(service.duracao_minutos)} · {formatMoney(service.preco_centavos)}
      </span>
      <span className="float-right text-primary">Trocar</span>
    </button>
  );
}
