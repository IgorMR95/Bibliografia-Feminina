import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download } from "lucide-react";
import * as xlsx from "xlsx";
import { getAssociadas, Associada, semAcento } from "../lib/base";
import { BuscaObras } from "../components/BuscaObras";

const POR_PAGINA = 15;

/**
 * Consulta de pessoas sobre a base estática.
 *
 * A lista inteira são 66 KB comprimidos, então filtrar e paginar no
 * navegador sai mais rápido do que ir ao servidor a cada tecla — e o site
 * público deixa de depender do banco.
 */
const BuscaPessoas = () => {
  const [todas, setTodas] = useState<Associada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [uf, setUf] = useState("");
  const [ibdp, setIbdp] = useState("");
  const [abep, setAbep] = useState("");
  const [docente, setDocente] = useState("");
  const [ranking, setRanking] = useState("");
  const [formacao, setFormacao] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    getAssociadas()
      .then(setTodas)
      .catch(() => setErro("Não foi possível carregar a base."))
      .finally(() => setCarregando(false));
  }, []);

  const filtradas = useMemo(() => {
    const termo = semAcento(busca.trim());
    return todas.filter((a) => {
      if (termo) {
        const alvo = semAcento(`${a.nome} ${a.email ?? ""} ${a.instituicao ?? ""}`);
        if (!alvo.includes(termo)) return false;
      }
      if (uf && (a.uf ?? "").toUpperCase() !== uf.toUpperCase()) return false;
      if (ibdp !== "" && a.ibdp !== (ibdp === "true")) return false;
      if (abep !== "" && a.abep !== (abep === "true")) return false;
      if (docente !== "" && a.leciona !== (docente === "true")) return false;
      if (ranking !== "" && a.ranking40 !== (ranking === "true")) return false;
      if (formacao === "doutora" && !a.doutora) return false;
      if (formacao === "mestre" && !a.mestre) return false;
      if (formacao === "especialista" && !a.especialista) return false;
      if (formacao === "livre_docente" && !a.livreDocente) return false;
      return true;
    });
  }, [todas, busca, uf, ibdp, abep, docente, ranking, formacao]);

  // qualquer mudança de critério volta para a primeira página
  useEffect(() => { setPagina(1); }, [busca, uf, ibdp, abep, docente, ranking, formacao]);

  const paginas = Math.ceil(filtradas.length / POR_PAGINA) || 1;
  const visiveis = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const exportar = (formato: "csv" | "xlsx") => {
    if (filtradas.length === 0) { alert("Nenhum dado para exportar"); return; }
    const linhas = filtradas.map((a) => ({
      Nome: a.nome,
      Email: a.email ?? "",
      UF: a.uf ?? "",
      "Atuação": a.atuacao ?? "",
      IBDP: a.ibdp ? "Sim" : "Não",
      ABEP: a.abep ? "Sim" : "Não",
      Leciona: a.leciona ? "Sim" : "Não",
      "Instituição": a.instituicao ?? "",
      "Ranking 40+": a.ranking40 ? "Sim" : "Não",
      Especialista: a.especialista ? "Sim" : "Não",
      Mestre: a.mestre ? "Sim" : "Não",
      "Título do Mestrado": a.mestrado?.titulo ?? "",
      Doutora: a.doutora ? "Sim" : "Não",
      "Título do Doutorado": a.doutorado?.titulo ?? "",
      "Livre-Docente": a.livreDocente ? "Sim" : "Não",
      Lattes: a.lattes ?? "",
    }));

    const ws = xlsx.utils.json_to_sheet(linhas);
    if (formato === "csv") {
      const csv = xlsx.utils.sheet_to_csv(ws);
      // BOM: sem ele o Excel abre os acentos errados
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "processualistas.csv";
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Processualistas");
      xlsx.writeFile(wb, "processualistas.xlsx");
    }
  };

  const selo = (v: boolean) =>
    v ? "bg-[var(--success-bg)] text-[var(--success)] border-transparent"
      : "bg-white text-[var(--text-muted)] border-[var(--border)]";

  const campoCls =
    "w-full px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none";

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-xl border border-[var(--border)]">
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Busca</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nome, e-mail, instituição…"
                className={`${campoCls} pl-10`}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
            </div>
          </div>

          <div className="w-20">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">UF</label>
            <input type="text" placeholder="SP" maxLength={2} className={`${campoCls} uppercase`}
              value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
          </div>

          <div className="w-28">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">IBDP</label>
            <select value={ibdp} onChange={(e) => setIbdp(e.target.value)} className={campoCls}>
              <option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option>
            </select>
          </div>

          <div className="w-28">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">ABEP</label>
            <select value={abep} onChange={(e) => setAbep(e.target.value)} className={campoCls}>
              <option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option>
            </select>
          </div>

          <div className="w-32">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Docente</label>
            <select value={docente} onChange={(e) => setDocente(e.target.value)} className={campoCls}>
              <option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option>
            </select>
          </div>

          <div className="w-32">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Ranking 40+</label>
            <select value={ranking} onChange={(e) => setRanking(e.target.value)} className={campoCls}>
              <option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option>
            </select>
          </div>

          <div className="w-40">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Titulação</label>
            <select value={formacao} onChange={(e) => setFormacao(e.target.value)} className={campoCls}>
              <option value="">Todas</option>
              <option value="doutora">Doutora</option>
              <option value="mestre">Mestre</option>
              <option value="especialista">Especialista</option>
              <option value="livre_docente">Livre-Docente</option>
            </select>
          </div>

          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => exportar("csv")}
              className="flex items-center px-3.5 py-2 bg-white border border-[var(--border)] text-[var(--text-main)] text-sm font-semibold rounded-lg hover:bg-[var(--row-hover)] transition">
              <Download className="w-4 h-4 mr-2 text-[var(--text-muted)]" /> CSV
            </button>
            <button type="button" onClick={() => exportar("xlsx")}
              className="flex items-center px-3.5 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--accent-hover)] transition">
              <Download className="w-4 h-4 mr-2" /> Excel
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[var(--bg)] text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-3 font-semibold">Nome</th>
                <th className="px-4 py-3 font-semibold">Atuação</th>
                <th className="px-4 py-3 font-semibold text-center">UF</th>
                <th className="px-4 py-3 font-semibold text-center">IBDP</th>
                <th className="px-4 py-3 font-semibold text-center">ABEP</th>
                <th className="px-4 py-3 font-semibold">Titulação</th>
                <th className="px-6 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {carregando ? (
                <tr><td colSpan={7} className="text-center py-10 text-[var(--text-muted)]">Carregando…</td></tr>
              ) : erro ? (
                <tr><td colSpan={7} className="text-center py-10 text-[var(--error)]">{erro}</td></tr>
              ) : visiveis.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-[var(--text-muted)]">Nenhum registro encontrado.</td></tr>
              ) : (
                visiveis.map((a) => (
                  <tr key={a.id} className="hover:bg-[var(--row-hover)] transition-colors">
                    <td className="px-6 py-4 font-semibold text-[var(--text-main)]">
                      {a.nome}
                      {a.incompleto && (
                        <span className="ml-2 px-1.5 py-0.5 text-[9px] rounded bg-[var(--warning-bg)] text-[var(--warning)] font-bold uppercase">
                          incompleto
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[var(--text-muted)]">{a.atuacao ?? "—"}</td>
                    <td className="px-4 py-4 text-center text-[var(--text-muted)]">{a.uf ?? "—"}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] rounded border font-bold uppercase ${selo(a.ibdp)}`}>
                        {a.ibdp ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] rounded border font-bold uppercase ${selo(a.abep)}`}>
                        {a.abep ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[var(--text-muted)]">
                      {[a.livreDocente && "Livre-doc.", a.doutora && "Doutora", a.mestre && "Mestre", a.especialista && "Espec."]
                        .filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/consulta/${a.id}`)}
                        className="px-3 py-1.5 text-xs font-semibold text-[var(--accent)] border border-[var(--accent)] rounded-lg hover:bg-[var(--accent)] hover:text-white transition"
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div>
            {filtradas.length.toLocaleString("pt-BR")} {filtradas.length === 1 ? "registro" : "registros"}
            {filtradas.length !== todas.length && ` (de ${todas.length.toLocaleString("pt-BR")})`}
            {" · "}página <span className="font-semibold text-[var(--text-main)]">{pagina}</span> de {paginas}
          </div>
          <div className="flex gap-1">
            <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}
              className="px-3 py-1 bg-white border border-[var(--border)] rounded hover:bg-[var(--row-hover)] disabled:opacity-40">
              Anterior
            </button>
            <button disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}
              className="px-3 py-1 bg-white border border-[var(--border)] rounded hover:bg-[var(--row-hover)] disabled:opacity-40">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * A consulta tem duas entradas: por pessoa (quem são as processualistas) e
 * por obra (o que foi escrito sobre um assunto). A segunda é o caminho de
 * quem procura bibliografia sobre um tema e só depois chega nas autoras.
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
