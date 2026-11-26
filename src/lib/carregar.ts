import { prisma } from "./db";
import { centavosParaInput, dataParaInput } from "./formato";
import type { ContratoEntrada } from "./salvar";

export async function opcoesFormulario() {
  const [setores, modalidades] = await Promise.all([
    prisma.setor.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.modalidade.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  return { setores, modalidades };
}

export async function carregarContrato(id: number) {
  if (!Number.isInteger(id)) return null;
  return prisma.contrato.findUnique({
    where: { id },
    include: { setor: true, modalidade: true, aditivos: { orderBy: { data: "asc" } }, anexos: true },
  });
}

export type ContratoCompleto = NonNullable<Awaited<ReturnType<typeof carregarContrato>>>;

export function paraEntrada(c: ContratoCompleto): ContratoEntrada {
  return {
    numero: c.numero,
    ano: String(c.ano),
    processo: c.processo ?? "",
    modalidadeId: c.modalidadeId ? String(c.modalidadeId) : "",
    setorId: String(c.setorId),
    objeto: c.objeto ?? "",
    empresaNome: c.empresaNome ?? "",
    empresaCnpj: c.empresaCnpj ?? "",
    valor: centavosParaInput(c.valorOriginal),
    dataInicio: dataParaInput(c.dataInicio),
    dataFim: dataParaInput(c.dataFimOriginal),
    statusManual: c.statusManual ?? "",
    gestor: c.gestor ?? "",
    fiscal: c.fiscal ?? "",
    observacoes: c.observacoes ?? "",
    aditivos: c.aditivos.map((a) => ({
      numero: a.numero ?? "",
      tipo: a.tipo,
      data: dataParaInput(a.data),
      descricao: a.descricao ?? "",
      novoValor: centavosParaInput(a.novoValor),
      novaDataFim: dataParaInput(a.novaDataFim),
    })),
  };
}
