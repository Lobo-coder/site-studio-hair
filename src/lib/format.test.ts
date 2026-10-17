import { describe, expect, it } from "vitest";
import { fillMessage, formatPhone, normalizePhone, parseMoney } from "./format";

describe("telefone", () => {
  it("normaliza formatos comuns para 55 + DDD + número", () => {
    expect(normalizePhone("(83) 99999-8888")).toBe("5583999998888");
    expect(normalizePhone("+55 83 99999-8888")).toBe("5583999998888");
    expect(normalizePhone("8332221111")).toBe("558332221111");
    expect(normalizePhone("99999-8888")).toBeNull();
  });
  it("formata para exibir", () => {
    expect(formatPhone("5583999998888")).toBe("(83) 99999-8888");
  });
});

describe("dinheiro", () => {
  it("entende vírgula, ponto de milhar e R$", () => {
    expect(parseMoney("50")).toBe(5000);
    expect(parseMoney("35,50")).toBe(3550);
    expect(parseMoney("R$ 1.234,56")).toBe(123456);
    expect(parseMoney("abc")).toBeNull();
  });
});

describe("mensagem", () => {
  it("troca as variáveis e usa só o primeiro nome", () => {
    const msg = fillMessage("Oi [NOME], [SERVIÇO] em [DATA] às [HORÁRIO]", {
      nome: "Maria Clara Souza",
      servico: "Corte",
      data: "2026-10-12",
      horario: "14:00",
    });
    expect(msg).toBe("Oi Maria, Corte em segunda-feira, 12 de outubro às 14:00");
  });
});
