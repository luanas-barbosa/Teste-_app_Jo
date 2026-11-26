/** Mostra o erro real na tela (sem dados de conexão), para facilitar o suporte. */
export function mensagemErro(e: unknown): string {
  const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return msg.replace(/postgres(ql)?(\+postgres)?:\/\/[^\s"']+/gi, "[url do banco]").replace(/api_key=[^\s&"']+/gi, "api_key=[oculto]").slice(0, 1200);
}

export default function FalhaServidor({ erro }: { erro: unknown }) {
  return (
    <div className="cartao space-y-3 border-rose-200 p-6">
      <h1 className="text-xl font-semibold text-rose-800">Não foi possível carregar os dados</h1>
      <p className="text-sm text-slate-700">Envie um print desta caixa para o suporte:</p>
      <pre className="whitespace-pre-wrap break-words rounded-md bg-slate-900 p-4 text-xs text-slate-100">{mensagemErro(erro)}</pre>
      <p className="text-xs text-slate-500">Versão: {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"}</p>
    </div>
  );
}
