import { describe, expect, it } from "vitest";
import { fmtTime, getTaskState, getTheme, parseDate, parseDateStr, sectorDisplay } from "../helpers";

describe("getTheme", () => {
  it("should return dark theme colors", () => {
    const t = getTheme(true);
    expect(t.bg).toBe("#030712");
    expect(t.text).toBe("#f9fafb");
  });

  it("should return light theme colors", () => {
    const t = getTheme(false);
    expect(t.bg).toBe("#f8fafc");
    expect(t.text).toBe("#0f172a");
  });
});

describe("fmtTime", () => {
  it("should format minutes to hours and minutes", () => {
    expect(fmtTime(150)).toBe("2h 30m");
  });

  it("should return dash for zero", () => {
    expect(fmtTime(0)).toBe("—");
  });

  it("should handle less than an hour", () => {
    expect(fmtTime(45)).toBe("0h 45m");
  });
});

describe("parseDate", () => {
  it("should parse dd/mm/yyyy format", () => {
    const d = parseDate("25/12/2025");
    expect(d).toBeInstanceOf(Date);
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getMonth()).toBe(11); // December = 11
  });

  it("should return null for null input", () => {
    expect(parseDate(null)).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(parseDate("")).toBeNull();
  });
});

describe("parseDateStr", () => {
  it("should parse ISO date string", () => {
    const d = parseDateStr("2025-06-15");
    expect(d).toBeInstanceOf(Date);
  });

  it("should return undefined for undefined", () => {
    expect(parseDateStr(undefined)).toBeUndefined();
  });
});

describe("sectorDisplay", () => {
  it("should return name from object", () => {
    expect(sectorDisplay({ name: "TI", id: 1 })).toBe("TI");
  });

  it("should return mapped name from enum", () => {
    expect(sectorDisplay("AtendimentoAoCliente")).toBe("Atendimento ao Cliente");
  });

  it("should return string as-is if no mapping", () => {
    expect(sectorDisplay("Financeiro")).toBe("Financeiro");
  });

  it("should return empty string for falsy", () => {
    expect(sectorDisplay(null)).toBe("");
    expect(sectorDisplay(undefined)).toBe("");
  });
});

describe("getTaskState", () => {
  it("should return 'Em Atraso' for overdue tasks", () => {
    const result = getTaskState({
      deadline: "2020-01-01",
      status: "A Fazer",
    });
    expect(result?.label).toBe("Em Atraso");
    expect(result?.color).toBe("#ef4444");
  });

  it("should return 'Dentro do Prazo' for on-time tasks", () => {
    const result = getTaskState({
      deadline: "2099-12-31",
      status: "Em Andamento",
    });
    expect(result?.label).toBe("Dentro do Prazo");
    expect(result?.color).toBe("#10b981");
  });

  it("should return null for tasks without deadline", () => {
    expect(getTaskState({ status: "A Fazer" })).toBeNull();
  });

  it("should return 'Entregue no Prazo' for completed on-time tasks", () => {
    const result = getTaskState({
      deadline: "2099-12-31",
      status: "Concluído",
      completed_at: "2025-01-01",
    });
    expect(result).toEqual({ label: "Entregue no Prazo", color: "#059669" });
  });
});
