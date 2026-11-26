import { Prisma, type StatusManual, type TipoAditivo } from "@prisma/client";
import { prisma } from "./db";
import { lerData } from "./datas";
import { reaisParaCentavos } from "./formato";
import { cnpjValido, normalizarNumero, somenteDigitos } from "./texto";
import { derivarAtuais, montarTextoBusca } from "./contratos";

export type AditivoEntrada = {
  numero?: string;
  tipo: string;
  data: string;
  descricao?: string;
  novoValor?: string;
  novaDataFim?: string;
};

export type ContratoEntrada = {
  numero: string;
  ano: string;
  processo?: string;
  modalidadeId?: string;
  setorId: string;
  objeto?: string;
  empresaNome?: string;
  empresaCnpj?: string;
  valor?: string;
  dataInicio?: string;
  dataFim?: string;
  statusManual?: string;
  gestor?: string;
  fiscal?: string;
  observacoes?: string;
  aditivos: AditivoEntrada[];
};

export type Erros = Record<string, string>;

export type ResultadoSalvar = { ok: true; id: number } | { ok: false; erros: Erros };

const TIPOS: TipoAditivo[] = ["PRAZO", "VALOR", "PRAZO_E_VALOR", "OUTRO"];

const txt = (s: string | undefined | null) => {
  const t = (s ?? "").trim();
  return t === "" ? null : t;
};

export function validarContrato(e: ContratoEntrada) {
  const erros: Erros = {};

  const numero = txt(e.numero);
  if (!numero) erros.numero = "Informe o número do contrato.";

  const anoN = Number(txt(e.ano));
  if (!txt(e.ano)) erros.ano = "Informe o ano.";
  else if (!Number.isInteger(anoN) || anoN < 1950 || anoN > 2100) erros.ano = "Ano inválido (use 4 dígitos, ex.: 2025).";

  const setorId = Number(e.setorId);
  if (!e.setorId || !Number.isInteger(setorId)) erros.setorId = "Escolha o setor responsável.";

  const modalidadeId = e.modalidadeId ? Number(e.modalidadeId) : null;

  const cnpj = somenteDigitos(e.empresaCnpj);
  if (cnpj && !cnpjValido(cnpj)) erros.empresaCnpj = "CNPJ inválido. Confira os 14 dígitos.";

  const valor = reaisParaCentavos(e.valor);
  if (typeof valor === "number") erros.valor = "Valor inválido. Exemplo: 125.000,00";

  const dataInicio = lerData(e.dataInicio);
  if (dataInicio === "invalida") erros.dataInicio = "Data inválida.";
  const dataFim = lerData(e.dataFim);
  if (dataFim === "invalida") erros.dataFim = "Data inválida.";
  if (dataInicio instanceof Date && dataFim instanceof Date && dataFim < dataInicio)
    erros.dataFim = "O fim da vigência não pode ser antes do início.";

  const statusManual: StatusManual | null =
    e.statusManual === "SUSPENSO" || e.statusManual === "RESCINDIDO" ? e.statusManual : null;

  const aditivos = (e.aditivos ?? []).map((a, i) => {
    const data = lerData(a.data);
    if (data === null) erros[`aditivos.${i}.data`] = "Informe a data do aditivo.";
    else if (data === "invalida") erros[`aditivos.${i}.data`] = "Data inválida.";
    const tipo = TIPOS.includes(a.tipo as TipoAditivo) ? (a.tipo as TipoAditivo) : "OUTRO";
    const novoValor = reaisParaCentavos(a.novoValor);
    if (typeof novoValor === "number") erros[`aditivos.${i}.novoValor`] = "Valor inválido.";
    const novaDataFim = lerData(a.novaDataFim);
    if (novaDataFim === "invalida") erros[`aditivos.${i}.novaDataFim`] = "Data inválida.";
    return {
      numero: txt(a.numero),
      tipo,
      data: data instanceof Date ? data : new Date(0),
      descricao: txt(a.descricao),
      novoValor: typeof novoValor === "bigint" ? novoValor : null,
      novaDataFim: novaDataFim instanceof Date ? novaDataFim : null,
    };
  });

  return {
    erros,
    dados: {
      numero: numero ?? "",
      numeroNormalizado: normalizarNumero(numero ?? ""),
      ano: anoN,
      processo: txt(e.processo),
      modalidadeId,
      setorId,
      objeto: txt(e.objeto),
      empresaNome: txt(e.empresaNome),
      empresaCnpj: cnpj || null,
      valorOriginal: typeof valor === "bigint" ? valor : null,
      dataInicio: dataInicio instanceof Date ? dataInicio : null,
      dataFimOriginal: dataFim instanceof Date ? dataFim : null,
      statusManual,
      gestor: txt(e.gestor),
      fiscal: txt(e.fiscal),
      observacoes: txt(e.observacoes),
    },
    aditivos,
  };
}

export async function salvarContrato(entrada: ContratoEntrada, id?: number): Promise<ResultadoSalvar> {
  const { erros, dados, aditivos } = validarContrato(entrada);
  if (Object.keys(erros).length) return { ok: false, erros };

  const [setor, modalidade] = await Promise.all([
    prisma.setor.findUnique({ where: { id: dados.setorId } }),
    dados.modalidadeId ? prisma.modalidade.findUnique({ where: { id: dados.modalidadeId } }) : null,
  ]);
  if (!setor) return { ok: false, erros: { setorId: "Setor não encontrado." } };

  const duplicado = await prisma.contrato.findUnique({
    where: { numeroNormalizado_ano: { numeroNormalizado: dados.numeroNormalizado, ano: dados.ano } },
    select: { id: true, numero: true },
  });
  if (duplicado && duplicado.id !== id) {
    return {
      ok: false,
      erros: { numero: `Já existe o contrato ${duplicado.numero}/${dados.ano} cadastrado.`, _duplicadoId: String(duplicado.id) },
    };
  }

  const derivados = derivarAtuais(dados.valorOriginal, dados.dataFimOriginal, aditivos);
  const textoBusca = montarTextoBusca({
    ...dados,
    setorNome: setor.nome,
    setorSigla: setor.sigla,
    modalidadeNome: modalidade?.nome,
    aditivosDescricao: aditivos.map((a) => a.descricao ?? "").filter(Boolean),
  });

  const data = { ...dados, ...derivados, textoBusca };

  try {
    const salvo = await prisma.$transaction(async (tx) => {
      if (id) {
        await tx.aditivo.deleteMany({ where: { contratoId: id } });
        return tx.contrato.update({ where: { id }, data: { ...data, aditivos: { create: aditivos } } });
      }
      return tx.contrato.create({ data: { ...data, aditivos: { create: aditivos } } });
    });
    return { ok: true, id: salvo.id };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
      return { ok: false, erros: { numero: `Já existe um contrato com este número em ${dados.ano}.` } };
    throw err;
  }
}
