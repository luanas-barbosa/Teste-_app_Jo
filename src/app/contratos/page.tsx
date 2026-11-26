import Link from "next/link";
import { buscarContratos, lerParams, opcoesFiltro, urlBusca } from "@/lib/busca";
import { formatarMoeda } from "@/lib/formato";
import Filtros from "./Filtros";
import Tabela from "./Tabela";
import Cards from "./Cards";
import Paginacao from "./Paginacao";
import FalhaServidor from "@/components/FalhaServidor";

export const dynamic = "force-dynamic";

export default async function PaginaBusca({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = lerParams(await searchParams);
  let res: Awaited<ReturnType<typeof buscarContratos>>, opcoes: Awaited<ReturnType<typeof opcoesFiltro>>;
  try {
    [res, opcoes] = await Promise.all([buscarContratos(p), opcoesFiltro()]);
  } catch (e) {
    console.error(e);
    return <FalhaServidor erro={e} />;
  }
  const modo = p.modo === "cards" ? "cards" : "lista";
  const temFiltro = !!(p.q || p.ano || p.setor || p.modalidade || p.status || p.valorMin || p.valorMax);
  const voltar = urlBusca(p); // URL atual, usada pelo botão "voltar" do contrato

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Buscar contratos</h1>
          <p className="text-sm text-slate-600">Pesquise por palavra, número (ex.: 12/2024), empresa, setor…</p>
        </div>
        <Link href="/contratos/novo" className="botao-primario">+ Novo contrato</Link>
      </div>

      <Filtros params={p} opcoes={opcoes} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700" aria-live="polite">
          <strong>{res.total}</strong> {res.total === 1 ? "contrato encontrado" : "contratos encontrados"}
          {res.total > 0 && <> · valor atual somado: <strong>{formatarMoeda(res.somaValor)}</strong></>}
          {temFiltro && (
            <Link href={urlBusca({ modo: p.modo })} className="ml-3 text-marca-600 underline hover:text-marca-800">
              Limpar filtros
            </Link>
          )}
        </p>
        <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-sm shadow-sm" role="group" aria-label="Modo de exibição">
          <Link href={urlBusca(p, { modo: undefined })} className={`rounded px-3 py-1 ${modo === "lista" ? "bg-marca-600 text-white" : "text-slate-700 hover:bg-slate-100"}`} aria-current={modo === "lista"}>
            ☰ Lista
          </Link>
          <Link href={urlBusca(p, { modo: "cards" })} className={`rounded px-3 py-1 ${modo === "cards" ? "bg-marca-600 text-white" : "text-slate-700 hover:bg-slate-100"}`} aria-current={modo === "cards"}>
            ▦ Cards
          </Link>
        </div>
      </div>

      {res.total === 0 ? (
        <div className="cartao p-10 text-center text-slate-600">
          <p className="text-lg">Nenhum contrato encontrado.</p>
          <p className="mt-1 text-sm">Tente outra palavra ou remova alguns filtros.</p>
        </div>
      ) : modo === "cards" ? (
        <Cards contratos={res.contratos} voltar={voltar} />
      ) : (
        <>
          <div className="hidden md:block"><Tabela contratos={res.contratos} params={p} voltar={voltar} /></div>
          <div className="md:hidden"><Cards contratos={res.contratos} voltar={voltar} /></div>
        </>
      )}

      <Paginacao params={p} pagina={res.pagina} paginas={res.paginas} porPagina={res.porPagina} />
    </div>
  );
}
