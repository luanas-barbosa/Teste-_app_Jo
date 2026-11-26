"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { apagarExemplosAcao } from "./acoes";

export default function ApagarExemplos({ quantidade }: { quantidade: number }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <span>
        ⚠ O sistema ainda tem <strong>{quantidade} contratos de exemplo</strong> (fictícios). Apague-os antes de importar os dados reais, para não misturar
        nem confundir números repetidos.
      </span>
      <button
        type="button"
        disabled={pendente}
        className="botao bg-amber-600 text-white hover:bg-amber-700"
        onClick={() => {
          if (!confirm(`Apagar os ${quantidade} contratos de exemplo? Contratos cadastrados por você não são afetados.`)) return;
          iniciar(async () => {
            await apagarExemplosAcao();
            router.refresh();
          });
        }}
      >
        {pendente ? "Apagando…" : "Apagar dados de exemplo"}
      </button>
    </div>
  );
}
