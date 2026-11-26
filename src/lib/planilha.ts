// Leitura de planilhas no navegador (não usa banco).
import * as XLSX from "xlsx";
import { CAMPOS_IMPORTACAO, type CampoImportacao, type LinhaImportacao } from "./importacao-campos";
import { normalizarTexto } from "./texto";

export type Aba = {
  nome: string;
  colunas: string[]; // rótulos exibidos
  linhas: { numeroLinha: number; valores: unknown[] }[];
};

function letraColuna(i: number) {
  return XLSX.utils.encode_col(i);
}

export async function lerArquivo(arquivo: File): Promise<Aba[]> {
  const ehCsv = /\.(csv|txt)$/i.test(arquivo.name);
  let wb: XLSX.WorkBook;
  if (ehCsv) {
    const buf = await arquivo.arrayBuffer();
    let texto = new TextDecoder("utf-8").decode(buf);
    if (texto.includes("�")) texto = new TextDecoder("windows-1252").decode(buf);
    // raw: mantém textos como estão (datas dd/mm/aaaa e valores "1.234,56" são tratados depois)
    wb = XLSX.read(texto, { type: "string", raw: true });
  } else {
    wb = XLSX.read(await arquivo.arrayBuffer(), { cellDates: true });
  }

  return wb.SheetNames.map((nome) => {
    const ws = wb.Sheets[nome];
    const matriz = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: true });
    // cabeçalho = primeira linha (entre as 15 primeiras) com pelo menos 2 células preenchidas
    let idxCab = matriz.findIndex((r, i) => i < 15 && r.filter((c) => c !== null && String(c).trim() !== "").length >= 2);
    if (idxCab < 0) idxCab = 0;
    const cab = matriz[idxCab] ?? [];
    const largura = Math.max(cab.length, ...matriz.slice(idxCab + 1).map((r) => r.length), 0);
    const colunas = Array.from({ length: largura }, (_, i) => {
      const t = cab[i] === null || cab[i] === undefined ? "" : String(cab[i]).trim();
      return t ? `${t}` : `Coluna ${letraColuna(i)} (sem título)`;
    });
    const linhas = matriz
      .slice(idxCab + 1)
      .map((valores, i) => ({ numeroLinha: idxCab + 2 + i, valores }))
      .filter((l) => l.valores.some((c) => c !== null && String(c).trim() !== ""));
    // remove colunas totalmente vazias e sem título
    const usadas = colunas.map((c, i) => !c.endsWith("(sem título)") || linhas.some((l) => l.valores[i] !== null && l.valores[i] !== undefined && String(l.valores[i]).trim() !== ""));
    return {
      nome,
      colunas: colunas.map((c, i) => (usadas[i] ? c : "")),
      linhas,
    };
  });
}

const REGRAS: Record<CampoImportacao, (h: string) => boolean> = {
  numero: (h) => (/^(n|no|nº|n°|num|numero)\b/.test(h) && /(contrato|ata)/.test(h) && !h.includes("contratad")) || h === "numero" || h === "contrato",
  ano: (h) => h === "ano" || h.startsWith("ano ") || h === "exercicio",
  setor: (h) => /setor|secretari|unidade gestora|orgao|departamento|categoria/.test(h),
  modalidade: (h) => h.includes("modalidade"),
  processo: (h) => h.includes("processo"),
  objeto: (h) => h.includes("objeto") || h.startsWith("descri"),
  empresaNome: (h) => /contratad|empresa|fornecedor|razao social/.test(h),
  empresaCnpj: (h) => /cnpj/.test(h),
  valor: (h) => h.includes("valor"),
  dataInicio: (h) => /inicio|assinatura/.test(h),
  dataFim: (h) => /vencimento|termino|^fim|data final|fim da vigencia/.test(h),
  situacao: (h) => /status|situacao/.test(h),
  gestor: (h) => h.includes("gestor") && !h.includes("unidade"),
  fiscal: (h) => h.includes("fiscal"),
  observacoes: (h) => /observa|^obs\b/.test(h),
};

export type Mapeamento = Partial<Record<CampoImportacao, number>> & { setorFixo?: string };

/** Sugere a coluna de cada campo pelo título; havendo várias, escolhe a mais preenchida. */
export function sugerirMapeamento(aba: Aba): Mapeamento {
  const m: Mapeamento = {};
  const preenchimento = aba.colunas.map((_, i) => aba.linhas.filter((l) => l.valores[i] !== null && String(l.valores[i] ?? "").trim() !== "").length);
  const usadas = new Set<number>();
  for (const campo of CAMPOS_IMPORTACAO) {
    const candidatas = aba.colunas
      .map((c, i) => ({ i, h: normalizarTexto(c) }))
      .filter(({ i, h }) => h && !usadas.has(i) && preenchimento[i] > 0 && REGRAS[campo.chave](h))
      .sort((a, b) => preenchimento[b.i] - preenchimento[a.i]);
    if (candidatas.length) {
      m[campo.chave] = candidatas[0].i;
      usadas.add(candidatas[0].i);
    }
  }
  return m;
}

function dataIso(d: Date) {
  // +12h evita erro de fuso/arredondamento em datas do Excel
  const x = new Date(d.getTime() + 12 * 3600 * 1000);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function texto(v: unknown, campo: CampoImportacao): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    if (campo === "numero") {
      // Excel transformou "01/2026" em data 01/01/2026
      const x = new Date(v.getTime() + 12 * 3600 * 1000);
      return `${String(x.getMonth() + 1).padStart(2, "0")}/${x.getFullYear()}`;
    }
    return dataIso(v);
  }
  if (typeof v === "number") {
    if (campo === "valor") return v.toFixed(2).replace(".", ",");
    return String(v);
  }
  return String(v).replace(/\s+/g, " ").trim();
}

export function montarLinhas(aba: Aba, m: Mapeamento): LinhaImportacao[] {
  return aba.linhas.map(({ numeroLinha, valores }) => {
    const l: LinhaImportacao = { linha: numeroLinha };
    for (const campo of CAMPOS_IMPORTACAO) {
      const i = m[campo.chave];
      if (i !== undefined && i >= 0) l[campo.chave] = texto(valores[i], campo.chave);
    }
    if (m.setorFixo && !l.setor) l.setor = m.setorFixo;
    return l;
  });
}
