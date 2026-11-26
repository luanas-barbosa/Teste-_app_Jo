import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { filtroStatus } from "./contratos";
import { montarWhere } from "./busca";

export type FiltrosPainel = { ano?: string; setor?: string };

const e = (...w: (Prisma.ContratoWhereInput | null)[]): Prisma.ContratoWhereInput => ({ AND: w.filter(Boolean) as Prisma.ContratoWhereInput[] });

export async function dadosPainel(f: FiltrosPainel) {
  const where = montarWhere({ ano: f.ano, setor: f.setor });
  // Cada gráfico ignora o próprio filtro (para mostrar o contexto) e destaca a barra escolhida
  const whereAnos = montarWhere({ setor: f.setor });
  const whereSetores = montarWhere({ ano: f.ano });

  const [total, vigentes, somaVigente, vence90, porAno, porSetor, setores, anos, proximos] = await Promise.all([
    prisma.contrato.count({ where }),
    prisma.contrato.count({ where: e(where, filtroStatus("VIGENTE")) }),
    prisma.contrato.aggregate({ where: e(where, filtroStatus("VIGENTE")), _sum: { valorAtual: true } }),
    prisma.contrato.count({ where: e(where, filtroStatus("VENCE_90")) }),
    prisma.contrato.groupBy({ by: ["ano"], where: whereAnos, _count: { _all: true }, _sum: { valorAtual: true }, orderBy: { ano: "asc" } }),
    prisma.contrato.groupBy({ by: ["setorId"], where: whereSetores, _count: { _all: true }, _sum: { valorAtual: true } }),
    prisma.setor.findMany({ orderBy: { nome: "asc" } }),
    prisma.contrato.findMany({ distinct: ["ano"], select: { ano: true }, orderBy: { ano: "desc" } }),
    prisma.contrato.findMany({
      where: e(where, filtroStatus("VENCE_90")),
      orderBy: { dataFimAtual: "asc" },
      take: 8,
      include: { setor: true },
    }),
  ]);

  const nomeSetor = new Map(setores.map((s) => [s.id, s]));
  const reais = (c: bigint | null | undefined) => Number(c ?? BigInt(0)) / 100;

  return {
    total,
    vigentes,
    valorVigente: reais(somaVigente._sum.valorAtual),
    vence90,
    porAno: porAno.map((a) => ({ chave: String(a.ano), rotulo: String(a.ano), quantidade: a._count._all, valor: reais(a._sum.valorAtual) })),
    porSetor: porSetor
      .map((s) => ({
        chave: String(s.setorId),
        rotulo: nomeSetor.get(s.setorId)?.nome ?? "—",
        quantidade: s._count._all,
        valor: reais(s._sum.valorAtual),
      }))
      .sort((a, b) => b.quantidade - a.quantidade || b.valor - a.valor),
    opcoes: { anos: anos.map((a) => a.ano), setores: setores.map((s) => ({ id: s.id, nome: s.nome })) },
    proximos,
  };
}
