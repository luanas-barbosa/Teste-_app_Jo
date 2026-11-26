"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { CAMPOS_IMPORTACAO, type LinhaImportacao, type ResultadoPrevia } from "@/lib/importacao-campos";
import { lerArquivo, montarLinhas, sugerirMapeamento, type Aba, type Mapeamento } from "@/lib/planilha";
import type { ResultadoImportacao } from "@/lib/importacao";
import { importarAcao, previaAcao } from "./acoes";

const LOTE_PREVIA = 100; // conferência é leve
const LOTE_GRAVACAO = 10; // gravação em lotes pequenos para não estourar o tempo do servidor
type Passo = 1 | 2 | 3 | 4;
type LinhaPrevia = LinhaImportacao & ResultadoPrevia;

function lerMemoria(aba: Aba): Mapeamento | null {
  try {
    const s = localStorage.getItem("mapeamento:" + aba.colunas.join("|"));
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
function gravarMemoria(aba: Aba, m: Mapeamento) {
  try {
    localStorage.setItem("mapeamento:" + aba.colunas.join("|"), JSON.stringify(m));
  } catch {}
}

export default function Importador({ setores }: { setores: string[] }) {
  const [passo, setPasso] = useState<Passo>(1);
  const [arquivo, setArquivo] = useState<string>("");
  const [abas, setAbas] = useState<Aba[]>([]);
  const [abaIdx, setAbaIdx] = useState(0);
  const [map, setMap] = useState<Mapeamento>({});
  const [previa, setPrevia] = useState<LinhaPrevia[]>([]);
  const [modo, setModo] = useState<"ignorar" | "atualizar">("ignorar");
  const [ocupado, setOcupado] = useState<string>("");
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

  const aba = abas[abaIdx];

  async function aoEscolherArquivo(f: File | undefined) {
    if (!f) return;
    setErro("");
    if (!/\.(xlsx|xls|csv|txt)$/i.test(f.name)) return setErro("Formato não suportado. Use .xlsx ou .csv.");
    setOcupado("Lendo a planilha…");
    try {
      const lidas = (await lerArquivo(f)).filter((a) => a.linhas.length > 0);
      if (!lidas.length) throw new Error("vazia");
      setArquivo(f.name);
      setAbas(lidas);
      // aba com mais linhas que pareça de contratos
      const melhor = lidas
        .map((a, i) => ({ i, pontos: Object.keys(sugerirMapeamento(a)).length * 1000 + a.linhas.length }))
        .sort((a, b) => b.pontos - a.pontos)[0].i;
      escolherAba(lidas, melhor);
      setPasso(2);
    } catch {
      setErro("Não foi possível ler o arquivo. Confira se é uma planilha válida e se não está protegida por senha.");
    } finally {
      setOcupado("");
    }
  }

  function escolherAba(lista: Aba[], i: number) {
    setAbaIdx(i);
    setMap(lerMemoria(lista[i]) ?? sugerirMapeamento(lista[i]));
  }

  const faltando = useMemo(() => {
    const f: string[] = [];
    if (map.numero === undefined) f.push("Número do contrato");
    if (map.setor === undefined && !map.setorFixo) f.push("Setor");
    return f;
  }, [map]);

  async function gerarPrevia() {
    if (!aba) return;
    gravarMemoria(aba, map);
    setErro("");
    const linhas = montarLinhas(aba, map);
    const res: ResultadoPrevia[] = [];
    try {
      for (let i = 0; i < linhas.length; i += LOTE_PREVIA) {
        setOcupado(`Conferindo linhas ${i + 1} a ${Math.min(i + LOTE_PREVIA, linhas.length)} de ${linhas.length}…`);
        res.push(...(await previaAcao(linhas.slice(i, i + LOTE_PREVIA))));
      }
    } catch {
      setOcupado("");
      return setErro("Falha ao conferir a planilha. Tente novamente.");
    }
    // repetidos dentro da própria planilha
    const vistos = new Map<string, number>();
    const juntas: LinhaPrevia[] = linhas.map((l, i) => {
      const r = res[i];
      if (r.chave && r.situacao !== "erro") {
        const anterior = vistos.get(r.chave);
        if (anterior !== undefined) return { ...l, ...r, situacao: "erro" as const, erros: [`Contrato repetido na planilha (mesmo número e ano da linha ${anterior}).`] };
        vistos.set(r.chave, l.linha);
      }
      return { ...l, ...r };
    });
    setPrevia(juntas);
    setOcupado("");
    setPasso(3);
  }

  async function confirmar() {
    const validas = previa.filter((p) => p.situacao === "novo" || (p.situacao === "existente" && modo === "atualizar"));
    const total: ResultadoImportacao = { criados: 0, atualizados: 0, ignorados: 0, erros: [], setoresCriados: [], modalidadesCriadas: [] };
    try {
      for (let i = 0; i < validas.length; i += LOTE_GRAVACAO) {
        setOcupado(`Gravando ${Math.min(i + LOTE_GRAVACAO, validas.length)} de ${validas.length} contratos…`);
        const lote = validas.slice(i, i + LOTE_GRAVACAO).map((p) => {
          const l: LinhaImportacao = { linha: p.linha };
          for (const c of CAMPOS_IMPORTACAO) if (p[c.chave] !== undefined) l[c.chave] = p[c.chave];
          return l;
        });
        const r = await importarAcao(lote, modo);
        total.criados += r.criados;
        total.atualizados += r.atualizados;
        total.ignorados += r.ignorados;
        total.erros.push(...r.erros);
        total.setoresCriados.push(...r.setoresCriados);
        total.modalidadesCriadas.push(...r.modalidadesCriadas);
      }
    } catch {
      setErro(`A importação parou no meio. ${total.criados + total.atualizados} contratos já foram gravados. Você pode importar a mesma planilha de novo: os já gravados serão reconhecidos.`);
    }
    total.ignorados += previa.filter((p) => p.situacao === "existente" && modo === "ignorar").length;
    total.erros.unshift(...previa.filter((p) => p.situacao === "erro").map((p) => ({ linha: p.linha, erros: p.erros })));
    total.erros.sort((a, b) => a.linha - b.linha);
    setResultado(total);
    setOcupado("");
    setPasso(4);
  }

  function baixarErros() {
    if (!aba || !resultado) return;
    const porLinha = new Map(aba.linhas.map((l) => [l.numeroLinha, l.valores]));
    const cab = ["Linha da planilha", "Problema", ...aba.colunas.filter(Boolean)];
    const idxUsadas = aba.colunas.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
    const linhas = resultado.erros.map((e) => {
      const v = porLinha.get(e.linha) ?? [];
      return [e.linha, e.erros.join(" | "), ...idxUsadas.map((i) => (v[i] instanceof Date ? (v[i] as Date).toLocaleDateString("pt-BR") : v[i] ?? ""))];
    });
    const ws = XLSX.utils.aoa_to_sheet([cab, ...linhas]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Linhas com erro");
    XLSX.writeFile(wb, `erros-importacao-${arquivo.replace(/\.[^.]+$/, "")}.xlsx`);
  }

  function recomecar() {
    setPasso(1);
    setAbas([]);
    setPrevia([]);
    setResultado(null);
    setErro("");
  }

  return (
    <div className="space-y-4">
      <Passos atual={passo} />

      {erro && <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{erro}</div>}
      {ocupado && (
        <div className="flex items-center gap-3 rounded-md border border-marca-100 bg-marca-50 p-4 text-sm text-marca-800" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-marca-600 border-t-transparent" /> {ocupado}
        </div>
      )}

      {passo === 1 && (
        <label
          className="cartao flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed p-12 text-center hover:border-marca-600 hover:bg-marca-50/40"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            aoEscolherArquivo(e.dataTransfer.files[0]);
          }}
        >
          <span className="text-4xl" aria-hidden>📄</span>
          <span className="text-lg font-medium">Arraste a planilha aqui ou clique para escolher</span>
          <span className="text-sm text-slate-500">Arquivos .xlsx ou .csv. Nada é gravado antes da sua confirmação.</span>
          <input type="file" accept=".xlsx,.xls,.csv,.txt" className="sr-only" onChange={(e) => aoEscolherArquivo(e.target.files?.[0])} />
        </label>
      )}

      {passo === 2 && aba && (
        <div className="space-y-4">
          <section className="cartao p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="text-sm text-slate-500">Arquivo</p>
                <p className="font-medium">{arquivo}</p>
              </div>
              {abas.length > 1 && (
                <label className="block">
                  <span className="rotulo">Aba da planilha</span>
                  <select className="campo" value={abaIdx} onChange={(e) => escolherAba(abas, Number(e.target.value))}>
                    {abas.map((a, i) => <option key={a.nome} value={i}>{a.nome} ({a.linhas.length} linhas)</option>)}
                  </select>
                </label>
              )}
              <button type="button" onClick={recomecar} className="ml-auto text-sm text-marca-700 underline">Trocar arquivo</button>
            </div>
          </section>

          <section className="cartao p-5">
            <h2 className="text-lg font-semibold">Ligue as colunas da planilha aos campos do sistema</h2>
            <p className="mb-4 text-sm text-slate-600">
              Já deixamos sugerido o que reconhecemos pelo título. Campos sem coluna ficam em branco. Colunas da planilha que não estão aqui são ignoradas.
            </p>
            <div className="divide-y divide-slate-100">
              {CAMPOS_IMPORTACAO.map((c) => {
                const i = map[c.chave];
                const exemplo = i !== undefined ? aba.linhas.map((l) => l.valores[i]).find((v) => v !== null && String(v).trim() !== "") : undefined;
                return (
                  <div key={c.chave} className="grid items-center gap-2 py-2.5 sm:grid-cols-[14rem_1fr_1fr]">
                    <div>
                      <span className="font-medium">{c.rotulo}</span> {"obrig" in c && c.obrig && <span className="text-rose-600">*</span>}
                      {"dica" in c && c.dica && <p className="text-xs text-slate-500">{c.dica}</p>}
                    </div>
                    <div className="space-y-2">
                      <select
                        className={`campo ${"obrig" in c && c.obrig && c.chave !== "ano" && i === undefined && !(c.chave === "setor" && map.setorFixo) ? "campo-erro" : ""}`}
                        value={i ?? ""}
                        onChange={(e) => setMap((m) => ({ ...m, [c.chave]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                      >
                        <option value="">— Não importar —</option>
                        {aba.colunas.map((col, j) => col && <option key={j} value={j}>{col}</option>)}
                      </select>
                      {c.chave === "setor" && (
                        <label className="block text-xs text-slate-600">
                          {i === undefined ? "Ou use o mesmo setor para todas as linhas:" : "Se a célula estiver vazia, usar:"}
                          <input
                            list="setores-existentes"
                            className="campo mt-1"
                            placeholder="Digite ou escolha um setor"
                            value={map.setorFixo ?? ""}
                            onChange={(e) => setMap((m) => ({ ...m, setorFixo: e.target.value || undefined }))}
                          />
                          <datalist id="setores-existentes">{setores.map((s) => <option key={s} value={s} />)}</datalist>
                        </label>
                      )}
                    </div>
                    <div className="truncate text-sm text-slate-500" title={exemplo ? String(exemplo) : ""}>
                      {exemplo !== undefined ? <>Ex.: <span className="text-slate-800">{exemplo instanceof Date ? exemplo.toLocaleDateString("pt-BR") : String(exemplo)}</span></> : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="botao-primario" disabled={faltando.length > 0 || !!ocupado} onClick={gerarPrevia}>
              Ver prévia de {aba.linhas.length} linhas →
            </button>
            {faltando.length > 0 && <span className="text-sm text-rose-700">Falta escolher: {faltando.join(", ")}.</span>}
          </div>
        </div>
      )}

      {passo === 3 && (
        <Previa
          linhas={previa}
          modo={modo}
          setModo={setModo}
          ocupado={!!ocupado}
          voltar={() => setPasso(2)}
          confirmar={confirmar}
        />
      )}

      {passo === 4 && resultado && (
        <section className="cartao space-y-4 p-6">
          <h2 className="text-xl font-semibold">Importação concluída</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <Numero valor={resultado.criados} rotulo="contratos novos" cor="text-emerald-700" />
            <Numero valor={resultado.atualizados} rotulo="atualizados" cor="text-marca-700" />
            <Numero valor={resultado.ignorados} rotulo="já existiam (ignorados)" cor="text-slate-600" />
            <Numero valor={resultado.erros.length} rotulo="linhas com erro" cor={resultado.erros.length ? "text-rose-700" : "text-slate-600"} />
          </div>
          {resultado.setoresCriados.length > 0 && (
            <p className="text-sm text-slate-700">Setores criados: <strong>{[...new Set(resultado.setoresCriados)].join(", ")}</strong></p>
          )}
          {resultado.modalidadesCriadas.length > 0 && (
            <p className="text-sm text-slate-700">Modalidades criadas: <strong>{[...new Set(resultado.modalidadesCriadas)].join(", ")}</strong></p>
          )}
          <div className="flex flex-wrap gap-2">
            <Link href="/contratos" className="botao-primario">Ver contratos</Link>
            {resultado.erros.length > 0 && <button type="button" onClick={baixarErros} className="botao-secundario">⬇ Baixar linhas com erro (.xlsx)</button>}
            <button type="button" onClick={recomecar} className="botao-secundario">Importar outra planilha</button>
          </div>
        </section>
      )}
    </div>
  );
}

function Passos({ atual }: { atual: Passo }) {
  const nomes = ["Escolher arquivo", "Ligar colunas", "Conferir prévia", "Resultado"];
  return (
    <ol className="flex flex-wrap gap-2 text-sm">
      {nomes.map((n, i) => {
        const p = i + 1;
        return (
          <li key={n} className={`flex items-center gap-2 rounded-full px-3 py-1 ${p === atual ? "bg-marca-600 text-white" : p < atual ? "bg-marca-100 text-marca-800" : "bg-slate-200 text-slate-600"}`}>
            <span className="font-semibold">{p}</span> {n}
          </li>
        );
      })}
    </ol>
  );
}

function Numero({ valor, rotulo, cor }: { valor: number; rotulo: string; cor: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <p className={`text-3xl font-bold ${cor}`}>{valor}</p>
      <p className="text-sm text-slate-600">{rotulo}</p>
    </div>
  );
}

const POR_PAGINA = 50;

function Previa({
  linhas,
  modo,
  setModo,
  ocupado,
  voltar,
  confirmar,
}: {
  linhas: LinhaPrevia[];
  modo: "ignorar" | "atualizar";
  setModo: (m: "ignorar" | "atualizar") => void;
  ocupado: boolean;
  voltar: () => void;
  confirmar: () => void;
}) {
  const [filtro, setFiltro] = useState<"todas" | "novo" | "existente" | "erro">("todas");
  const [pagina, setPagina] = useState(1);
  const cont = {
    todas: linhas.length,
    novo: linhas.filter((l) => l.situacao === "novo").length,
    existente: linhas.filter((l) => l.situacao === "existente").length,
    erro: linhas.filter((l) => l.situacao === "erro").length,
  };
  const filtradas = filtro === "todas" ? linhas : linhas.filter((l) => l.situacao === filtro);
  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const visiveis = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const aGravar = cont.novo + (modo === "atualizar" ? cont.existente : 0);

  const abas: [typeof filtro, string, string][] = [
    ["todas", "Todas", ""],
    ["novo", "Prontas para importar", "text-emerald-700"],
    ["existente", "Já cadastradas", "text-marca-700"],
    ["erro", "Com erro", "text-rose-700"],
  ];

  return (
    <div className="space-y-4">
      <section className="cartao p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Numero valor={cont.novo} rotulo="prontas para importar" cor="text-emerald-700" />
          <Numero valor={cont.existente} rotulo="já cadastradas no sistema" cor="text-marca-700" />
          <Numero valor={cont.erro} rotulo="com erro (não serão importadas)" cor={cont.erro ? "text-rose-700" : "text-slate-600"} />
        </div>
        {cont.existente > 0 && (
          <fieldset className="mt-4 space-y-1 text-sm">
            <legend className="mb-1 font-medium">O que fazer com os contratos que já estão cadastrados?</legend>
            <label className="flex items-center gap-2"><input type="radio" checked={modo === "ignorar"} onChange={() => setModo("ignorar")} /> Manter como estão (ignorar a linha da planilha)</label>
            <label className="flex items-center gap-2"><input type="radio" checked={modo === "atualizar"} onChange={() => setModo("atualizar")} /> Atualizar com os dados da planilha (os aditivos já cadastrados são mantidos)</label>
          </fieldset>
        )}
      </section>

      <div className="flex flex-wrap gap-1 border-b border-slate-200" role="tablist">
        {abas.map(([k, r, cor]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={filtro === k}
            onClick={() => { setFiltro(k); setPagina(1); }}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${filtro === k ? "border-marca-600 font-medium" : "border-transparent text-slate-600 hover:text-slate-900"}`}
          >
            <span className={cor}>{r}</span> <span className="text-slate-500">({cont[k]})</span>
          </button>
        ))}
      </div>

      <div className="cartao overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Linha</th>
              <th className="px-3 py-2 font-medium">Número</th>
              <th className="px-3 py-2 font-medium">Setor</th>
              <th className="px-3 py-2 font-medium">Objeto</th>
              <th className="px-3 py-2 font-medium">Empresa</th>
              <th className="px-3 py-2 font-medium">Valor</th>
              <th className="px-3 py-2 font-medium">Vencimento</th>
              <th className="px-3 py-2 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visiveis.map((l) => (
              <tr key={l.linha} className={l.situacao === "erro" ? "bg-rose-50/60" : ""}>
                <td className="px-3 py-2 text-slate-500">{l.linha}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium">{l.numero}{l.ano && !/\/\s*\d{4}/.test(l.numero ?? "") ? `/${l.ano}` : ""}</td>
                <td className="px-3 py-2">{l.setor}</td>
                <td className="max-w-xs px-3 py-2"><span className="line-clamp-2">{l.objeto}</span></td>
                <td className="max-w-[12rem] truncate px-3 py-2">{l.empresaNome}</td>
                <td className="whitespace-nowrap px-3 py-2">{l.valor}</td>
                <td className="whitespace-nowrap px-3 py-2">{l.dataFim ? l.dataFim.split("-").reverse().join("/") : ""}</td>
                <td className="px-3 py-2">
                  {l.situacao === "novo" && <span className="text-emerald-700">✓ Pronta</span>}
                  {l.situacao === "existente" && <span className="text-marca-700">{modo === "atualizar" ? "↻ Será atualizada" : "= Já cadastrada"}</span>}
                  {l.situacao === "erro" && (
                    <ul className="text-rose-700">{l.erros.map((e) => <li key={e}>✗ {e}</li>)}</ul>
                  )}
                  {l.avisos.length > 0 && (
                    <ul className="mt-1 text-xs text-amber-700">{l.avisos.map((e) => <li key={e}>⚠ {e}</li>)}</ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginas > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <button type="button" className="botao-secundario px-3 py-1" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>←</button>
          Página {pagina} de {paginas}
          <button type="button" className="botao-secundario px-3 py-1" disabled={pagina === paginas} onClick={() => setPagina(pagina + 1)}>→</button>
        </div>
      )}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 py-3 backdrop-blur">
        <button type="button" className="botao-primario" disabled={aGravar === 0 || ocupado} onClick={confirmar}>
          Importar {aGravar} {aGravar === 1 ? "contrato" : "contratos"}
        </button>
        <button type="button" className="botao-secundario" onClick={voltar} disabled={ocupado}>← Voltar ao mapeamento</button>
        {cont.erro > 0 && <span className="text-sm text-slate-600">As {cont.erro} linhas com erro serão puladas; você poderá baixá-las no final.</span>}
      </div>
    </div>
  );
}
