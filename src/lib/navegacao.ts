/** Só aceita voltar para a própria busca (evita redirecionamentos para fora). */
export function voltarSeguro(v: string | string[] | undefined): string {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.startsWith("/contratos") && !s.startsWith("//") ? s : "/contratos";
}
