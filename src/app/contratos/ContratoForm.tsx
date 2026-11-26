"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AditivoEntrada, ContratoEntrada, Erros } from "@/lib/salvar";
import { excluirContratoAcao, salvarContratoAcao } from "./acoes";

type Opcao = { id: number; nome: string };
type FormEntrada = ContratoEntrada & { aditivos: AditivoEntrada[] };

const ADITIVO_VAZIO: AditivoEntrada = { numero: "", tipo: "PRAZO", data: "", descricao: "", novoValor: "", novaDataFim: "" };

export default function ContratoForm({
  inicial,
  id,
  setores,
  modalidades,
  voltar,
}: {
  inicial: FormEntrada;
  id?: number;
  setores: Opcao[];
  modalidades: Opcao[];
  voltar: string;
}) {
  const router = useRouter();
  const [v, setV] = useState<FormEntrada>(inicial);
  const [erros, setErros] = useState<Erros>({});
  const [pendente, iniciar] = useTransition();

  const set = (campo: keyof ContratoEntrada) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((x) => ({ ...x, [campo]: e.target.value }));

  const setAd = (i: number, campo: keyof AditivoEntrada, valor: string) =>
    setV((x) => ({ ...x, aditivos: x.aditivos.map((a, j) => (j === i ? { ...a, [campo]: valor } : a)) }));

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await salvarContratoAcao(v, id);
      if (r.ok) {
        router.push(`/contratos/${r.id}?salvo=1&voltar=${encodeURIComponent(voltar)}`);
      } else {
        setErros(r.erros);
        requestAnimationFrame(() => document.querySelector("[data-erro]")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
    });
  }

  function excluir() {
    if (!id) return;
    if (!confirm(`Excluir definitivamente o contrato ${inicial.numero}${/\/\s*\d{4}/.test(inicial.numero) ? "" : "/" + inicial.ano}? Esta ação não pode ser desfeita.`)) return;
    iniciar(() => excluirContratoAcao(id));
  }

  const qtdErros = Object.keys(erros).filter((k) => !k.startsWith("_")).length;

  return (
    <form onSubmit={enviar} className="space-y-6" noValidate>
      {qtdErros > 0 && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          <strong>Não foi possível salvar.</strong> Corrija {qtdErros === 1 ? "o campo destacado" : `os ${qtdErros} campos destacados`} abaixo.
          {erros._duplicadoId && (
            <> {" "}<Link href={`/contratos/${erros._duplicadoId}`} className="underline">Abrir o contrato já cadastrado</Link>.</>
          )}
        </div>
      )}

      <Bloco titulo="Identificação">
        <Campo rotulo="Número do contrato" obrig erro={erros.numero} dica="Ex.: 012 ou 012/2025">
          <input value={v.numero} onChange={set("numero")} className={cls(erros.numero)} required />
        </Campo>
        <Campo rotulo="Ano" obrig erro={erros.ano}>
          <input value={v.ano} onChange={set("ano")} inputMode="numeric" maxLength={4} className={cls(erros.ano)} required />
        </Campo>
        <Campo rotulo="Nº do processo licitatório" erro={erros.processo}>
          <input value={v.processo} onChange={set("processo")} className={cls(erros.processo)} />
        </Campo>
        <Campo rotulo="Modalidade da licitação">
          <select value={v.modalidadeId} onChange={set("modalidadeId")} className="campo">
            <option value="">— Selecione —</option>
            {modalidades.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Setor / secretaria responsável" obrig erro={erros.setorId} largo>
          <select value={v.setorId} onChange={set("setorId")} className={cls(erros.setorId)} required>
            <option value="">— Selecione —</option>
            {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Objeto do contrato" erro={erros.objeto} todo>
          <textarea value={v.objeto} onChange={set("objeto")} rows={3} className={cls(erros.objeto)} placeholder="O que está sendo contratado" />
        </Campo>
      </Bloco>

      <Bloco titulo="Empresa contratada">
        <Campo rotulo="Nome da empresa" largo>
          <input value={v.empresaNome} onChange={set("empresaNome")} className="campo" />
        </Campo>
        <Campo rotulo="CNPJ" erro={erros.empresaCnpj} dica="Somente números ou com pontuação">
          <input value={v.empresaCnpj} onChange={set("empresaCnpj")} inputMode="numeric" className={cls(erros.empresaCnpj)} />
        </Campo>
      </Bloco>

      <Bloco titulo="Valores e vigência">
        <Campo rotulo="Valor total original (R$)" erro={erros.valor} dica="Ex.: 125.000,00">
          <input value={v.valor} onChange={set("valor")} inputMode="decimal" className={cls(erros.valor)} />
        </Campo>
        <Campo rotulo="Início da vigência" erro={erros.dataInicio}>
          <input type="date" value={v.dataInicio} onChange={set("dataInicio")} className={cls(erros.dataInicio)} />
        </Campo>
        <Campo rotulo="Fim da vigência (original)" erro={erros.dataFim}>
          <input type="date" value={v.dataFim} onChange={set("dataFim")} className={cls(erros.dataFim)} />
        </Campo>
        <Campo rotulo="Situação" dica="Vigente / encerrado é calculado pelas datas" >
          <select value={v.statusManual} onChange={set("statusManual")} className="campo">
            <option value="">Automática (pelas datas)</option>
            <option value="SUSPENSO">Suspenso</option>
            <option value="RESCINDIDO">Rescindido</option>
          </select>
        </Campo>
      </Bloco>

      <Bloco titulo="Responsáveis">
        <Campo rotulo="Gestor do contrato" largo>
          <input value={v.gestor} onChange={set("gestor")} className="campo" />
        </Campo>
        <Campo rotulo="Fiscal do contrato" largo>
          <input value={v.fiscal} onChange={set("fiscal")} className="campo" />
        </Campo>
      </Bloco>

      <section className="cartao p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Aditivos</h2>
          <button type="button" onClick={() => setV((x) => ({ ...x, aditivos: [...x.aditivos, { ...ADITIVO_VAZIO }] }))} className="botao-secundario">
            + Adicionar aditivo
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Se um aditivo informa <strong>novo valor</strong> ou <strong>novo fim de vigência</strong>, o contrato passa a usar esses dados (vale o aditivo mais recente).
        </p>
        {v.aditivos.length === 0 && <p className="text-sm text-slate-500">Nenhum aditivo cadastrado.</p>}
        <ol className="space-y-4">
          {v.aditivos.map((a, i) => (
            <li key={i} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Aditivo {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setV((x) => ({ ...x, aditivos: x.aditivos.filter((_, j) => j !== i) }))}
                  className="text-sm text-rose-700 hover:underline"
                >
                  Remover
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Campo rotulo="Identificação" dica="Ex.: 1º Termo Aditivo">
                  <input value={a.numero} onChange={(e) => setAd(i, "numero", e.target.value)} className="campo" />
                </Campo>
                <Campo rotulo="Tipo">
                  <select value={a.tipo} onChange={(e) => setAd(i, "tipo", e.target.value)} className="campo">
                    <option value="PRAZO">Prazo</option>
                    <option value="VALOR">Valor</option>
                    <option value="PRAZO_E_VALOR">Prazo e valor</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </Campo>
                <Campo rotulo="Data do aditivo" obrig erro={erros[`aditivos.${i}.data`]}>
                  <input type="date" value={a.data} onChange={(e) => setAd(i, "data", e.target.value)} className={cls(erros[`aditivos.${i}.data`])} />
                </Campo>
                <div />
                <Campo rotulo="Novo valor total (R$)" erro={erros[`aditivos.${i}.novoValor`]} dica="Deixe vazio se não mudou">
                  <input value={a.novoValor} onChange={(e) => setAd(i, "novoValor", e.target.value)} inputMode="decimal" className={cls(erros[`aditivos.${i}.novoValor`])} />
                </Campo>
                <Campo rotulo="Novo fim da vigência" erro={erros[`aditivos.${i}.novaDataFim`]} dica="Deixe vazio se não mudou">
                  <input type="date" value={a.novaDataFim} onChange={(e) => setAd(i, "novaDataFim", e.target.value)} className={cls(erros[`aditivos.${i}.novaDataFim`])} />
                </Campo>
                <div className="sm:col-span-2">
                  <Campo rotulo="Descrição">
                    <input value={a.descricao} onChange={(e) => setAd(i, "descricao", e.target.value)} className="campo" />
                  </Campo>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <Bloco titulo="Observações">
        <Campo rotulo="Observações" todo>
          <textarea value={v.observacoes} onChange={set("observacoes")} rows={4} className="campo" />
        </Campo>
      </Bloco>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        <div className="flex gap-2">
          <button type="submit" disabled={pendente} className="botao-primario">{pendente ? "Salvando…" : "Salvar contrato"}</button>
          <Link href={id ? `/contratos/${id}?voltar=${encodeURIComponent(voltar)}` : voltar} className="botao-secundario">Cancelar</Link>
        </div>
        {id && (
          <button type="button" onClick={excluir} disabled={pendente} className="botao text-rose-700 hover:bg-rose-50">
            Excluir contrato
          </button>
        )}
      </div>
    </form>
  );
}

function cls(erro?: string) {
  return `campo ${erro ? "campo-erro" : ""}`;
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="cartao p-5">
      <h2 className="mb-4 text-lg font-semibold">{titulo}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function Campo({
  rotulo,
  obrig,
  erro,
  dica,
  largo,
  todo,
  children,
}: {
  rotulo: string;
  obrig?: boolean;
  erro?: string;
  dica?: string;
  largo?: boolean;
  todo?: boolean;
  children: React.ReactElement;
}) {
  return (
    <label className={`block ${todo ? "sm:col-span-2 lg:col-span-4" : largo ? "sm:col-span-2" : ""}`} {...(erro ? { "data-erro": true } : {})}>
      <span className="rotulo">
        {rotulo} {obrig && <span className="text-rose-600" title="Obrigatório">*</span>}
      </span>
      {children}
      {erro ? <span className="mt-1 block text-xs text-rose-700">{erro}</span> : dica ? <span className="mt-1 block text-xs text-slate-500">{dica}</span> : null}
    </label>
  );
}
