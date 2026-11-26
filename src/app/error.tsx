"use client";

import Link from "next/link";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="cartao space-y-3 p-8 text-center">
      <h1 className="text-xl font-semibold">Ops, algo deu errado ao carregar esta página.</h1>
      <p className="text-slate-600">Tente de novo. Se continuar, abra o diagnóstico e envie um print para o suporte.</p>
      {error.digest && <p className="text-xs text-slate-400">Código do erro: {error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="botao-primario">Tentar de novo</button>
        <Link href="/diagnostico" className="botao-secundario">Abrir diagnóstico</Link>
        <Link href="/contratos" className="botao-secundario">Ir para a busca</Link>
      </div>
    </div>
  );
}
