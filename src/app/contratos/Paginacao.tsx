import Link from "next/link";
import { TAMANHOS_PAGINA, urlBusca, type ParamsBusca } from "@/lib/busca";

export default function Paginacao({ params, pagina, paginas, porPagina }: { params: ParamsBusca; pagina: number; paginas: number; porPagina: number }) {
  const ir = (n: number) => urlBusca(params, { pagina: n === 1 ? undefined : String(n) });
  const nums = Array.from({ length: paginas }, (_, i) => i + 1).filter((n) => n === 1 || n === paginas || Math.abs(n - pagina) <= 2);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Paginação">
      <div className="flex flex-wrap items-center gap-1">
        {pagina > 1 ? <Link href={ir(pagina - 1)} className="botao-secundario px-3 py-1.5">← Anterior</Link> : <span className="botao-secundario px-3 py-1.5 opacity-40">← Anterior</span>}
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
            <Link href={ir(n)} aria-current={n === pagina ? "page" : undefined} className={`rounded-md px-3 py-1.5 ${n === pagina ? "bg-marca-600 text-white" : "hover:bg-slate-200"}`}>{n}</Link>
          </span>
        ))}
        {pagina < paginas ? <Link href={ir(pagina + 1)} className="botao-secundario px-3 py-1.5">Próxima →</Link> : <span className="botao-secundario px-3 py-1.5 opacity-40">Próxima →</span>}
      </div>
      <div className="flex items-center gap-1 text-slate-600">
        Por página:
        {TAMANHOS_PAGINA.map((t) => (
          <Link key={t} href={urlBusca(params, { porPagina: t === 24 ? undefined : String(t), pagina: undefined })} className={`rounded px-2 py-1 ${t === porPagina ? "bg-slate-200 font-medium text-slate-900" : "hover:bg-slate-100"}`}>{t}</Link>
        ))}
      </div>
    </nav>
  );
}
