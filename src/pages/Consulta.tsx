import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Search, Eye, Trash2, Download } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import * as xlsx from "xlsx";

const LIMIT = 15;

export const Consulta = () => {
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [ibdp, setIbdp] = useState("");
  const [abep, setAbep] = useState("");
  const [docente, setDocente] = useState("");
  const [ranking, setRanking] = useState("");
  const [status, setStatus] = useState("");

  const navigate = useNavigate();
  const { user } = useAuth();

  const buildQuery = async (forExport = false) => {
    let query = supabase
      .from("associadas")
      .select("id, nome, email, ibdp, abep, status_registro", { count: "exact" })
      .is("deletado_em", null)
      .order("nome");

    if (search) query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
    if (ibdp !== "") query = query.eq("ibdp", ibdp === "true");
    if (abep !== "") query = query.eq("abep", abep === "true");
    if (docente !== "") query = query.eq("leciona", docente === "true");
    if (status) query = query.eq("status_registro", status);

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

  useEffect(() => { loadData(); }, [page, ibdp, abep, docente, ranking, status]);

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

  const exportData = async (format: "csv" | "xlsx") => {
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
                placeholder="Nome, email, tese..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-[var(--border)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
            </div>
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

          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => exportData("csv")} className="flex items-center px-4 py-2 bg-white border border-[var(--border)] text-[var(--text-main)] text-sm font-semibold rounded-lg hover:bg-[var(--row-hover)] transition shadow-sm">
              <Download className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
              Exportar CSV
            </button>
            <button type="button" onClick={() => exportData("xlsx")} className="flex items-center px-4 py-2 bg-white border border-[var(--border)] text-[var(--text-main)] text-sm font-semibold rounded-lg hover:bg-[var(--row-hover)] transition shadow-sm">
              <Download className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
              Exportar Excel
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
                <th className="px-4 py-3 font-semibold text-center">IBDP</th>
                <th className="px-4 py-3 font-semibold text-center">ABEP</th>
                <th className="px-4 py-3 font-semibold">Situação</th>
                <th className="px-6 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">Carregando...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">Nenhum registro encontrado.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--row-hover)] transition-colors">
                    <td className="px-6 py-4 font-bold text-[var(--text-main)]">{item.nome}</td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">{item.email || "-"}</td>
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
                      <button onClick={() => navigate(`/consulta/${item.id}`)} className="p-1.5 text-[var(--text-muted)] hover:text-blue-600 rounded transition" title="Visualizar">
                        <Eye className="w-4 h-4" />
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
