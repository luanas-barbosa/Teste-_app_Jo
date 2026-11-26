/** "Hoje" no fuso de Brasília, como Date em UTC meia-noite (mesma convenção das colunas @db.Date). */
export function hoje(): Date {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
  return new Date(`${s}T00:00:00Z`);
}

export function somarDias(d: Date, dias: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + dias);
  return r;
}

export function diasEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Aceita "AAAA-MM-DD", "DD/MM/AAAA", "DD/MM/AA", "DD-MM-AAAA", Date, ou número serial do Excel.
 * Retorna Date em UTC meia-noite, null se vazio, ou "invalida".
 */
export function lerData(v: unknown): Date | null | "invalida" {
  if (v === null || v === undefined || v === "") return null;
  let a: number, m: number, d: number;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return "invalida";
    a = v.getFullYear(); m = v.getMonth() + 1; d = v.getDate();
  } else if (typeof v === "number") {
    // serial do Excel (dias desde 1899-12-30)
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000);
    a = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
  } else {
    const s = String(v).trim();
    let r;
    if ((r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { a = +r[1]; m = +r[2]; d = +r[3]; }
    else if ((r = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/))) {
      d = +r[1]; m = +r[2]; a = +r[3]; if (a < 100) a += 2000;
    } else return "invalida";
  }
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "invalida";
  if (a < 1950 || a > 2100) return "invalida";
  return dt;
}
