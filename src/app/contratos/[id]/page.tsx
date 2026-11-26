import Link from "next/link";
import { notFound } from "next/navigation";
import { carregarContrato } from "@/lib/carregar";
import { calcularStatus, STATUS_INFO, TIPO_ADITIVO_ROTULO, venceEmBreve } from "@/lib/contratos";
import { diasEntre, hoje } from "@/lib/datas";
import { formatarCnpj, formatarData, formatarMoeda } from "@/lib/formato";
import { voltarSeguro } from "@/lib/navegacao";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function DetalheContrato({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const c = await carregarContrato(Number(id));
  if (!c) notFound();

  const voltar = voltarSeguro(sp.voltar);
  const ref = hoje();
  const status = calcularStatus(c, ref);
  const vence = venceEmBreve(c, ref);
  const diasRestantes = c.dataFimAtual ? diasEntre(ref, c.dataFimAtual) : null;
  const variacao = c.valorOriginal && c.valorAtual && c.valorAtual !== c.valorOriginal
    ? (Number(c.valorAtual) / Number(c.valorOriginal) - 1) * 100
    : null;

  let progresso: number | null = null;
  if (c.dataInicio && c.dataFimAtual) {
    const total = diasEntre(c.dataInicio, c.dataFimAtual);
    progresso = total > 0 ? Math.min(100, Math.max(0, (diasEntre(c.dataInicio, ref) / total) * 100)) : 100;
  }

  return (
    <div className="space-y-5">
      {sp.salvo && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          ✓ Contrato salvo com sucesso.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={voltar} className="botao-secundario">← Voltar para a busca</Link>
        <Link href={`/contratos/${c.id}/editar?voltar=${encodeURIComponent(voltar)}`} className="botao-primario">✎ Editar</Link>
      </div>

      {/* Cabeçalho */}
      <section className={`cartao border-l-4 p-5 ${vence ? "border-l-orange-400" : status === "VIGENTE" ? "border-l-emerald-500" : status === "SUSPENSO" ? "border-l-amber-400" : status === "RESCINDIDO" ? "border-l-rose-500" : "border-l-slate-300"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Contrato nº</p>
            <h1 className="text-3xl font-bold text-marca-800">{c.numero}/{c.ano}</h1>
          </div>
          <div className="text-right">
            <StatusBadge status={status} vence={vence} />
            <p className="mt-1 text-xs text-slate-500">{STATUS_INFO[status].descricao}</p>
          </div>
        </div>
        <p className="mt-3 text-lg text-slate-800">{c.objeto ?? <span className="text-slate-400">Objeto não informado</span>}</p>

        {vence && diasRestantes !== null && (
          <div className="mt-4 rounded-md bg-orange-50 px-4 py-3 text-sm text-orange-900 ring-1 ring-orange-200">
            ⏰ <strong>Atenção:</strong> a vigência termina em <strong>{diasRestantes} {diasRestantes === 1 ? "dia" : "dias"}</strong> ({formatarData(c.dataFimAtual)}).
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloco titulo="Identificação">
          <Item rotulo="Número / ano" valor={`${c.numero}/${c.ano}`} />
          <Item rotulo="Processo licitatório" valor={c.processo} />
          <Item rotulo="Modalidade" valor={c.modalidade?.nome} />
          <Item rotulo="Setor responsável" valor={c.setor.nome + (c.setor.sigla ? ` (${c.setor.sigla})` : "")} />
        </Bloco>

        <Bloco titulo="Partes">
          <Item rotulo="Empresa contratada" valor={c.empresaNome} largo />
          <Item rotulo="CNPJ" valor={c.empresaCnpj ? formatarCnpj(c.empresaCnpj) : null} />
          <Item rotulo="Gestor do contrato" valor={c.gestor} />
          <Item rotulo="Fiscal do contrato" valor={c.fiscal} />
        </Bloco>

        <Bloco titulo="Valores">
          <Item rotulo="Valor original" valor={formatarMoeda(c.valorOriginal)} />
          <Item
            rotulo="Valor atual (com aditivos)"
            valor={
              <span className="text-lg font-semibold">
                {formatarMoeda(c.valorAtual)}
                {variacao !== null && (
                  <span className={`ml-2 text-sm font-normal ${variacao > 0 ? "text-orange-700" : "text-emerald-700"}`}>
                    ({variacao > 0 ? "+" : ""}{variacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)
                  </span>
                )}
              </span>
            }
          />
        </Bloco>

        <Bloco titulo="Vigência">
          <Item rotulo="Início" valor={formatarData(c.dataInicio)} />
          <Item rotulo="Fim original" valor={formatarData(c.dataFimOriginal)} />
          <Item rotulo="Fim atual (com aditivos)" valor={<strong>{formatarData(c.dataFimAtual)}</strong>} />
          <Item
            rotulo="Tempo restante"
            valor={diasRestantes === null ? null : diasRestantes < 0 ? `Encerrou há ${-diasRestantes} dias` : `${diasRestantes} dias`}
          />
          {progresso !== null && (
            <div className="col-span-2">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round(progresso)} aria-valuemin={0} aria-valuemax={100} aria-label="Vigência decorrida">
                <div className={`h-full ${vence ? "bg-orange-400" : "bg-marca-600"}`} style={{ width: `${progresso}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{Math.round(progresso)}% da vigência decorrida</p>
            </div>
          )}
        </Bloco>
      </div>

      <section className="cartao p-5">
        <h2 className="mb-4 text-lg font-semibold">Aditivos <span className="text-sm font-normal text-slate-500">({c.aditivos.length})</span></h2>
        {c.aditivos.length === 0 ? (
          <p className="text-sm text-slate-500">Este contrato não tem aditivos.</p>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
            {c.aditivos.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-marca-600" />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium">{a.numero ?? "Aditivo"}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{TIPO_ADITIVO_ROTULO[a.tipo]}</span>
                  <span className="text-sm text-slate-500">{formatarData(a.data)}</span>
                </div>
                {a.descricao && <p className="mt-1 text-sm text-slate-700">{a.descricao}</p>}
                <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
                  {a.novoValor !== null && <span>Novo valor: <strong>{formatarMoeda(a.novoValor)}</strong></span>}
                  {a.novaDataFim && <span>Nova vigência até: <strong>{formatarData(a.novaDataFim)}</strong></span>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="cartao p-5">
        <h2 className="mb-2 text-lg font-semibold">Observações</h2>
        <p className="whitespace-pre-line text-sm text-slate-700">{c.observacoes || <span className="text-slate-500">Sem observações.</span>}</p>
      </section>

      <p className="text-xs text-slate-500">
        Cadastrado em {c.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · última alteração em {c.atualizadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
      </p>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="cartao p-5">
      <h2 className="mb-4 text-lg font-semibold">{titulo}</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
    </section>
  );
}

function Item({ rotulo, valor, largo }: { rotulo: string; valor: React.ReactNode; largo?: boolean }) {
  return (
    <div className={largo ? "col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd className="mt-0.5 text-slate-900">{valor || <span className="text-slate-400">Não informado</span>}</dd>
    </div>
  );
}
