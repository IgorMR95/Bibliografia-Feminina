import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  UploadCloud, AlertTriangle, CheckCircle2, RotateCcw,
  FileSpreadsheet, Loader2, History, ChevronRight,
} from "lucide-react";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-planilha`;
const PALAVRA_CONFIRMACAO = "SUBSTITUIR";

type Relatorio = {
  dry_run?: boolean;
  importacao_id?: string;
  antes?: { associadas: number; producoes: number; vinculos: number };
  depois?: { associadas: number; producoes: number; vinculos?: number };
  plano?: { atualizadas: number; inseridas: number; removidas: number; producoes_sem_dona: number };
  atualizadas?: number;
  inseridas?: number;
  removidas?: number;
  lista_removidas?: { nome: string; id: string }[];
  leitura?: {
    arquivo: string;
    abas: string[];
    linhas_aba1: number;
    linhas_aba2: number;
    linhas_bibliografia_descartadas: number;
    processualistas_validas: number;
    criadas_a_partir_da_bibliografia: number;
    producoes_lidas: number;
    avisos: { linha: number; erro: string; nome?: string }[];
  };
};

async function chamar(action: string, opts: { file?: File; body?: unknown; forcar?: boolean } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada. Entre novamente.");

  const headers: Record<string, string> = { Authorization: `Bearer ${session.access_token}` };
  let body: BodyInit | undefined;

  if (opts.file) {
    const fd = new FormData();
    fd.append("file", opts.file);
    if (opts.forcar) fd.append("confirmar_reducao", "true");
    body = fd; // sem Content-Type: o browser define o boundary
  } else if (opts.body) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${FN_URL}?action=${action}`, {
    method: action === "historico" ? "GET" : "POST",
    headers,
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Falha na operação (${res.status}).`);
  return json;
}

const Numero = ({ label, de, para }: { label: string; de?: number; para?: number }) => {
  const delta = (para ?? 0) - (de ?? 0);
  return (
    <div className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
      <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1 tracking-wider">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-[var(--text-muted)] line-through">{de ?? 0}</span>
        <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
        <span className="text-2xl font-serif text-[var(--accent)]">{para ?? 0}</span>
        {delta !== 0 && (
          <span className={`text-xs font-bold ${delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
            {delta > 0 ? "+" : ""}{delta}
          </span>
        )}
      </div>
    </div>
  );
};

