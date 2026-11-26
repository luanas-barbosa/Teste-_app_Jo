import { prisma } from "./db";
import { salvarContrato, validarContrato, type ContratoEntrada } from "./salvar";
import { anoDoNumero, normalizarNumero, normalizarTexto } from "./texto";
import type { LinhaImportacao, ResultadoPrevia } from "./importacao-campos";

export type { LinhaImportacao, ResultadoPrevia };


const ROTULO_CAMPO: Record<string, string> = {
  numero: "Número",
  ano: "Ano",
  setorId: "Setor",
  empresaCnpj: "CNPJ",
  valor: "Valor",
  dataInicio: "Início da vigência",
  dataFim: "Fim da vigência",
};

/** Pega o primeiro número da célula de valor ("R$ 5.000.000,00 (Valor inicial)"). Sem número, fica vazio. */
function limparValor(v?: string): { valor: string; aviso?: string } {
  const t = (v ?? "").trim();
  if (!t) return { valor: "" };
  const m = t.match(/\d[\d.,]*/);
  if (!m) return { valor: "", aviso: `Valor “${t}” não é um número; o contrato será importado sem valor.` };
  const valor = m[0].replace(/[.,]$/, "");
  return { valor, aviso: m[0].length < t.replace(/^R\$\s*/, "").length ? `Valor “${t}” importado como ${valor}.` : undefined };
}

function paraEntrada(l: LinhaImportacao, setorId: string, modalidadeId: string): ContratoEntrada {
  const numero = (l.numero ?? "").trim();
  const ano = (l.ano ?? "").trim() || String(anoDoNumero(numero) ?? "");
  const sit = normalizarTexto(l.situacao);
  return {
    numero,
    ano,
    setorId,
    modalidadeId,
    processo: l.processo,
    objeto: l.objeto,
    empresaNome: l.empresaNome,
    empresaCnpj: l.empresaCnpj,
    valor: limparValor(l.valor).valor,
    dataInicio: l.dataInicio,
    dataFim: l.dataFim,
    statusManual: sit.includes("suspen") ? "SUSPENSO" : sit.includes("rescin") ? "RESCINDIDO" : "",
    gestor: l.gestor,
    fiscal: l.fiscal,
    observacoes: l.observacoes,
  };
}

function validarLinha(l: LinhaImportacao) {
  const e = paraEntrada(l, (l.setor ?? "").trim() ? "1" : "", "");
  const { erros, dados } = validarContrato(e);
  if (erros.setorId) erros.setorId = "Setor vazio.";
  const msgs = Object.entries(erros).map(([k, m]) => `${ROTULO_CAMPO[k] ?? k}: ${m}`);
  const chave = dados.numeroNormalizado && Number.isInteger(dados.ano) && !erros.ano ? `${dados.numeroNormalizado}|${dados.ano}` : null;
  return { msgs, chave, dados };
}

export async function previa(linhas: LinhaImportacao[]): Promise<ResultadoPrevia[]> {
  const validadas = linhas.map((l) => ({ l, ...validarLinha(l) }));
  const chaves = validadas.filter((v) => v.chave).map((v) => ({ numeroNormalizado: v.dados.numeroNormalizado, ano: v.dados.ano }));
  const existentes = chaves.length
    ? await prisma.contrato.findMany({ where: { OR: chaves }, select: { id: true, numeroNormalizado: true, ano: true } })
    : [];
  const mapa = new Map(existentes.map((c) => [`${c.numeroNormalizado}|${c.ano}`, c.id]));

  return validadas.map((v) => {
    const aviso = limparValor(v.l.valor).aviso;
    const avisos = aviso ? [aviso] : [];
    if (v.msgs.length) return { linha: v.l.linha, chave: v.chave, situacao: "erro", erros: v.msgs, avisos };
    const existenteId = v.chave ? mapa.get(v.chave) : undefined;
    return { linha: v.l.linha, chave: v.chave, situacao: existenteId ? "existente" : "novo", erros: [], avisos, existenteId };
  });
}

/** Acha (sem diferenciar maiúsculas/acentos) ou cria setores/modalidades pelo nome. */
async function resolverNomes(nomes: string[], tipo: "setor" | "modalidade") {
  const tabela = tipo === "setor" ? prisma.setor : prisma.modalidade;
  const todos: { id: number; nome: string }[] = await (tabela as typeof prisma.modalidade).findMany({ select: { id: true, nome: true } });
  const porNorm = new Map(todos.map((t) => [normalizarTexto(t.nome), t.id]));
  // siglas de setor também valem
  if (tipo === "setor") {
    for (const s of await prisma.setor.findMany({ where: { sigla: { not: null } } })) {
      const n = normalizarTexto(s.sigla);
      if (!porNorm.has(n)) porNorm.set(n, s.id);
    }
  }
  const criados: string[] = [];
  for (const nome of new Set(nomes.map((n) => n.trim().replace(/\s+/g, " ")).filter(Boolean))) {
    const n = normalizarTexto(nome);
    if (porNorm.has(n)) continue;
    const novo = await (tabela as typeof prisma.modalidade).upsert({ where: { nome }, update: {}, create: { nome } });
    porNorm.set(n, novo.id);
    criados.push(nome);
  }
  return { id: (nome?: string) => (nome?.trim() ? porNorm.get(normalizarTexto(nome.trim().replace(/\s+/g, " "))) : undefined), criados };
}

export type ResultadoImportacao = {
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: { linha: number; erros: string[] }[];
  setoresCriados: string[];
  modalidadesCriadas: string[];
};

export async function importar(linhas: LinhaImportacao[], modo: "ignorar" | "atualizar"): Promise<ResultadoImportacao> {
  const r: ResultadoImportacao = { criados: 0, atualizados: 0, ignorados: 0, erros: [], setoresCriados: [], modalidadesCriadas: [] };

  const resultadoPrevia = await previa(linhas);
  const validas = linhas.filter((_, i) => resultadoPrevia[i].situacao !== "erro");
  resultadoPrevia.filter((p) => p.situacao === "erro").forEach((p) => r.erros.push({ linha: p.linha, erros: p.erros }));

  const setores = await resolverNomes(validas.map((l) => l.setor ?? ""), "setor");
  const modalidades = await resolverNomes(validas.map((l) => l.modalidade ?? ""), "modalidade");
  r.setoresCriados = setores.criados;
  r.modalidadesCriadas = modalidades.criados;

  for (const l of linhas) {
    const p = resultadoPrevia.find((x) => x.linha === l.linha)!;
    if (p.situacao === "erro") continue;
    if (p.situacao === "existente" && modo === "ignorar") {
      r.ignorados++;
      continue;
    }
    const entrada = paraEntrada(l, String(setores.id(l.setor) ?? ""), String(modalidades.id(l.modalidade) ?? ""));
    // Na atualização, mantém os aditivos já cadastrados
    const res = await salvarContrato(entrada, p.existenteId);
    if (res.ok) {
      if (p.existenteId) r.atualizados++;
      else r.criados++;
    } else {
      r.erros.push({ linha: l.linha, erros: Object.entries(res.erros).filter(([k]) => !k.startsWith("_")).map(([k, m]) => `${ROTULO_CAMPO[k] ?? k}: ${m}`) });
    }
  }
  return r;
}

export { normalizarNumero };
