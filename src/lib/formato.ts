const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarMoeda(centavos: bigint | number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "—";
  return moeda.format(Number(centavos) / 100);
}

/** Valores grandes de forma curta: R$ 1,2 mi */
export function formatarMoedaCurta(centavos: bigint | number): string {
  const reais = Number(centavos) / 100;
  if (reais >= 1e9) return `R$ ${(reais / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
  if (reais >= 1e6) return `R$ ${(reais / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (reais >= 1e3) return `R$ ${(reais / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return moeda.format(reais);
}

export function formatarData(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** Date (UTC meia-noite) -> "AAAA-MM-DD" para <input type="date"> */
export function dataParaInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function formatarCnpj(cnpj: string | null | undefined): string {
  const c = (cnpj ?? "").replace(/\D/g, "");
  if (c.length !== 14) return cnpj || "—";
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/** Centavos -> "1234,56" para campos de formulário */
export function centavosParaInput(c: bigint | null | undefined): string {
  if (c === null || c === undefined) return "";
  return (Number(c) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Converte texto em reais para centavos. Aceita "1.234,56", "1234.56", "R$ 1.234", "1234".
 * Retorna null se vazio, NaN se inválido.
 */
export function reaisParaCentavos(s: string | number | null | undefined): bigint | null | typeof NaN {
  if (s === null || s === undefined || s === "") return null;
  if (typeof s === "number") return Number.isFinite(s) ? BigInt(Math.round(s * 100)) : NaN;
  let t = s.replace(/[R$\s]/g, "");
  if (!t) return null;
  if ((t.match(/,/g) ?? []).length > 1) {
    // "364,040,85": a última vírgula é a dos centavos
    const i = t.lastIndexOf(",");
    t = t.slice(0, i).replace(/[.,]/g, "") + "." + t.slice(i + 1);
  } else if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return BigInt(Math.round(n * 100));
}