export const ImportarBase = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previa, setPrevia] = useState<Relatorio | null>(null);
  const [resultado, setResultado] = useState<Relatorio | null>(null);
  const [carregando, setCarregando] = useState<"" | "previa" | "aplicar" | "reverter">("");
  const [erro, setErro] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [historico, setHistorico] = useState<any[]>([]);
  const [verRemovidas, setVerRemovidas] = useState(false);

  const carregarHistorico = async () => {
    try {
      const r = await chamar("historico");
      setHistorico(r.importacoes || []);
    } catch { /* histórico é acessório; silencioso */ }
  };

  useEffect(() => { carregarHistorico(); }, []);

  const escolher = (f: File | null) => {
    setFile(f);
    setPrevia(null);
    setResultado(null);
    setErro("");
    setConfirmacao("");
  };

  const analisar = async () => {
    if (!file) return;
    setCarregando("previa"); setErro(""); setResultado(null);
    try {
      setPrevia(await chamar("preview", { file }));
    } catch (e: any) {
      setErro(e.message);
      setPrevia(null);
    } finally { setCarregando(""); }
  };

  const aplicar = async () => {
    if (!file || confirmacao !== PALAVRA_CONFIRMACAO) return;
    setCarregando("aplicar"); setErro("");
    try {
      const r = await chamar("aplicar", { file, forcar: true });
      setResultado(r);
      setPrevia(null);
      setFile(null);
      setConfirmacao("");
      carregarHistorico();
    } catch (e: any) {
      setErro(e.message);
    } finally { setCarregando(""); }
  };

  const reverter = async (id: string, quando: string) => {
    if (!confirm(`Restaurar a base ao estado anterior à importação de ${new Date(quando).toLocaleString("pt-BR")}?\n\nTudo que foi feito depois será perdido.`)) return;
    setCarregando("reverter"); setErro("");
    try {
      const r = await chamar("reverter", { body: { id } });
      alert(`Base restaurada: ${r.restaurado.associadas} processualistas, ${r.restaurado.producoes} produções.`);
      setResultado(null);
      carregarHistorico();
    } catch (e: any) {
      setErro(e.message);
    } finally { setCarregando(""); }
  };

  const plano = previa?.plano;
  const podeAplicar = !!previa && confirmacao === PALAVRA_CONFIRMACAO && !carregando;

  return (
    <div className="space-y-6">
      {/* aviso */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-1">
          <p className="font-bold text-sm">Esta ação substitui a base inteira.</p>
          <p>
            A planilha enviada passa a ser a base: quem não estiver nela é <strong>removida</strong>, e
            as produções e vínculos docentes são <strong>integralmente refeitos</strong> a partir do arquivo.
          </p>
          <p>
            Antes de gravar, o sistema guarda uma cópia completa do estado atual — se algo sair errado,
            dá para reverter pelo histórico no fim desta página.
          </p>
        </div>
      </div>

      {/* upload */}
      <div className="bg-white p-8 rounded-xl border border-[var(--border)] shadow-sm">
        <h3 className="font-serif italic text-xl text-[var(--text-main)] mb-1 flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-[var(--accent)]" />
          Substituir a base por uma planilha
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-6">
          Formato esperado: <strong>aba 1</strong> com os dados das processualistas (coluna
          "Nome da Processualista" obrigatória) e <strong>aba 2</strong> com a bibliografia
          ("Nome da Processualista" e "Citação completa da Obra").
        </p>

        <label className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${file ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg)]"}`}>
          <input
            type="file"
            className="hidden"
            accept=".xlsx"
            onChange={(e) => escolher(e.target.files?.[0] || null)}
          />
          {file ? (
            <div className="text-center">
              <FileSpreadsheet className="w-10 h-10 mb-3 mx-auto text-[var(--accent)]" />
              <p className="font-bold text-[var(--text-main)]">{file.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          ) : (
            <div className="text-center">
              <UploadCloud className="w-10 h-10 mb-3 mx-auto text-[var(--text-muted)]" />
              <p className="font-bold text-[var(--text-main)]">Arraste ou clique para selecionar</p>
              <p className="text-xs text-[var(--text-muted)]">Somente .xlsx, até 15 MB</p>
            </div>
          )}
        </label>

        {file && !previa && (
          <button
            disabled={!!carregando}
            onClick={analisar}
            className="mt-6 w-full py-3 bg-[var(--accent)] text-white font-bold rounded-lg hover:bg-[var(--accent-hover)] transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {carregando === "previa" ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando planilha…</> : "Analisar (não grava nada)"}
          </button>
        )}
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {/* prévia */}
      {previa && plano && (
        <div className="bg-white p-6 rounded-xl border-2 border-[var(--accent)] shadow-md space-y-5">
          <h4 className="font-bold text-[var(--text-main)] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[var(--accent)]" />
            O que vai acontecer
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Numero label="Processualistas" de={previa.antes?.associadas} para={previa.depois?.associadas} />
            <Numero label="Produções" de={previa.antes?.producoes} para={previa.depois?.producoes} />
            <Numero label="Vínculos docentes" de={previa.antes?.vinculos} para={undefined} />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
              <div className="text-lg font-serif text-[var(--text-main)]">{plano.atualizadas}</div>
              <div className="text-[var(--text-muted)]">atualizadas</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="text-lg font-serif text-emerald-700">{plano.inseridas}</div>
              <div className="text-emerald-700">novas</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="text-lg font-serif text-red-700">{plano.removidas}</div>
              <div className="text-red-700">removidas</div>
            </div>
          </div>

          {previa.leitura && (
            <div className="text-xs text-[var(--text-muted)] bg-[var(--bg)] rounded-lg p-4 space-y-1 border border-[var(--border)]">
              <p>Abas lidas: <strong>{previa.leitura.abas.join(" · ")}</strong></p>
              <p>{previa.leitura.processualistas_validas} processualistas válidas na aba 1 · {previa.leitura.producoes_lidas} produções na aba 2</p>
              {previa.leitura.criadas_a_partir_da_bibliografia > 0 && (
                <p className="text-amber-700">
                  {previa.leitura.criadas_a_partir_da_bibliografia} pessoas aparecem só na bibliografia e serão
                  criadas com status INCOMPLETO, para não perder as obras.
                </p>
              )}
              {previa.leitura.linhas_bibliografia_descartadas > 0 && (
                <p>{previa.leitura.linhas_bibliografia_descartadas} linhas em branco da aba 2 foram ignoradas.</p>
              )}
              {previa.leitura.avisos?.length > 0 && (
                <div className="pt-2 text-amber-700">
                  <p className="font-bold">Avisos:</p>
                  <ul className="list-disc pl-4">
                    {previa.leitura.avisos.slice(0, 8).map((a, i) => (
                      <li key={i}>linha {a.linha}: {a.erro}{a.nome ? ` (${a.nome})` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {plano.removidas > 0 && (
            <div>
              <button
                onClick={() => setVerRemovidas(!verRemovidas)}
                className="text-xs font-bold text-red-700 hover:underline"
              >
                {verRemovidas ? "Ocultar" : "Ver"} as {plano.removidas} que serão removidas
              </button>
              {verRemovidas && (
                <div className="mt-2 max-h-52 overflow-y-auto border border-red-100 rounded-lg bg-red-50 p-3">
                  <ul className="text-xs text-red-900 space-y-0.5">
                    {previa.lista_removidas?.map((r) => <li key={r.id}>{r.nome}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-[var(--border)] pt-5">
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-2">
              Para confirmar, digite <span className="font-mono text-[var(--text-main)]">{PALAVRA_CONFIRMACAO}</span>:
            </label>
            <div className="flex gap-3">
              <input
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value.toUpperCase())}
                placeholder={PALAVRA_CONFIRMACAO}
                className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)] font-mono text-sm"
              />
              <button
                disabled={!podeAplicar}
                onClick={aplicar}
                className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {carregando === "aplicar" ? <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando…</> : "Substituir a base"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* resultado */}
      {resultado && (
        <div className="bg-white p-6 rounded-xl border-2 border-emerald-500 shadow-md space-y-4">
          <h4 className="font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Base substituída
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Numero label="Processualistas" de={resultado.antes?.associadas} para={resultado.depois?.associadas} />
            <Numero label="Produções" de={resultado.antes?.producoes} para={resultado.depois?.producoes} />
            <Numero label="Vínculos docentes" de={resultado.antes?.vinculos} para={resultado.depois?.vinculos} />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {resultado.atualizadas} atualizadas · {resultado.inseridas} novas · {resultado.removidas} removidas.
            Uma cópia do estado anterior ficou guardada no histórico abaixo.
          </p>
        </div>
      )}

      {/* histórico */}
      <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--accent)]" />
          <h4 className="font-bold text-sm text-[var(--text-main)]">Importações anteriores</h4>
        </div>
        {historico.length === 0 ? (
          <p className="p-6 text-xs text-[var(--text-muted)] italic">Nenhuma importação registrada ainda.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg)] border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <tr>
                <th className="px-6 py-3 font-semibold">Quando</th>
                <th className="px-4 py-3 font-semibold">Arquivo</th>
                <th className="px-4 py-3 font-semibold">Por</th>
                <th className="px-4 py-3 font-semibold">Resultado</th>
                <th className="px-6 py-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {historico.map((h) => (
                <tr key={h.id} className="hover:bg-[var(--row-hover)]">
                  <td className="px-6 py-3 whitespace-nowrap">{new Date(h.criado_em).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 max-w-[220px] truncate" title={h.arquivo_nome}>{h.arquivo_nome}</td>
                  <td className="px-4 py-3">{h.usuario_nome || "—"}</td>
                  <td className="px-4 py-3">
                    {h.status === "REVERTIDA" ? (
                      <span className="text-amber-700 font-semibold">revertida</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">
                        {h.relatorio?.depois?.associadas ?? "?"} processualistas · {h.relatorio?.depois?.producoes ?? "?"} produções
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {h.pode_reverter ? (
                      <button
                        disabled={!!carregando}
                        onClick={() => reverter(h.id, h.criado_em)}
                        className="inline-flex items-center gap-1 text-red-700 font-bold hover:underline disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" /> Reverter
                      </button>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
