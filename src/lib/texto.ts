/** Minúsculas e sem acentos, para busca tolerante. */
export function normalizarTexto(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normaliza o número do contrato para a regra de duplicidade:
 * "012/2024" -> "12", "  0045 " -> "45", "CT-07" -> "ct-07".
 */
export function normalizarNumero(numero: string): string {
  let n = numero.trim();
  const barra = n.match(/^(.+?)\s*\/\s*(\d{2,4})$/);
  if (barra) n = barra[1];
  n = n.replace(/^0+(?=\d)/, "");
  return normalizarTexto(n);
}

/** Extrai o ano de "012/2024", se houver. */
export function anoDoNumero(numero: string): number | null {
  const m = numero.trim().match(/\/\s*(\d{4})$/);
  return m ? Number(m[1]) : null;
}

export function somenteDigitos(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

export function cnpjValido(cnpj: string): boolean {
  const c = somenteDigitos(cnpj);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (base: string, pesos: number[]) => {
    const soma = base.split("").reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(c.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}
