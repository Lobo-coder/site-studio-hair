import { describe, expect, it } from "vitest";
import { computeSlots } from "./availability";
import type { BusinessHour } from "./types";

const hours: BusinessHour = { dia_semana: 1, atende: true, abre: "09:00", fecha: "12:00", pausa_inicio: null, pausa_fim: null };
const base = { date: "2026-10-12", hours, appointments: [], blocks: [], durationMin: 60, bufferMin: 0, stepMin: 30 };

describe("computeSlots", () => {
  it("oferece a grade do expediente sem passar do fechamento", () => {
    expect(computeSlots(base)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("dia fechado não tem horários", () => {
    expect(computeSlots({ ...base, hours: { ...hours, atende: false } })).toEqual([]);
    expect(computeSlots({ ...base, hours: undefined })).toEqual([]);
  });

  it("terminar às 10:00 libera as 10:00 (sem conflito na borda)", () => {
    const slots = computeSlots({ ...base, appointments: [{ starts_at: "2026-10-12T09:00", blocked_until: "2026-10-12T10:00" }] });
    expect(slots).toEqual(["10:00", "10:30", "11:00"]);
  });

  it("respeita o intervalo entre clientes e oferece o encaixe logo depois", () => {
    const slots = computeSlots({
      ...base,
      bufferMin: 15,
      appointments: [{ starts_at: "2026-10-12T09:00", blocked_until: "2026-10-12T10:15" }],
    });
    // 10:30 + 60 + 15 cabe até 11:45; 11:00 + 60 = 12:00 no limite.
    expect(slots).toEqual(["10:15", "10:30", "11:00"]);
  });

  it("não marca atendimento atravessando a pausa nem um bloqueio", () => {
    const withPause = computeSlots({ ...base, hours: { ...hours, pausa_inicio: "10:00", pausa_fim: "10:30" } });
    expect(withPause).toEqual(["09:00", "10:30", "11:00"]);
    const withBlock = computeSlots({ ...base, blocks: [{ inicio: "2026-10-12T11:00", fim: "2026-10-12T12:00" }] });
    expect(withBlock).toEqual(["09:00", "09:30", "10:00"]);
  });

  it("aplica a antecedência mínima a partir de agora", () => {
    expect(computeSlots({ ...base, now: "2026-10-12T08:50", minNoticeMin: 60 })).toEqual(["10:00", "10:30", "11:00"]);
  });
});
