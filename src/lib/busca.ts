import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { filtroStatus } from "./contratos";
import { reaisParaCentavos } from "./formato";
import { normalizarNumero, normalizarTexto } from "./texto";

export type ParamsBusca = {
  q?: string;
  ano?: string;
  setor?: string;
  modalidade?: string;
  status?: string;
  valorMin?: string;
  valorMax?: string;
  ordem?: string;
  dir?: string;
  pagina?: string;
  modo?: string;
  porPagina?: string;
};

export const COLUNAS_ORDENAVEIS = {
  numero: "Número",
  ano: "Ano",
  setor: "Setor",
  empresa: "Empresa",
  valor: "Valor atual",
  fim: "Fim da vigência",
} as const;

export type ColunaOrdem = keyof typeof COLUNAS_ORDENAVEIS;

function um(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function lerParams(sp: Record<string, string | string[] | undefined>): ParamsBusca {
  const chaves: (keyof ParamsBusca)[] = ["q", "ano", "setor", "modalidade", "status", "valorMin", "valorMax", "ordem", "dir", "pagina", "modo", "porPagina"];
  const p: ParamsBusca = {};
  for (const k of chaves) {
    const v = um(sp[k])?.trim();
    if (v) p[k] = v;
  }
  return p;
}

/** Monta a URL da busca trocando alguns parâmetros e mantendo os demais. */
export function urlBusca(p: ParamsBusca, mudancas: Partial<Record<keyof ParamsBusca, string | undefined>> = {}): string {
  const r = new URLSearchParams();
  const final = { ...p, ...mudancas };
  for (const [k, v] of Object.entries(final)) if (v) r.set(k, v);
  const s = r.toString();
  return `/contratos${s ? `?${s}` : ""}`;
}

export function montarWhere(p: ParamsBusca): Prisma.ContratoWhereInput {
  const and: Prisma.ContratoWhereInput[] = [];

  if (p.q) {
    const termo = normalizarTexto(p.q);
    // "12/2024" -> número + ano
    const numAno = p.q.trim().match(/^(\S+)\s*\/\s*(\d{4})$/);
    if (numAno) {
      and.push({
        OR: [
          { numeroNormalizado: normalizarNumero(numAno[1]), ano: Number(numAno[2]) },
          { textoBusca: { contains: termo } },
        ],
      });
    } else {
      // Cada palavra precisa aparecer (em qualquer campo); números também casam com número do contrato e ano.
      for (const palavra of termo.split(" ").filter(Boolean)) {
        const ou: Prisma.ContratoWhereInput[] = [{ textoBusca: { contains: palavra } }];
        if (/^\d+$/.test(palavra)) {
          ou.push({ numeroNormalizado: normalizarNumero(palavra) });
          if (palavra.length === 4) ou.push({ ano: Number(palavra) });
        }
        and.push({ OR: ou });
      }
    }
  }

  const lista = (v?: string) => (v ? v.split(",").filter(Boolean) : []);

  const anos = lista(p.ano).map(Number).filter(Number.isInteger);
  if (anos.length) and.push({ ano: { in: anos } });

  const setores = lista(p.setor).map(Number).filter(Number.isInteger);
  if (setores.length) and.push({ setorId: { in: setores } });

  const modalidades = lista(p.modalidade).map(Number).filter(Number.isInteger);
  if (modalidades.length) and.push({ modalidadeId: { in: modalidades } });

  const status = lista(p.status).map((s) => filtroStatus(s)).filter((x): x is Prisma.ContratoWhereInput => !!x);
  if (status.length) and.push({ OR: status });

  const min = reaisParaCentavos(p.valorMin);
  if (typeof min === "bigint") and.push({ valorAtual: { gte: min } });
  const max = reaisParaCentavos(p.valorMax);
  if (typeof max === "bigint") and.push({ valorAtual: { lte: max } });

  return and.length ? { AND: and } : {};
}

function montarOrdem(p: ParamsBusca): Prisma.ContratoOrderByWithRelationInput[] {
  const dir: Prisma.SortOrder = p.dir === "asc" ? "asc" : "desc";
  const nulls = { sort: dir, nulls: "last" as const };
  switch (p.ordem as ColunaOrdem | undefined) {
    case "numero":
      return [{ numeroNormalizado: dir }, { ano: dir }];
    case "setor":
      return [{ setor: { nome: dir } }, { ano: "desc" }];
    case "empresa":
      return [{ empresaNome: nulls }, { ano: "desc" }];
    case "valor":
      return [{ valorAtual: nulls }];
    case "fim":
      return [{ dataFimAtual: nulls }];
    case "ano":
      return [{ ano: dir }, { numeroNormalizado: dir }];
    default:
      return [{ ano: "desc" }, { numeroNormalizado: "desc" }];
  }
}

export const TAMANHOS_PAGINA = [12, 24, 48, 96];

export async function buscarContratos(p: ParamsBusca) {
  const where = montarWhere(p);
  const porPagina = TAMANHOS_PAGINA.includes(Number(p.porPagina)) ? Number(p.porPagina) : 24;
  const total = await prisma.contrato.count({ where });
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(Math.max(1, Number(p.pagina) || 1), paginas);

  const contratos = await prisma.contrato.findMany({
    where,
    orderBy: montarOrdem(p),
    skip: (pagina - 1) * porPagina,
    take: porPagina,
    include: { setor: true, modalidade: true, _count: { select: { aditivos: true } } },
  });

  const soma = await prisma.contrato.aggregate({ where, _sum: { valorAtual: true } });

  return { contratos, total, pagina, paginas, porPagina, somaValor: soma._sum.valorAtual ?? BigInt(0) };
}

export type ContratoListado = Awaited<ReturnType<typeof buscarContratos>>["contratos"][number];

export async function opcoesFiltro() {
  const [setores, modalidades, anos] = await Promise.all([
    prisma.setor.findMany({ orderBy: { nome: "asc" } }),
    prisma.modalidade.findMany({ orderBy: { nome: "asc" } }),
    prisma.contrato.findMany({ distinct: ["ano"], select: { ano: true }, orderBy: { ano: "desc" } }),
  ]);
  return { setores, modalidades, anos: anos.map((a) => a.ano) };
}
