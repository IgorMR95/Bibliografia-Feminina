import { useState, useEffect } from "react";
import { getEstatisticas, getAssociadas, getObras } from "../lib/base";
import { aplicarFiltros, calcular, temFiltro } from "../lib/estatisticas";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LabelList,
} from "recharts";

/**
 * Paleta categórica derivada da logo do grupo e validada para a superfície
 * branca dos cartões (validate_palette.js, modo light, surface #ffffff):
 *   pior par adjacente CVD ΔE 13.2 · visão normal ΔE 18.5 · todas na banda
 *   de luminosidade, acima do piso de croma e acima de 3:1 de contraste.
 *
 * O teal e o terracota da logo (#258989 e #C57250) não entram como estão:
 * medidos, o teal da marca tem croma 0.088, abaixo do piso, e numa série
 * categórica leria como cinza. Os dois primeiros slots são as mesmas
 * famílias um pouco mais saturadas — parentes da marca, legíveis no
 * gráfico. Não reordene sem rodar o validador: a ordem é o mecanismo de
 * segurança para daltonismo, não escolha estética.
 */
const SERIES = ["#0a9191", "#c05f38", "#a34fa8", "#12a06a", "#3d6fd6", "#d9453f"];

/** cor única para séries de um valor só — o teal da identidade */
const UNICA = "#0a9191";

/**
 * A cor tem de seguir a categoria, nunca a posição dela no ranking: se um
 * filtro reordenar as fatias, "Advocacia Privada" precisa continuar com a
 * mesma cor. Por isso o slot vem de uma ordem canônica por nome, e não do
 * índice do array já ordenado por valor.
 */
const ORDEM_ATUACAO = [
  "Advocacia Privada",
  "Docência (Exclusivamente)",
  "Poder Judiciário",
  "Advocacia Pública",
  "Ministério Público",
  "Outros Setores",
  "Defensoria Pública",
  "Mediação / Conciliação",
  "Membro de Câmara Arb.",
];

/**
 * Rótulo do agregado da cauda. Não pode ser "Outros": existe a categoria
 * real "Outros Setores" na base, e as duas juntas na mesma legenda ficam
 * indistinguíveis.
 */
const AGREGADO = "Demais atuações";
const CINZA_OUTROS = "#8b9698";

function corDe(nome: string, ordem: string[]): string {
  if (nome === AGREGADO) return CINZA_OUTROS;
  const i = ordem.indexOf(nome);
  if (i >= 0) return SERIES[i % SERIES.length];
  // categoria não prevista: slot estável derivado do próprio nome
  let h = 0;
  for (let c = 0; c < nome.length; c++) h = (h * 31 + nome.charCodeAt(c)) >>> 0;
  return SERIES[h % SERIES.length];
}

/**
 * Mantém as maiores categorias e soma o resto em "Outros" — cortar a cauda
 * fora esconderia parte do total e faria as fatias não fecharem 100%.
 */
function comOutros(itens: Ponto[], maximo: number): Ponto[] {
  if (itens.length <= maximo) return itens;
  const cabeca = itens.slice(0, maximo - 1);
  const cauda = itens.slice(maximo - 1);
  const value = cauda.reduce((s, i) => s + i.value, 0);
  const pct = cauda.reduce((s, i) => s + i.pct, 0);
  // o agregado vai sempre por último, mesmo quando soma mais que a última
  // categoria nomeada — é a convenção que o leitor espera na legenda
  return [...cabeca, { name: AGREGADO, value, pct, rotulo: `${pct.toFixed(pct < 10 ? 1 : 0)}%` }];
}

const TINTA = "var(--text-main)";
const TINTA_SUAVE = "var(--text-muted)";
const GRADE = "var(--border)";

const fmt = (n: number) => n.toLocaleString("pt-BR");

/** o recorte metodológico da pesquisa começa em 2015 */
const ANO_INICIAL = 2015;

type Ponto = { name: string; value: number; pct: number; rotulo: string };

const CaixaTooltip = ({ active, payload, label, sufixo }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Ponto;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 shadow-md">
      <p className="text-[12px] font-semibold text-[var(--text-main)]">{label ?? p.name}</p>
      <p className="text-[12px] text-[var(--text-muted)]">
        {fmt(p.value)} {sufixo} · {p.pct.toFixed(1)}%
      </p>
    </div>
  );
};

