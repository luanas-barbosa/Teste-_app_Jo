import Link from "next/link";
import GraficoBarras from "@/components/GraficoBarras";
import { formatarData, formatarMoeda, formatarMoedaCurta } from "@/lib/formato";
import { diasEntre, hoje } from "@/lib/datas";
import { dadosPainel } from "@/lib/painel";
import { rotuloContrato } from "@/lib/texto";
import FiltrosPainel from "./FiltrosPainel";
import FalhaServidor from "@/components/FalhaServidor";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function Painel({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const ano = um(sp.ano);
  const setor = um(sp.setor);
  const medida = um(sp.medida) === "valor" ? "valor" : "quantidade";
  let d: Awaited<ReturnType<typeof dadosPainel>>;
  try {
    d = await dadosPainel({ ano, setor });
  } catch (e) {
    console.error(e);
    return <FalhaServidor erro={e} />;
  }
  const ref = hoje();

  const filtros: Record<string, string> = {};
  if (ano) filtros.ano = ano;
  if (setor) filtros.setor = setor;
  const busca = (extra: Record<string, string> = {}) => `/contratos?${new URLSearchParams({ ...filtros, ...extra })}`;
  const nomeSetor = d.opcoes.setores.find((s) => String(s.id) === setor)?.nome;
  const recorte = [ano, nomeSetor].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Painel</h1>
          <p className="text-sm text-slate-600">{recorte ? <>Mostrando: <strong>{recorte}</strong></> : "Visão geral de todos os contratos"}</p>
        </div>
        <FiltrosPainel ano={ano} setor={setor} medida={medida} opcoes={d.opcoes} />
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Números principais">
        <Grande rotulo="Total de contratos" valor={d.total.toLocaleString("pt-BR")} href={busca()} />
        <Grande rotulo="Contratos vigentes" valor={d.vigentes.toLocaleString("pt-BR")} href={busca({ status: "VIGENTE" })} />
        <Grande
          rotulo="Valor total vigente"
          valor={formatarMoeda(BigInt(Math.round(d.valorVigente * 100)))}
          valorCurto={formatarMoedaCurta(Math.round(d.valorVigente * 100))}
          href={busca({ status: "VIGENTE", ordem: "valor", dir: "desc" })}
          pequeno
        />
        <Grande rotulo="Vencem em até 90 dias" valor={d.vence90.toLocaleString("pt-BR")} href={busca({ status: "VENCE_90", ordem: "fim", dir: "asc" })} alerta={d.vence90 > 0} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="cartao p-5">
          <h2 className="text-lg font-semibold">{medida === "valor" ? "Valor dos contratos por ano (R$)" : "Contratos por ano"}</h2>
          <p className="mb-3 text-sm text-slate-500">{nomeSetor ? `Setor: ${nomeSetor}. ` : ""}Clique em uma barra para ver os contratos daquele ano.</p>
          <GraficoBarras
            dados={d.porAno}
            medida={medida}
            orientacao="vertical"
            selecionado={ano}
            filtro="ano"
            outrosFiltros={setor ? { setor } : {}}
            descricao="Gráfico de barras com a quantidade de contratos por ano"
          />
        </section>

        <section className="cartao p-5">
          <h2 className="text-lg font-semibold">{medida === "valor" ? "Valor dos contratos por setor (R$)" : "Contratos por setor"}</h2>
          <p className="mb-3 text-sm text-slate-500">{ano ? `Ano: ${ano}. ` : ""}Clique em uma barra para ver os contratos daquele setor.</p>
          <GraficoBarras
            dados={d.porSetor}
            medida={medida}
            orientacao="horizontal"
            selecionado={setor}
            filtro="setor"
            outrosFiltros={ano ? { ano } : {}}
            descricao="Gráfico de barras com a quantidade de contratos por setor"
          />
        </section>
      </div>

      <section className="cartao p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">⏰ Próximos vencimentos (90 dias)</h2>
          {d.vence90 > 0 && <Link href={busca({ status: "VENCE_90", ordem: "fim", dir: "asc" })} className="text-sm text-marca-700 hover:underline">Ver todos ({d.vence90}) →</Link>}
        </div>
        {d.proximos.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum contrato vigente vence nos próximos 90 dias.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {d.proximos.map((c) => {
              const dias = c.dataFimAtual ? diasEntre(ref, c.dataFimAtual) : 0;
              return (
                <li key={c.id}>
                  <Link href={`/contratos/${c.id}?voltar=${encodeURIComponent(busca({ status: "VENCE_90" }))}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 hover:bg-slate-50">
                    <span className={`w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium ${dias <= 30 ? "bg-rose-100 text-rose-800" : "bg-orange-100 text-orange-800"}`}>
                      {dias} {dias === 1 ? "dia" : "dias"}
                    </span>
                    <span className="shrink-0 font-medium text-marca-800 sm:w-36">{rotuloContrato(c.numero, c.ano)}</span>
                    <span className="w-full min-w-0 truncate text-sm text-slate-700 sm:w-auto sm:flex-1">{c.objeto}</span>
                    <span className="text-sm text-slate-500">{c.setor.nome} · {formatarData(c.dataFimAtual)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Grande({ rotulo, valor, valorCurto, href, alerta, pequeno }: { rotulo: string; valor: string; valorCurto?: string; href: string; alerta?: boolean; pequeno?: boolean }) {
  return (
    <Link href={href} className={`cartao block p-4 transition hover:border-marca-600 hover:shadow-md ${alerta ? "border-l-4 border-l-orange-400" : ""}`}>
      <p className="text-sm text-slate-600">{rotulo}</p>
      <p className={`mt-1 font-bold tabular-nums text-slate-900 ${pequeno ? "text-2xl" : "text-3xl"}`} title={valor}>
        {valorCurto ? (
          <>
            <span className="sm:hidden">{valorCurto}</span>
            <span className="hidden sm:inline">{valor}</span>
          </>
        ) : (
          valor
        )}
      </p>
      <p className="mt-1 text-xs text-marca-700">Ver lista →</p>
    </Link>
  );
}
