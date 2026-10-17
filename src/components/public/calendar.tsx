"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAYS_SHORT, addDays, addMonths, capitalize, daysInMonth, formatMonthYear, startOfMonth, weekdayOf } from "@/lib/time";

interface Props {
  value: string | null;
  onChange: (date: string) => void;
  month: string; // YYYY-MM-01
  onMonthChange: (month: string) => void;
  isEnabled: (date: string) => boolean;
  minDate: string;
  maxDate: string;
}

export function Calendar({ value, onChange, month, onMonthChange, isEnabled, minDate, maxDate }: Props) {
  const lead = weekdayOf(month);
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => addDays(month, i));
  const canPrev = month > startOfMonth(minDate);
  const canNext = addMonths(month, 1) <= maxDate;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, -1))}
          disabled={!canPrev}
          className="rounded-full p-2 text-muted hover:bg-surface-2 disabled:opacity-30"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="font-display text-lg font-semibold">{capitalize(formatMonthYear(month))}</p>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          disabled={!canNext}
          className="rounded-full p-2 text-muted hover:bg-surface-2 disabled:opacity-30"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
        {WEEKDAYS_SHORT.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {days.map((d) => {
          const enabled = isEnabled(d);
          const selected = d === value;
          return (
            <button
              key={d}
              type="button"
              disabled={!enabled}
              onClick={() => onChange(d)}
              aria-pressed={selected}
              className={`aspect-square rounded-xl text-sm font-medium transition ${
                selected
                  ? "bg-primary text-white"
                  : enabled
                    ? "bg-surface text-ink hover:bg-primary-soft"
                    : "text-muted/40"
              }`}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
