import type { Prisma, StatusManual } from "@prisma/client";
import { hoje, somarDias } from "./datas";
import { normalizarTexto } from "./texto";

export type StatusContrato = "VIGENTE" | "A_INICIAR" | "ENCERRADO" | "SUSPENSO" | "RESCINDIDO" | "SEM_DATAS";

export const STATUS_INFO: Record<StatusContrato, { rotulo: string; classe: string; descricao: string }> = {
  VIGENTE: { rotulo: "Vigente", classe: "bg-emerald-100 text-emerald-800 ring-emerald-600/20", descricao: "Dentro do período de vigência" },
  A_INICIAR: { rotulo: "A iniciar", classe: "bg-sky-100 text-sky-800 ring-sky-600/20", descricao: "A vigência ainda não começou" },
  ENCERRADO: { rotulo: "Encerrado", classe: "bg-slate-100 text-slate-700 ring-slate-500/20", descricao: "A vigência já terminou" },
  SUSPENSO: { rotulo: "Suspenso", classe: "bg-amber-100 text-amber-800 ring-amber-600/20", descricao: "Marcado manualmente como suspenso" },
  RESCINDIDO: { rotulo: "Rescindido", classe: "bg-rose-100 text-rose-800 ring-rose-600/20", descricao: "Marcado manualmente como rescindido" },
  SEM_DATAS: { rotulo: "Sem datas", classe: "bg-slate-100 text-slate-500 ring-slate-400/20", descricao: "Sem datas de vigência para calcular o status" },
};

export const DIAS_ALERTA = 90;

export function calcularStatus(
  c: { statusManual: StatusManual | null; dataInicio: Date | null; dataFimAtual: Date | null },
  ref: Date = hoje(),
): StatusContrato {
  if (c.statusManual) return c.statusManual;
  if (!c.dataInicio && !c.dataFimAtual) return "SEM_DATAS";
  if (c.dataInicio && c.dataInicio > ref) return "A_INICIAR";
  if (c.dataFimAtual && c.dataFimAtual < ref) return "ENCERRADO";
  return "VIGENTE";
}

export function venceEmBreve(
  c: { statusManual: StatusManual | null; dataInicio: Date | null; dataFimAtual: Date | null },
  ref: Date = hoje(),
): boolean {
  return calcularStatus(c, ref) === "VIGENTE" && !!c.dataFimAtual && c.dataFimAtual <= somarDias(ref, DIAS_ALERTA);
}

/** Condição SQL (Prisma) equivalente a cada status, para filtrar no banco. */
export function filtroStatus(status: string, ref: Date = hoje()): Prisma.ContratoWhereInput | null {
  switch (status) {
    case "VIGENTE":
      return {
        statusManual: null,
        OR: [{ dataInicio: { not: null } }, { dataFimAtual: { not: null } }],
        AND: [
          { OR: [{ dataInicio: null }, { dataInicio: { lte: ref } }] },
          { OR: [{ dataFimAtual: null }, { dataFimAtual: { gte: ref } }] },
        ],
      };
    case "A_INICIAR":
      return { statusManual: null, dataInicio: { gt: ref } };
    case "ENCERRADO":
      return { statusManual: null, dataFimAtual: { lt: ref } };
    case "SUSPENSO":
    case "RESCINDIDO":
      return { statusManual: status };
    case "VENCE_90":
      return {
        AND: [filtroStatus("VIGENTE", ref)!, { dataFimAtual: { lte: somarDias(ref, DIAS_ALERTA) } }],
      };
    default:
      return null;
  }
}

type AditivoBase = { data: Date; novoValor: bigint | null; novaDataFim: Date | null };

/** Calcula valor e fim da vigência atuais a partir dos aditivos (o mais recente com o campo preenchido vale). */
export function derivarAtuais(
  valorOriginal: bigint | null,
  dataFimOriginal: Date | null,
  aditivos: AditivoBase[],
): { valorAtual: bigint | null; dataFimAtual: Date | null } {
  const ordenados = [...aditivos].sort((a, b) => a.data.getTime() - b.data.getTime());
  let valorAtual = valorOriginal;
  let dataFimAtual = dataFimOriginal;
  for (const a of ordenados) {
    if (a.novoValor !== null) valorAtual = a.novoValor;
    if (a.novaDataFim !== null) dataFimAtual = a.novaDataFim;
  }
  return { valorAtual, dataFimAtual };
}

export function montarTextoBusca(c: {
  numero: string;
  ano: number;
  processo?: string | null;
  objeto?: string | null;
  empresaNome?: string | null;
  empresaCnpj?: string | null;
  setorNome?: string | null;
  setorSigla?: string | null;
  modalidadeNome?: string | null;
  gestor?: string | null;
  fiscal?: string | null;
  observacoes?: string | null;
  aditivosDescricao?: string[];
}): string {
  return normalizarTexto(
    [
      c.numero,
      `${c.numero}/${c.ano}`,
      c.processo,
      c.objeto,
      c.empresaNome,
      c.empresaCnpj,
      c.setorNome,
      c.setorSigla,
      c.modalidadeNome,
      c.gestor,
      c.fiscal,
      c.observacoes,
      ...(c.aditivosDescricao ?? []),
    ]
      .filter(Boolean)
      .join(" | "),
  );
}

export const TIPO_ADITIVO_ROTULO: Record<string, string> = {
  PRAZO: "Prazo",
  VALOR: "Valor",
  PRAZO_E_VALOR: "Prazo e valor",
  OUTRO: "Outro",
};
