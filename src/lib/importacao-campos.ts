/** Campos do sistema que podem vir de uma coluna da planilha. */
export const CAMPOS_IMPORTACAO = [
  { chave: "numero", rotulo: "Número do contrato", obrig: true },
  { chave: "ano", rotulo: "Ano", obrig: true, dica: "Se ficar sem coluna, o ano é tirado do número (ex.: 29/2021)" },
  { chave: "setor", rotulo: "Setor / secretaria", obrig: true },
  { chave: "modalidade", rotulo: "Modalidade" },
  { chave: "processo", rotulo: "Nº do processo" },
  { chave: "objeto", rotulo: "Objeto" },
  { chave: "empresaNome", rotulo: "Empresa contratada" },
  { chave: "empresaCnpj", rotulo: "CNPJ" },
  { chave: "valor", rotulo: "Valor total" },
  { chave: "dataInicio", rotulo: "Início da vigência" },
  { chave: "dataFim", rotulo: "Fim da vigência" },
  { chave: "situacao", rotulo: "Situação", dica: "Só “suspenso” e “rescindido” são usados; o resto é calculado pelas datas" },
  { chave: "gestor", rotulo: "Gestor" },
  { chave: "fiscal", rotulo: "Fiscal" },
  { chave: "observacoes", rotulo: "Observações" },
] as const;

export type CampoImportacao = (typeof CAMPOS_IMPORTACAO)[number]["chave"];

export type LinhaImportacao = { linha: number } & Partial<Record<CampoImportacao, string>>;

export type ResultadoPrevia = {
  linha: number;
  chave: string | null;
  situacao: "novo" | "existente" | "erro";
  erros: string[];
  avisos: string[];
  existenteId?: number;
};

