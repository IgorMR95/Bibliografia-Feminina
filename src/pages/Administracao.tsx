import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { callEdgeFunction } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { UserPlus, Clock } from "lucide-react";
import { ImportarBase } from "../components/ImportarBase";

const TABS = {
  usuarios: "Usuários",
  auditoria: "Histórico de Alimentação",
  campos: "Campos Base Extras",
  tabelas: "Gerar Novas Tabelas",
  importar: "Substituir Base (Planilha)",
} as const;

export const Administracao = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [tabelas, setTabelas] = useState<any[]>([]);
  const [camposExtras, setCamposExtras] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("usuarios");
  const { user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ nome: "", email: "", senha: "", role: "ANOTADOR" });

  const loadData = async () => {
    try {
      const [usersRes, auditRes, tabelasRes, camposRes] = await Promise.all([
        callEdgeFunction("admin-users", "GET"),
        supabase.from("audit_logs").select("*, perfis(nome)").order("criado_em", { ascending: false }).limit(100),
        supabase.from("definicoes_tabelas").select("*").order("nome"),
        supabase.from("definicoes_campos_extras").select("*").eq("entidade", "Associada").order("label"),
      ]);
      setUsers(usersRes || []);
      setAuditLogs(auditRes.data || []);
      setTabelas(tabelasRes.data || []);
      setCamposExtras(camposRes.data || []);
    } catch {
      alert("Erro ao carregar dados administrativos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (user?.role !== "ADMIN") return null;

  const handleDelete = async (id: string) => {
    if (id === user.id) return alert("Não pode excluir a si próprio.");
    if (confirm("Confirmar exclusão de usuário?")) {
      await callEdgeFunction("admin-users", "DELETE", undefined, id);
      loadData();
    }
  };

  const openNew = () => {
    setIsEditing(null);
    setFormData({ nome: "", email: "", senha: "", role: "ANOTADOR" });
    setShowModal(true);
  };

  const openEdit = (u: any) => {
    setIsEditing(u);
    setFormData({ nome: u.nome, email: u.email, senha: "", role: u.role });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await callEdgeFunction("admin-users", "PUT", formData, isEditing.id);
      } else {
        await callEdgeFunction("admin-users", "POST", formData);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar usuário. Email pode já estar em uso.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif italic text-[var(--text-main)]">Administração do Sistema</h2>
          <p className="text-sm text-[var(--text-muted)]">Gerenciamento de acessos e histórico de auditoria.</p>
        </div>
        {activeTab === "usuarios" && (
          <button onClick={openNew} className="flex items-center px-4 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--accent-hover)] transition shadow-sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Usuário
          </button>
        )}
      </div>

      <div className="flex border-b border-[var(--border)] overflow-x-auto whitespace-nowrap">
        {Object.entries(TABS).map(([tab, label]) => (
          <button
            key={tab}
            className={`px-4 py-3 font-semibold text-sm ${activeTab === tab ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "importar" && <ImportarBase />}

      {activeTab === "usuarios" && (
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-[var(--text-muted)]">Carregando...</div>
          ) : (
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-white px-4 text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-6 py-3 font-semibold">Nome</th>
                  <th className="px-6 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Permissão</th>
                  <th className="px-6 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-[var(--row-hover)]">
                    <td className="px-6 py-4 font-bold text-[var(--text-main)]">{u.nome}</td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">{u.email}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded ${u.role === "ADMIN" ? "bg-[#5e5e45] text-white" : "bg-white border border-[var(--border)] text-[var(--text-muted)]"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => openEdit(u)} className="text-[var(--accent)] hover:text-black font-semibold">Editar</button>
                      {u.id !== user.id && <button onClick={() => handleDelete(u.id)} className="text-[var(--error)] hover:text-red-800 font-semibold">Excluir</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "auditoria" && (
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden p-6 space-y-4">
          {loading ? (
            <div className="p-10 text-center text-[var(--text-muted)]">Carregando auditoria...</div>
          ) : auditLogs.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-muted)]">Nenhum registro encontrado.</div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="flex items-start bg-[var(--row-hover)] p-4 rounded-lg border border-[var(--border)]">
                  <div className="mr-4 mt-1 text-[var(--text-muted)]"><Clock className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--text-main)]">
                      {log.perfis?.nome || "Sistema"} <span className="font-normal text-[var(--text-muted)]">realizou ação de</span>{" "}
                      <span className="uppercase text-[var(--accent)] font-bold text-xs">{log.acao}</span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Entidade: {log.entidade} (ID: {log.entidade_id || "N/A"})
                    </p>
                    {log.detalhes && (
                      <pre className="mt-2 bg-white p-2 rounded border border-[var(--border)] text-[10px] overflow-auto max-w-full text-[var(--text-muted)]">
                        {JSON.stringify(log.detalhes, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] whitespace-nowrap pl-4">
                    {new Date(log.criado_em).toLocaleString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "campos" && (
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Campos Extras (Processualistas)</h3>
            <button
              onClick={async () => {
                const nome = prompt("Nome Interno do Campo (ex: link_twitter)");
                if (!nome) return;
                const label = prompt("Rótulo de Exibição (ex: Link do Twitter)");
                if (!label) return;
                await supabase.from("definicoes_campos_extras").insert({ entidade: "Associada", nome_campo: nome, tipo: "string", label });
                loadData();
              }}
              className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--accent-hover)] transition shadow-sm"
            >
              + Adicionar Campo
            </button>
          </div>
          <table className="w-full text-left text-xs whitespace-nowrap border-t border-[var(--border)]">
            <thead className="bg-[#fcfcfa] text-[11px] uppercase text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr><th className="px-4 py-3">Rótulo</th><th className="px-4 py-3">Chave Interna</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Ação</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {camposExtras.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-slate-500">Nenhum campo extra.</td></tr>}
              {camposExtras.map((c: any) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-semibold">{c.label}</td>
                  <td className="px-4 py-3">{c.nome_campo}</td>
                  <td className="px-4 py-3 text-slate-500">{c.tipo}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={async () => { if (confirm("Deletar campo?")) { await supabase.from("definicoes_campos_extras").delete().eq("id", c.id); loadData(); } }} className="text-red-500">Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "tabelas" && (
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Tabelas Satélites Personalizadas</h3>
            <button
              onClick={async () => {
                const nome = prompt("Nome da Tabela (ex: Participações_Eventos_Internacionais)");
                if (!nome) return;
                const jsonBase = '{"nome_evento":"string","ano":"string"}';
                const campos = prompt(`Colunas em JSON. Ex: \n${jsonBase}`, jsonBase);
                if (!campos) return;
                let camposJson: any;
                try { camposJson = JSON.parse(campos); } catch { return alert("JSON inválido"); }
                await supabase.from("definicoes_tabelas").insert({ nome, campos: camposJson });
                loadData();
              }}
              className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--accent-hover)] transition shadow-sm"
            >
              + Criar Nova Tabela
            </button>
          </div>
          <table className="w-full text-left text-xs whitespace-nowrap border-t border-[var(--border)]">
            <thead className="bg-[#fcfcfa] text-[11px] uppercase text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr><th className="px-4 py-3">Nome da Tabela</th><th className="px-4 py-3">Schema</th><th className="px-4 py-3 text-right">Ação</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {tabelas.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-slate-500">Nenhuma tabela extra.</td></tr>}
              {tabelas.map((t: any) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-semibold">{t.nome}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-sm truncate">{JSON.stringify(t.campos)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={async () => { if (confirm("CUIDADO: Remover a tabela apagará todos os dados anexados a ela. Continuar?")) { await supabase.from("definicoes_tabelas").delete().eq("id", t.id); loadData(); } }} className="text-red-500">Remover Tabela</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--nav-hover)]">
              <h3 className="font-bold text-[var(--text-main)]">{isEditing ? "Editar Usuário" : "Novo Usuário"}</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Nome Completo</label>
                <input required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  {isEditing ? "Nova Senha (deixe em branco para não alterar)" : "Senha Inicial"}
                </label>
                <input required={!isEditing} type="text" value={formData.senha} onChange={e => setFormData({ ...formData, senha: e.target.value })} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Nível de Permissão</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]">
                  <option value="ANOTADOR">Anotadora</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="pt-4 flex space-x-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-semibold text-[var(--text-main)] bg-white border border-[var(--border)] hover:bg-[var(--row-hover)] rounded-lg transition">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-[var(--accent)] text-white font-semibold rounded-lg hover:bg-[var(--accent-hover)] transition shadow-sm">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