const Cartao = ({
  titulo, nota, children, className = "",
}: { titulo: string; nota?: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-[var(--border)] p-6 ${className}`}>
    <h3 className="font-serif font-semibold text-[17px] text-[var(--text-main)]">{titulo}</h3>
    {nota && <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">{nota}</p>}
    <div className="mt-5">{children}</div>
  </div>
);

export const Dashboards = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    uf: "", ibdp: "", abep: "", ranking: "",
  });

  /** normaliza e já calcula a fatia de cada item sobre a base escolhida */
  const serie = (arr: any[], base?: number): Ponto[] => {
    const itens = (arr || []).map((i: any) => ({
      name: String(i.label ?? i.name ?? "—"),
      value: Number(i.valor ?? i.value ?? 0),
    }));
    const total = base ?? itens.reduce((s, i) => s + i.value, 0);
    return itens
      .map((i) => {
        const pct = total > 0 ? (i.value / total) * 100 : 0;
        return { ...i, pct, rotulo: `${pct.toFixed(pct < 10 ? 1 : 0)}%` };
      })
      .sort((a, b) => b.value - a.value);
  };

  /**
   * Sem filtro, usa o arquivo de estatísticas já somado (1 KB). Só quando
   * alguém filtra é que vale baixar a base inteira e recalcular no
   * navegador — assim a página abre instantânea no caso comum.
   */
  const loadStats = async () => {
    setLoading(true);
    try {
      if (!temFiltro(filters)) {
        setData(await getEstatisticas());
      } else {
        const [associadas, obras] = await Promise.all([getAssociadas(), getObras()]);
        setData(calcular(aplicarFiltros(associadas, filters), obras));
      }
    } catch {
      alert("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, [filters]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-[var(--text-muted)]">
        <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Cruzando dados geográficos e acadêmicos…</p>
      </div>
    );
  }

  const k = data.kpis || {};
  const total = k.total ?? 0;
  const totalObras = k.total_producoes ?? 0;

  const ufData = serie(data.por_uf).slice(0, 15);
  // titulações se sobrepõem (a mesma pessoa é mestre E doutora), então a
  // fatia é sobre a base inteira, não sobre a soma das barras
  const tituloData = serie(data.por_titulacao, total);
  const atuacaoData = comOutros(serie(data.por_atuacao), 6);
  const tipoData = serie(data.por_tipo_obra, totalObras);
  const areaData = serie(data.por_area, totalObras);

  // série temporal: respeita o recorte de 2015 e marca o ano ainda em curso
  const anoAtual = new Date().getFullYear();
  const anoBruto = (data.por_ano || []).filter((i: any) => Number(i.label) >= ANO_INICIAL);
  const anoData = anoBruto.map((i: any) => ({
    name: String(i.label),
    value: Number(i.valor),
    parcial: Number(i.label) >= anoAtual,
  }));
  const temParcial = anoData.some((a: any) => a.parcial);
  // trabalhos de titulação não seguem o recorte de 2015: há teses dos anos
  // 1970 em diante, que somam no total mas ficam fora deste gráfico
  const foraDoRecorte = (data.por_ano || [])
    .filter((i: any) => Number(i.label) < ANO_INICIAL)
    .reduce((s: number, i: any) => s + Number(i.valor), 0);

  const kpis = [
    { t: "Processualistas", v: total, s: "na base" },
    { t: "Produções", v: totalObras, s: "obras mapeadas" },
    { t: "Doutoras", v: k.total_doutoras ?? 0, s: `${total ? Math.round(((k.total_doutoras ?? 0) / total) * 100) : 0}% da base` },
    { t: "Mestres", v: k.total_mestres ?? 0, s: `${total ? Math.round(((k.total_mestres ?? 0) / total) * 100) : 0}% da base` },
    { t: "Docentes", v: k.total_docentes ?? 0, s: "lecionam em IES" },
    { t: "Ranking 40+", v: k.total_ranking_40 ?? 0, s: "IES no ranking" },
    { t: "IBDP", v: k.total_ibdp ?? 0, s: `${total ? Math.round(((k.total_ibdp ?? 0) / total) * 100) : 0}% da base` },
    { t: "ABEP", v: k.total_abep ?? 0, s: `${total ? Math.round(((k.total_abep ?? 0) / total) * 100) : 0}% da base` },
  ];

  const selectCls =
    "px-3 py-2 bg-transparent text-[11px] font-semibold uppercase tracking-wider outline-none border-r border-[var(--border)] last:border-0 text-[var(--text-muted)]";

  return (
    <div className="space-y-6 pb-16 fade-in max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-[26px] font-serif font-bold text-[var(--heading)] leading-tight">
            Estatísticas
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">
            Atuação, titulação e produção bibliográfica das processualistas mapeadas.
          </p>
        </div>

        <div className="bg-white p-1 rounded-lg border border-[var(--border)] flex flex-wrap items-center">
          <select value={filters.ibdp} onChange={(e) => setFilters({ ...filters, ibdp: e.target.value })} className={selectCls}>
            <option value="">IBDP</option><option value="true">Sim</option><option value="false">Não</option>
          </select>
          <select value={filters.abep} onChange={(e) => setFilters({ ...filters, abep: e.target.value })} className={selectCls}>
            <option value="">ABEP</option><option value="true">Sim</option><option value="false">Não</option>
          </select>
          <select value={filters.ranking} onChange={(e) => setFilters({ ...filters, ranking: e.target.value })} className={selectCls}>
            <option value="">Ranking 40+</option><option value="true">Sim</option><option value="false">Não</option>
          </select>
          <input type="text" placeholder="UF" maxLength={2} value={filters.uf}
            onChange={(e) => setFilters({ ...filters, uf: e.target.value.toUpperCase() })}
            className="w-14 px-2 py-2 bg-transparent text-[11px] font-semibold uppercase outline-none" />
          <button
            onClick={() => setFilters({ uf: "", ibdp: "", abep: "", ranking: "" })}
            className="px-3 py-2 text-[11px] font-semibold text-[var(--accent)] hover:underline"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.t} className="bg-white p-5 rounded-xl border border-[var(--border)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{kpi.t}</p>
            <p className="text-[28px] font-serif font-bold text-[var(--heading)] leading-none mt-2 tabular-nums">{fmt(kpi.v)}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">{kpi.s}</p>
          </div>
        ))}
      </div>

      {/* estados */}
      <Cartao
        titulo="Representatividade por Estado"
        nota={`Percentual sobre as ${fmt(total)} processualistas da base. 15 estados com maior presença.`}
      >
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ufData} margin={{ top: 24, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRADE} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: TINTA_SUAVE, fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: TINTA_SUAVE, fontSize: 11 }} width={36} />
              <Tooltip cursor={{ fill: "var(--row-hover)" }} content={<CaixaTooltip sufixo="processualistas" />} />
              <Bar dataKey="value" fill={UNICA} radius={[4, 4, 0, 0]} maxBarSize={38}>
                <LabelList dataKey="rotulo" position="top" style={{ fill: TINTA, fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Cartao>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* perfil acadêmico */}
        <Cartao
          titulo="Perfil Acadêmico"
          nota="Percentual sobre a base. Uma mesma pesquisadora pode ter mais de uma titulação, então os valores não somam 100%."
          className="lg:col-span-5"
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tituloData} layout="vertical" margin={{ left: 8, right: 56 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fill: TINTA, fontSize: 12 }} width={104}
                />
                <Tooltip cursor={{ fill: "var(--row-hover)" }} content={<CaixaTooltip sufixo="processualistas" />} />
                <Bar dataKey="value" fill={UNICA} radius={[0, 4, 4, 0]} maxBarSize={26}>
                  <LabelList
                    dataKey="rotulo" position="right"
                    style={{ fill: TINTA, fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Cartao>

        {/* atuação — rosca */}
        <Cartao
          titulo="Áreas de Atuação Profissional"
          nota="Distribuição das processualistas com atuação declarada."
          className="lg:col-span-7"
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={atuacaoData}
                  cx="38%" cy="50%"
                  innerRadius={58} outerRadius={98}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#fff" strokeWidth={2}
                  label={({ pct }: any) => (pct >= 6 ? `${pct.toFixed(0)}%` : "")}
                  labelLine={false}
                >
                  {atuacaoData.map((d) => <Cell key={d.name} fill={corDe(d.name, ORDEM_ATUACAO)} />)}
                </Pie>
                <Tooltip content={<CaixaTooltip sufixo="processualistas" />} />
                <Legend
                  layout="vertical" align="right" verticalAlign="middle"
                  iconType="circle" iconSize={9}
                  wrapperStyle={{ fontSize: "12px", lineHeight: "1.7", color: "var(--text-muted)", paddingLeft: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Cartao>
      </div>

      {/* produção */}
      <div className="pt-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.15em] text-[var(--accent)] mb-4">
          Produção Bibliográfica
        </h2>

        <div className="space-y-5">
          {/* NOVO: série temporal */}
          <Cartao
            titulo="Produção ao longo do tempo"
            nota={
              `Obras publicadas por ano, a partir de ${ANO_INICIAL} — recorte adotado pela pesquisa` +
              (foraDoRecorte > 0
                ? `, que não vale para dissertações e teses: ${fmt(foraDoRecorte)} delas foram defendidas antes disso e não aparecem aqui`
                : "") +
              `.` +
              (temParcial ? ` O ano de ${anoAtual} está em curso e aparece incompleto.` : "")
            }
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={anoData} margin={{ top: 20, right: 8 }}>
                  <defs>
                    <linearGradient id="gradAno" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={UNICA} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={UNICA} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRADE} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: TINTA_SUAVE, fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: TINTA_SUAVE, fontSize: 11 }} width={44} />
                  <Tooltip
                    cursor={{ stroke: GRADE }}
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 shadow-md">
                          <p className="text-[12px] font-semibold text-[var(--text-main)]">{label}</p>
                          <p className="text-[12px] text-[var(--text-muted)]">{fmt(p.value)} obras</p>
                          {p.parcial && <p className="text-[11px] text-[var(--warning)] mt-0.5">ano em curso</p>}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone" dataKey="value"
                    stroke={UNICA} strokeWidth={2}
                    fill="url(#gradAno)"
                    dot={{ r: 3, fill: UNICA, strokeWidth: 0 }}
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  >
                    <LabelList dataKey="value" position="top" style={{ fill: TINTA_SUAVE, fontSize: 10 }} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Cartao>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/*
              Barra, não rosca: com as dissertações e teses somadas são 9
              tipos, e a paleta categórica valida 6 — a partir daí as cores
              teriam de ciclar, que é justamente o que a torna insegura para
              daltonismo. Em barra a comparação não depende de cor nenhuma.
            */}
            <Cartao titulo="Tipologia das Obras" nota={`Percentual sobre as ${fmt(totalObras)} obras mapeadas.`}>
              <div className="h-[290px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tipoData} layout="vertical" margin={{ left: 8, right: 52 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category" dataKey="name" axisLine={false} tickLine={false}
                      tick={{ fill: TINTA, fontSize: 11 }} width={150}
                      tickFormatter={(v: string) =>
                        v.replace("Dissertação de ", "").replace("Tese de ", "")
                         .replace("Coluna em Jornais e Sites", "Colunas")
                         .replace("Capitulo de Livro", "Capítulo de Livro")}
                    />
                    <Tooltip cursor={{ fill: "var(--row-hover)" }} content={<CaixaTooltip sufixo="obras" />} />
                    <Bar dataKey="value" fill={UNICA} radius={[0, 4, 4, 0]} maxBarSize={18}>
                      <LabelList dataKey="rotulo" position="right" style={{ fill: TINTA, fontSize: 11, fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Cartao>

            {/* áreas do processo */}
            <Cartao titulo="Áreas do Processo" nota={`Percentual sobre as ${fmt(totalObras)} obras mapeadas.`}>
              <div className="h-[290px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaData} margin={{ top: 24, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRADE} />
                    <XAxis
                      dataKey="name" axisLine={false} tickLine={false}
                      tick={{ fill: TINTA_SUAVE, fontSize: 10 }}
                      angle={-25} textAnchor="end" height={60}
                      tickFormatter={(v: string) => v.replace("P. ", "")}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: TINTA_SUAVE, fontSize: 11 }} width={44} />
                    <Tooltip cursor={{ fill: "var(--row-hover)" }} content={<CaixaTooltip sufixo="obras" />} />
                    <Bar dataKey="value" fill={UNICA} radius={[4, 4, 0, 0]} maxBarSize={44}>
                      <LabelList dataKey="rotulo" position="top" style={{ fill: TINTA, fontSize: 11, fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Cartao>
          </div>

        </div>
      </div>
    </div>
  );
};
