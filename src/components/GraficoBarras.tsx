"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type Ponto = { chave: string; rotulo: string; quantidade: number; valor: number };

const COR = "#1f5fbf"; // marca-600 (validada: contraste ≥ 3:1 sobre branco)
const COR_ESMAECIDA = "#b9cdee";
const TEXTO = "#334155";
const TEXTO_SUAVE = "#64748b";
const GRADE = "#e2e8f0";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
/** Valor curto para eixos e rótulos (o título do gráfico já diz que é R$). */
function curta(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (v >= 1e3) return `${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export default function GraficoBarras({
  dados: dadosOriginais,
  medida,
  orientacao,
  selecionado,
  filtro,
  outrosFiltros,
  descricao,
}: {
  dados: Ponto[];
  medida: "quantidade" | "valor";
  orientacao: "vertical" | "horizontal";
  selecionado?: string;
  /** parâmetro da busca que a barra filtra */
  filtro: "ano" | "setor";
  /** demais filtros do painel, mantidos ao ir para a busca */
  outrosFiltros: Record<string, string>;
  descricao: string;
}) {
  const router = useRouter();
  // barras horizontais (setores) seguem a ordem da medida exibida
  const dados = orientacao === "horizontal" ? [...dadosOriginais].sort((a, b) => b[medida] - a[medida]) : dadosOriginais;
  const linkPara = (chave: string) => `/contratos?${new URLSearchParams({ ...outrosFiltros, [filtro]: chave })}`;
  const fmt = (v: number) => (medida === "valor" ? curta(v) : v.toLocaleString("pt-BR"));
  const horizontal = orientacao === "horizontal";
  const altura = horizontal ? Math.max(160, dados.length * 36 + 40) : 300;

  if (!dados.length) return <p className="py-10 text-center text-sm text-slate-500">Sem dados para os filtros escolhidos.</p>;

  const ir = (d: { chave?: string } | undefined) => d?.chave && router.push(linkPara(d.chave));

  return (
    <div>
      <div style={{ height: altura }} role="img" aria-label={descricao}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={horizontal ? { top: 4, right: 72, bottom: 4, left: 8 } : { top: 24, right: 8, bottom: 4, left: 8 }}
            barCategoryGap={horizontal ? 8 : "30%"}
          >
            <CartesianGrid stroke={GRADE} strokeWidth={1} vertical={horizontal} horizontal={!horizontal} />
            {horizontal ? (
              <>
                <XAxis type="number" tickFormatter={fmt} tick={{ fill: TEXTO_SUAVE, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="rotulo"
                  width={140}
                  tick={{ fill: TEXTO, fontSize: 12 }}
                  tickFormatter={(t: string) => (t.length > 20 ? t.slice(0, 19) + "…" : t)}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
              </>
            ) : (
              <>
                <XAxis dataKey="rotulo" tick={{ fill: TEXTO, fontSize: 12 }} axisLine={{ stroke: GRADE }} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ fill: TEXTO_SUAVE, fontSize: 12 }} axisLine={false} tickLine={false} width={medida === "valor" ? 56 : 36} allowDecimals={false} />
              </>
            )}
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Ponto;
                return (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                    <p className="font-medium text-slate-900">{p.rotulo}</p>
                    <p className="text-slate-700">{p.quantidade.toLocaleString("pt-BR")} {p.quantidade === 1 ? "contrato" : "contratos"}</p>
                    <p className="text-slate-700">{moeda.format(p.valor)}</p>
                    <p className="mt-1 text-xs text-slate-500">Clique para ver a lista</p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey={medida}
              maxBarSize={24}
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              cursor="pointer"
              onClick={(d) => ir(d.payload as Ponto)}
              isAnimationActive={false}
            >
              {dados.map((d) => (
                <Cell key={d.chave} fill={!selecionado || selecionado === d.chave ? COR : COR_ESMAECIDA} />
              ))}
              <LabelList
                dataKey={medida}
                content={(props) => {
                  const { x = 0, y = 0, width = 0, height = 0, value } = props as { x?: number; y?: number; width?: number; height?: number; value?: number };
                  const [tx, ty, anchor] = horizontal
                    ? [Number(x) + Number(width) + 6, Number(y) + Number(height) / 2 + 4, "start"]
                    : [Number(x) + Number(width) / 2, Number(y) - 6, "middle"];
                  return (
                    <text x={tx} y={ty} textAnchor={anchor as "start" | "middle"} fill={TEXTO} fontSize={12}>
                      {fmt(Number(value))}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-marca-700 hover:underline">Ver dados em tabela</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-slate-500">
            <tr><th className="py-1 font-medium"></th><th className="py-1 text-right font-medium">Contratos</th><th className="py-1 text-right font-medium">Valor atual</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dados.map((d) => (
              <tr key={d.chave}>
                <td className="py-1"><a className="text-marca-700 hover:underline" href={linkPara(d.chave)}>{d.rotulo}</a></td>
                <td className="py-1 text-right tabular-nums">{d.quantidade.toLocaleString("pt-BR")}</td>
                <td className="py-1 text-right tabular-nums">{moeda.format(d.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
