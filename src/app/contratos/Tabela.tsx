import Link from "next/link";
import { COLUNAS_ORDENAVEIS, urlBusca, type ColunaOrdem, type ContratoListado, type ParamsBusca } from "@/lib/busca";
import { calcularStatus, venceEmBreve } from "@/lib/contratos";
import { hoje } from "@/lib/datas";
import { formatarData, formatarMoeda } from "@/lib/formato";
import StatusBadge from "@/components/StatusBadge";

export function linkContrato(id: number, voltar: string) {
  return `/contratos/${id}?voltar=${encodeURIComponent(voltar)}`;
}

export default function Tabela({ contratos, params, voltar }: { contratos: ContratoListado[]; params: ParamsBusca; voltar: string }) {
  const ref = hoje();

  function Cab({ col, className = "" }: { col: ColunaOrdem; className?: string }) {
    const ativo = params.ordem === col;
    const dir = ativo && params.dir === "asc" ? "desc" : "asc";
    const seta = ativo ? (params.dir === "asc" ? "▲" : "▼") : "↕";
    return (
      <th scope="col" className={`px-3 py-2 font-medium ${className}`} aria-sort={ativo ? (params.dir === "asc" ? "ascending" : "descending") : undefined}>
        <Link href={urlBusca(params, { ordem: col, dir, pagina: undefined })} className="inline-flex items-center gap-1 hover:text-marca-700" title="Clique para ordenar">
          {COLUNAS_ORDENAVEIS[col]} <span className={`text-xs ${ativo ? "text-marca-600" : "text-slate-400"}`}>{seta}</span>
        </Link>
      </th>
    );
  }

  return (
    <div className="cartao overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <Cab col="numero" />
            <Cab col="ano" />
            <th scope="col" className="px-3 py-2 font-medium">Objeto</th>
            <Cab col="setor" />
            <Cab col="empresa" />
            <Cab col="valor" className="text-right" />
            <Cab col="fim" />
            <th scope="col" className="px-3 py-2 font-medium">Situação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {contratos.map((c) => {
            const href = linkContrato(c.id, voltar);
            return (
              <tr key={c.id} className="group hover:bg-marca-50/60">
                <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                  <Link href={href} className="text-marca-700 underline-offset-2 group-hover:underline">{c.numero}</Link>
                </td>
                <td className="px-3 py-2.5">{c.ano}</td>
                <td className="max-w-xs px-3 py-2.5">
                  <Link href={href} className="line-clamp-2" title={c.objeto ?? ""}>{c.objeto ?? "—"}</Link>
                </td>
                <td className="px-3 py-2.5" title={c.setor.nome}>{c.setor.sigla ?? c.setor.nome}</td>
                <td className="max-w-[14rem] truncate px-3 py-2.5" title={c.empresaNome ?? ""}>{c.empresaNome ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{formatarMoeda(c.valorAtual)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatarData(c.dataFimAtual)}</td>
                <td className="px-3 py-2.5"><StatusBadge status={calcularStatus(c, ref)} vence={venceEmBreve(c, ref)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
