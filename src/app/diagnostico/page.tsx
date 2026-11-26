import { escolherConexao, prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function testar(nome: string, fn: () => Promise<unknown>) {
  const ini = Date.now();
  try {
    const r = await fn();
    return { nome, ok: true, detalhe: String(r), ms: Date.now() - ini };
  } catch (e) {
    // mostra só a mensagem (sem endereço/senha do banco)
    const msg = e instanceof Error ? e.message : String(e);
    return { nome, ok: false, detalhe: msg.replace(/postgres(ql)?:\/\/[^\s"']+/gi, "[url do banco]").slice(0, 600), ms: Date.now() - ini };
  }
}

export default async function Diagnostico() {
  const url = process.env.DATABASE_URL ?? "";
  const { modo } = escolherConexao();
  const testes = [
    { nome: "Variável DATABASE_URL", ok: !!url, detalhe: url ? `definida (tipo: ${url.split(":")[0]})` : "NÃO definida", ms: 0 },
    {
      nome: "Modo de conexão",
      ok: modo !== "padrao",
      detalhe: modo === "pool" ? "pool do Prisma Postgres (recomendado na Vercel)" : modo === "direta" ? "direta, limitada (sem pool disponível)" : "padrão",
      ms: 0,
    },
    await testar("Conexão com o banco", () => prisma.$queryRaw`SELECT 1`.then(() => "ok")),
    await testar("Tabela de contratos", () => prisma.contrato.count().then((n) => `${n} contratos`)),
    await testar("Contratos de exemplo", () => prisma.contrato.count({ where: { exemplo: true } }).then((n) => `${n} de exemplo`)),
    await testar("Setores", () => prisma.setor.count().then((n) => `${n} setores`)),
  ];
  return (
    <div className="cartao p-6">
      <h1 className="mb-4 text-xl font-semibold">Diagnóstico do sistema</h1>
      <ul className="space-y-2 text-sm">
        {testes.map((t) => (
          <li key={t.nome} className={`rounded-md p-3 ${t.ok ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
            <strong>{t.ok ? "✓" : "✗"} {t.nome}</strong> <span className="text-xs opacity-70">({t.ms} ms)</span>
            <p className="mt-1 break-words font-mono text-xs">{t.detalhe}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate-500">Versão: {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"}</p>
    </div>
  );
}
