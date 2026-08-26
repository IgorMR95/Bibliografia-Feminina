import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Search, Trash2, Download } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { BuscaObras } from "../components/BuscaObras";
import * as xlsx from "xlsx";

const LIMIT = 15;

const BuscaPessoas = () => {
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [exportingAll, setExportingAll] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [ibdp, setIbdp] = useState("");
  const [abep, setAbep] = useState("");
  const [docente, setDocente] = useState("");
  const [ranking, setRanking] = useState("");
  const [status, setStatus] = useState("");
  const [uf, setUf] = useState("");
  const [formacao, setFormacao] = useState("");

  const navigate = useNavigate();
  const { user } = useAuth();

  const buildQuery = async (forExport = false) => {
    let query = supabase
      .from("associadas")
      .select("id, nome, email, ibdp, abep, status_registro, uf_atuacao, doutora, mestre, especialista, livre_docente", { count: "exact" })
      .is("deletado_em", null)
      .order("nome");

    if (search) query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
    if (ibdp !== "") query = query.eq("ibdp", ibdp === "true");
    if (abep !== "") query = query.eq("abep", abep === "true");
    if (docente !== "") query = query.eq("leciona", docente === "true");
    if (status) query = query.eq("status_registro", status);
    if (uf) query = query.ilike("uf_atuacao", `%${uf}%`);
    if (formacao === "doutora") query = query.eq("doutora", true);
    if (formacao === "mestre") query = query.eq("mestre", true);
    if (formacao === "especialista") query = query.eq("especialista", true);
    if (formacao === "livre_docente") query = query.eq("livre_docente", true);

    if (ranking !== "") {
      const { data: rankRows } = await supabase
        .from("vinculos_docentes")
        .select("associada_id")
        .eq("integra_ranking_40", true);
      const idsWithRanking = [...new Set((rankRows || []).map((r: any) => r.associada_id))];

      if (ranking === "true") {
        const ids = idsWithRanking.length > 0 ? idsWithRanking : ["00000000-0000-0000-0000-000000000000"];
        query = query.in("id", ids);
      } else if (idsWithRanking.length > 0) {
        query = query.not("id", "in", `(${idsWithRanking.join(",")})`);
      }
    }

    if (!forExport) {
      const from = (page - 1) * LIMIT;
      query = query.range(from, from + LIMIT - 1);
    } else {
      query = query.limit(5000);
    }

    return query;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: rows, count, error } = await buildQuery();
      if (error) throw error;
      setData(rows || []);
      setMeta({ page, total: count || 0, totalPages: Math.ceil((count || 0) / LIMIT) });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [page, ibdp, abep, docente, ranking, status, uf, formacao]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
      await supabase.from("associadas").update({ deletado_em: new Date().toISOString() }).eq("id", id);
      loadData();
    }
  };

  const exportFiltered = async (format: "csv" | "xlsx") => {
    try {
      const { data: rows, error } = await buildQuery(true);
      if (error || !rows || rows.length === 0) { alert("Nenhum dado para exportar"); return; }

      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Associadas");

      if (format === "csv") {
        const csv = xlsx.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "export_associadas.csv";
        link.click();
      } else {
        xlsx.writeFile(wb, "export_associadas.xlsx");
      }
    } catch {
      alert("Erro ao exportar");
    }
  };

  const fetchAllPages = async (table: string, select: string) => {
    const rows: any[] = [];
    let from = 0;
    const size = 1000;
    while (true) {
      const { data, error } = await supabase.from(table).select(select).range(from, from + size - 1);
      if (error || !data || data.length === 0) break;
      rows.push(...data);
      if (data.length < size) break;
      from += size;
    }
    return rows;
  };

  const exportAll = async () => {
    setExportingAll(true);
    try {
      const [assoc, vinculos, producoes] = await Promise.all([
        fetchAllPages("associadas", "*"),
        fetchAllPages("vinculos_docentes", "*"),
        fetchAllPages("producoes_bibliograficas", "*"),
      ]);

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(assoc), "Associadas");
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(vinculos), "Vínculos Docentes");
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(producoes), "Produções Bibliográficas");

      const date = new Date().toISOString().split("T")[0];
      xlsx.writeFile(wb, `base_completa_${date}.xlsx`);
    } catch {
      alert("Erro ao exportar base completa");
    } finally {
      setExportingAll(false);
    }
  };

  const badgeStyle = (val: boolean) =>
    val ? "bg-[var(--success-bg)] text-[var(--success)] border-transparent"
        : "bg-white text-[var(--text-muted)] border-[var(--border)]";

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-[var(--border)] shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Busca Geral</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nome, email..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-[var(--border)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
            </div>
          </div>

          <div className="w-24">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">UF</label>
            <input
              type="text"
              placeholder="Ex: SP"
              maxLength={2}
              className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none uppercase"
              value={uf}
              onChange={(e) => { setUf(e.target.value.toUpperCase()); setPage(1); }}
            />
          </div>

          <div className="w-32">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">IBDP</label>
            <select value={ibdp} onChange={e => { setIbdp(e.target.value); setPage(1); }} className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none text-[var(--text-main)]">
              <option value="">Todos</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">ABEP</label>
            <select value={abep} onChange={e => { setAbep(e.target.value); setPage(1); }} className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none text-[var(--text-main)]">
              <option value="">Todos</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
          <div className="w-36">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Formação</label>
            <select value={formacao} onChange={e => { setFormacao(e.target.value); setPage(1); }} className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none text-[var(--text-main)]">
              <option value="">Todas</option>
              <option value="doutora">Doutora</option>
              <option value="mestre">Mestre</option>
              <option value="especialista">Especialista</option>
              <option value="livre_docente">Livre-Docente</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Docente</label>
            <select value={docente} onChange={e => { setDocente(e.target.value); setPage(1); }} className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none text-[var(--text-main)]">
              <option value="">Todos</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Ranking 40+</label>
            <select value={ranking} onChange={e => { setRanking(e.target.value); setPage(1); }} className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none text-[var(--text-main)]">
              <option value="">Todos</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Status</label>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none text-[var(--text-main)]">
              <option value="">Todos</option>
              <option value="ATIVO">Ativo</option>
              <option value="INCOMPLETO">Incompleto</option>
              <option value="REVISAR">Revisar</option>
              <option value="DUPLICADO">Duplicado</option>
            </select>
          </div>
          <button type="submit" className="px-5 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--accent-hover)] transition">
            Filtrar
          </button>

          <div className="ml-auto flex gap-2 flex-wrap justify-end">
            <button type="button" onClick={() => exportFiltered("csv")} className="flex items-center px-4 py-2 bg-white border border-[var(--border)] text-[var(--text-main)] text-sm font-semibold rounded-lg hover:bg-[var(--row-hover)] transition shadow-sm">
              <Download className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
              Exportar Filtrado (CSV)
            </button>
            <button type="button" onClick={() => exportFiltered("xlsx")} className="flex items-center px-4 py-2 bg-white border border-[var(--border)] text-[var(--text-main)] text-sm font-semibold rounded-lg hover:bg-[var(--row-hover)] transition shadow-sm">
              <Download className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
              Exportar Filtrado (Excel)
            </button>
            <button type="button" onClick={exportAll} disabled={exportingAll} className="flex items-center px-4 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--accent-hover)] transition shadow-sm disabled:opacity-60">
              <Download className="w-4 h-4 mr-2" />
              {exportingAll ? "Exportando..." : "Exportar Base Completa"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-white text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-3 font-semibold">Nome</th>
                <th className="px-6 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold text-center">UF</th>
                <th className="px-4 py-3 font-semibold text-center">IBDP</th>
                <th className="px-4 py-3 font-semibold text-center">ABEP</th>
                <th className="px-4 py-3 font-semibold">Situação</th>
                <th className="px-6 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-[var(--text-muted)]">Carregando...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-[var(--text-muted)]">Nenhum registro encontrado.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--row-hover)] transition-colors">
                    <td className="px-6 py-4 font-bold text-[var(--text-main)]">{item.nome}</td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">{item.email || "-"}</td>
                    <td className="px-4 py-4 text-center text-[var(--text-muted)]">{item.uf_atuacao || "-"}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] rounded border font-bold uppercase ${badgeStyle(item.ibdp)}`}>
                        {item.ibdp ? "SIM" : "NÃO"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] rounded border font-bold uppercase ${badgeStyle(item.abep)}`}>
                        {item.abep ? "SIM" : "NÃO"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase tracking-wider rounded font-bold ${
                        item.status_registro === "ATIVO" ? "bg-[var(--success-bg)] text-[var(--success)]" :
                        item.status_registro === "DUPLICADO" ? "bg-[var(--error-bg)] text-[var(--error)]" :
                        "bg-[var(--warning-bg)] text-[var(--warning)]"
                      }`}>
                        {item.status_registro}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/consulta/${item.id}`)}
                        className="px-3 py-1.5 text-xs font-semibold text-[var(--accent)] border border-[var(--accent)] rounded-lg hover:bg-[var(--accent)] hover:text-white transition"
                      >
                        Ver Detalhes
                      </button>
                      {user?.role === "ADMIN" && (
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--error)] rounded transition" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-white text-xs text-[var(--text-muted)] rounded-b-xl">
          <div>
            Mostrando página <span className="font-bold text-[var(--text-main)]">{meta.page}</span> de <span className="font-bold text-[var(--text-main)]">{meta.totalPages || 1}</span> (Total de {meta.total} registros)
          </div>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 bg-white border border-[var(--border)] rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              disabled={page === meta.totalPages || !meta.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 bg-white border border-[var(--border)] rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * A consulta tem duas entradas: por pessoa (quem sao as processualistas) e
 * por obra (o que foi escrito sobre um assunto). A segunda e' o caminho de
 * quem procura bibliografia sobre um tema e so depois chega nas autoras.
 */
export const Consulta = () => {
  const [aba, setAba] = useState<"pessoas" | "obras">("pessoas");

  const abaCls = (ativa: boolean) =>
    `px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
      ativa
        ? "border-[var(--accent)] text-[var(--accent)]"
        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
    }`;

  return (
    <div className="space-y-5">
      <div className="flex border-b border-[var(--border)]">
        <button className={abaCls(aba === "pessoas")} onClick={() => setAba("pessoas")}>
          Processualistas
        </button>
        <button className={abaCls(aba === "obras")} onClick={() => setAba("obras")}>
          Obras
        </button>
      </div>

      {aba === "pessoas" ? <BuscaPessoas /> : <BuscaObras />}
    </div>
  );
};
