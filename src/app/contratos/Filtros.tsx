"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import type { ParamsBusca } from "@/lib/busca";

type Opcoes = {
  setores: { id: number; nome: string }[];
  modalidades: { id: number; nome: string }[];
  anos: number[];
};

const STATUS = [
  ["VIGENTE", "Vigente"],
  ["VENCE_90", "Vence em até 90 dias"],
  ["A_INICIAR", "A iniciar"],
  ["ENCERRADO", "Encerrado"],
  ["SUSPENSO", "Suspenso"],
  ["RESCINDIDO", "Rescindido"],
];

export default function Filtros({ params, opcoes }: { params: ParamsBusca; opcoes: Opcoes }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);

  function aplicar() {
    const fd = new FormData(form.current!);
    const r = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (typeof v === "string" && v.trim()) r.set(k, v.trim());
    if (params.modo) r.set("modo", params.modo);
    if (params.ordem) r.set("ordem", params.ordem);
    if (params.dir) r.set("dir", params.dir);
    if (params.porPagina) r.set("porPagina", params.porPagina);
    router.push(`/contratos${r.toString() ? `?${r}` : ""}`);
  }

  // chave força o formulário a refletir a URL ao navegar (ex.: "Limpar filtros")
  const chave = JSON.stringify(params);

  return (
    <form
      key={chave}
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        aplicar();
      }}
      className="cartao space-y-3 p-4"
      role="search"
    >
      <div className="flex gap-2">
        <label htmlFor="q" className="sr-only">Buscar</label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={params.q}
          placeholder="Ex.: merenda, 15/2024, Construtora Horizonte, Saúde…"
          className="campo text-base"
          autoComplete="off"
        />
        <button type="submit" className="botao-primario shrink-0">🔍 Buscar</button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Select nome="ano" rotulo="Ano" valor={params.ano} aoMudar={aplicar} opcoes={opcoes.anos.map((a) => [String(a), String(a)])} />
        <Select nome="setor" rotulo="Setor" valor={params.setor} aoMudar={aplicar} opcoes={opcoes.setores.map((s) => [String(s.id), s.nome])} />
        <Select nome="modalidade" rotulo="Modalidade" valor={params.modalidade} aoMudar={aplicar} opcoes={opcoes.modalidades.map((m) => [String(m.id), m.nome])} />
        <Select nome="status" rotulo="Situação" valor={params.status} aoMudar={aplicar} opcoes={STATUS} />
        <div>
          <label className="rotulo" htmlFor="valorMin">Valor mínimo (R$)</label>
          <input id="valorMin" name="valorMin" inputMode="decimal" defaultValue={params.valorMin} placeholder="0" className="campo" onBlur={aplicar} />
        </div>
        <div>
          <label className="rotulo" htmlFor="valorMax">Valor máximo (R$)</label>
          <input id="valorMax" name="valorMax" inputMode="decimal" defaultValue={params.valorMax} placeholder="sem limite" className="campo" onBlur={aplicar} />
        </div>
      </div>
    </form>
  );
}

function Select({ nome, rotulo, valor, opcoes, aoMudar }: { nome: string; rotulo: string; valor?: string; opcoes: string[][]; aoMudar: () => void }) {
  // Valores combinados vindos do painel (ex.: "1,2") aparecem como opção extra
  const extra = valor && !opcoes.some(([v]) => v === valor) ? [[valor, "(vários)"]] : [];
  return (
    <div>
      <label className="rotulo" htmlFor={nome}>{rotulo}</label>
      <select id={nome} name={nome} defaultValue={valor ?? ""} onChange={aoMudar} className="campo">
        <option value="">Todos</option>
        {[...extra, ...opcoes].map(([v, r]) => (
          <option key={v} value={v}>{r}</option>
        ))}
      </select>
    </div>
  );
}
