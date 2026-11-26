"use client";

import { useRouter } from "next/navigation";

export default function FiltrosPainel({
  ano,
  setor,
  medida,
  opcoes,
}: {
  ano?: string;
  setor?: string;
  medida: "quantidade" | "valor";
  opcoes: { anos: number[]; setores: { id: number; nome: string }[] };
}) {
  const router = useRouter();
  const ir = (mud: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const final = { ano, setor, medida: medida === "valor" ? "valor" : undefined, ...mud };
    for (const [k, v] of Object.entries(final)) if (v) p.set(k, v);
    router.push(`/${p.toString() ? `?${p}` : ""}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="rotulo">Ano</span>
        <select className="campo" value={ano ?? ""} onChange={(e) => ir({ ano: e.target.value || undefined })}>
          <option value="">Todos</option>
          {opcoes.anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="rotulo">Setor</span>
        <select className="campo" value={setor ?? ""} onChange={(e) => ir({ setor: e.target.value || undefined })}>
          <option value="">Todos</option>
          {opcoes.setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </label>
      <div>
        <span className="rotulo">Gráficos mostram</span>
        <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-sm shadow-sm" role="group">
          {(["quantidade", "valor"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => ir({ medida: m === "valor" ? "valor" : undefined })}
              aria-pressed={medida === m}
              className={`rounded px-3 py-1.5 ${medida === m ? "bg-marca-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >
              {m === "quantidade" ? "Quantidade" : "Valor (R$)"}
            </button>
          ))}
        </div>
      </div>
      {(ano || setor) && (
        <button type="button" onClick={() => ir({ ano: undefined, setor: undefined })} className="pb-2 text-sm text-marca-700 underline">
          Limpar filtros
        </button>
      )}
    </div>
  );
}
