import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

export const Dashboards = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    uf: "",
    status_registro: "",
    ibdp: "",
    abep: "",
    ranking: "",
    graduacao: "",
    pos: ""
  });

  const toChart = (arr: any[]) =>
    (arr || []).map((item: any) => ({ name: item.label ?? item.name ?? "N/A", value: item.valor ?? item.value ?? 0 }))
              .sort((a: any, b: any) => b.value - a.value);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc("get_dashboard_stats", {
        p_uf: filters.uf || null,
        p_status: filters.status_registro || null,
        p_ibdp: filters.ibdp !== "" ? filters.ibdp === "true" : null,
        p_abep: filters.abep !== "" ? filters.abep === "true" : null,
        p_ranking: filters.ranking !== "" ? filters.ranking === "true" : null,
        p_leciona: null,
      });
      if (error) throw error;
      setData(result);
    } catch {
      alert("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, [filters]);

  if (loading || !data) return (
    <div className="flex flex-col items-center justify-center p-20 text-[var(--text-muted)] animate-pulse">
      <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-serif italic">Cruzando dados geográficos e acadêmicos...</p>
    </div>
  );

  const kpis = data.kpis || {};
  const ufData       = toChart(data.por_uf       || data.charts?.uf       || []);
  const tituloData   = toChart(data.por_titulacao || data.charts?.titulo   || []);
  const atuacaoData  = toChart(data.por_atuacao   || data.charts?.atuacao  || []).slice(0, 8);
  const assocData    = toChart(data.por_associacao || data.charts?.associacao || []);
  const prodTipoData = toChart(data.por_tipo_obra  || data.charts?.producao_tipo || []);
  const prodAreaData = toChart(data.por_area       || data.charts?.producao_area || []);

  const colors = ["#863F56", "#C18C3F", "#4A6741", "#5C5C7A", "#7A7A76"];

  const mainKPIs = [
    { title: "Total Mapeado",   value: kpis.total ?? 0,              sub: "Processualistas" },
    { title: "Membros IBDP",    value: kpis.ibdp ?? 0,               sub: `${kpis.total ? Math.round(((kpis.ibdp ?? 0) / kpis.total) * 100) : 0}% da base` },
    { title: "Membros ABEP",    value: kpis.abep ?? 0,               sub: `${kpis.total ? Math.round(((kpis.abep ?? 0) / kpis.total) * 100) : 0}% da base` },
    { title: "Docentes Ativas", value: kpis.docentes ?? 0,           sub: "Lecionam em IES" },
    { title: "Ranking 40+",     value: kpis.ranking_total ?? kpis.rankingTotal ?? 0, sub: `${kpis.total_instituicoes ?? kpis.totalInstituicoes ?? 0} Instituições Totais` },
    { title: "Votos Ranking",   value: kpis.ranking_votos ?? kpis.rankingVotos ?? 0, sub: "IES no Ranking 40+" },
    { title: "Doutoras",        value: kpis.doutoras ?? 0,           sub: "Título de Doutorado" },
    { title: "Obras Mapeadas",  value: kpis.total_producao ?? kpis.totalProducao ?? 0, sub: "Desde 2015" },
  ];

  return (
    <div className="space-y-8 pb-10 fade-in max-w-7xl mx-auto px-4">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-serif italic text-[var(--accent)]">Observatório de Processualistas</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Dados consolidados de atuação, titulação e representatividade.</p>
        </div>

        <div className="bg-white p-2 rounded-xl border border-[var(--border)] shadow-sm flex flex-wrap gap-2">
          <select value={filters.status_registro} onChange={e => setFilters({ ...filters, status_registro: e.target.value })} className="px-3 py-2 bg-transparent text-xs font-bold uppercase tracking-wider outline-none border-r border-[var(--border)] last:border-0">
            <option value="">Status</option>
            <option value="ATIVO">Ativos</option>
            <option value="REVISAR">Revisar</option>
          </select>
          <select value={filters.ibdp} onChange={e => setFilters({ ...filters, ibdp: e.target.value })} className="px-3 py-2 bg-transparent text-xs font-bold uppercase tracking-wider outline-none border-r border-[var(--border)] last:border-0">
            <option value="">IBDP</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
          <select value={filters.abep} onChange={e => setFilters({ ...filters, abep: e.target.value })} className="px-3 py-2 bg-transparent text-xs font-bold uppercase tracking-wider outline-none border-r border-[var(--border)] last:border-0">
            <option value="">ABEP</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
          <select value={filters.ranking} onChange={e => setFilters({ ...filters, ranking: e.target.value })} className="px-3 py-2 bg-transparent text-xs font-bold uppercase tracking-wider outline-none border-r border-[var(--border)] last:border-0">
            <option value="">Ranking 40+</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
          <input type="text" placeholder="UF" maxLength={2} value={filters.uf} onChange={e => setFilters({ ...filters, uf: e.target.value.toUpperCase() })} className="w-12 px-2 py-2 bg-transparent text-xs font-bold uppercase outline-none" />
          <button onClick={() => setFilters({ uf: "", status_registro: "", ibdp: "", abep: "", ranking: "", graduacao: "", pos: "" })} className="px-3 text-xs text-[var(--error)] font-bold">Limpar</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {mainKPIs.map((kpi, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-[var(--border)] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 group">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--accent)] transition mb-1">{kpi.title}</p>
            <p className="text-3xl font-serif italic text-[var(--text-main)] mb-1">{kpi.value}</p>
            <p className="text-[10px] text-[var(--accent)] font-medium">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        <div className="md:col-span-8 bg-white p-6 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-serif italic text-xl text-[var(--text-main)]">Representatividade por Estado</h3>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Mapeamento Geográfico</div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ufData.slice(0, 15)} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} angle={-45} textAnchor="end" />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <Tooltip cursor={{ fill: "var(--row-hover)" }} contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="md:col-span-4 bg-white p-6 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col">
          <h3 className="font-serif italic text-xl text-[var(--text-main)] mb-6">Vínculos Institucionais</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={assocData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {assocData.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "20px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="md:col-span-5 bg-white p-6 rounded-2xl border border-[var(--border)] shadow-sm">
          <h3 className="font-serif italic text-xl text-[var(--text-main)] mb-6">Perfil Acadêmico</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tituloData} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--text-main)", fontSize: 11, fontWeight: 500 }} width={100} />
                <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "12px" }} />
                <Bar dataKey="value" fill="#C18C3F" radius={[0, 4, 4, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-[var(--border)] shadow-sm">
          <h3 className="font-serif italic text-xl text-[var(--text-main)] mb-6">Áreas de Atuação Profissional</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={atuacaoData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <Tooltip contentStyle={{ borderRadius: "12px" }} />
                <Area type="monotone" dataKey="value" stroke="var(--accent)" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-serif italic text-[var(--accent)] border-b border-[var(--border)] pb-2">Produção Bibliográfica Pós-2015</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[var(--border)] shadow-sm">
            <h3 className="font-serif italic text-xl text-[var(--text-main)] mb-6">Tipologia das Obras</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={prodTipoData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {prodTipoData.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[var(--border)] shadow-sm">
            <h3 className="font-serif italic text-xl text-[var(--text-main)] mb-6">Áreas do Processo</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prodAreaData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "var(--row-hover)" }} />
                  <Bar dataKey="value" fill="#4A6741" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
