import Link from "next/link";
import type { ContratoListado } from "@/lib/busca";
import { calcularStatus, venceEmBreve } from "@/lib/contratos";
import { hoje } from "@/lib/datas";
import { formatarData, formatarMoeda } from "@/lib/formato";
import StatusBadge from "@/components/StatusBadge";
import { linkContrato } from "./Tabela";
import { rotuloContrato } from "@/lib/texto";

export default function Cards({ contratos, voltar }: { contratos: ContratoListado[]; voltar: string }) {
  const ref = hoje();
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {contratos.map((c) => {
        const vence = venceEmBreve(c, ref);
        return (
          <li key={c.id}>
            <Link
              href={linkContrato(c.id, voltar)}
              className={`cartao flex h-full flex-col gap-3 p-4 transition hover:border-marca-600 hover:shadow-md ${vence ? "border-l-4 border-l-orange-400" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Contrato</p>
                  <p className="text-lg font-semibold text-marca-800">{rotuloContrato(c.numero, c.ano)}</p>
                </div>
                <StatusBadge status={calcularStatus(c, ref)} vence={vence} />
              </div>
              <p className="line-clamp-3 text-sm text-slate-800">{c.objeto ?? "Sem descrição do objeto"}</p>
              <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-sm">
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Empresa</dt>
                  <dd className="truncate">{c.empresaNome ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Setor</dt>
                  <dd className="truncate" title={c.setor.nome}>{c.setor.nome}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Valor atual</dt>
                  <dd className="font-medium tabular-nums">{formatarMoeda(c.valorAtual)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Vigência até</dt>
                  <dd className="tabular-nums">{formatarData(c.dataFimAtual)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Modalidade</dt>
                  <dd className="truncate">{c.modalidade?.nome ?? "—"}</dd>
                </div>
              </dl>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
