import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  UploadCloud, AlertTriangle, CheckCircle2, RotateCcw, Download,
  FileSpreadsheet, Loader2, History, ChevronRight, Users, BookOpen,
} from "lucide-react";

/**
 * Alimentação da base por planilha.
 *
 * A regra, que a prévia repete em português antes de qualquer gravação:
 * a planilha manda nas pessoas que ela contém e é silenciosa sobre as
 * demais. Substituir a base inteira continua possível, mas virou uma
 * caixa que alguém precisa marcar de propósito — não é mais o padrão.
 *
 * Quem decide de fato é o banco (função `mesclar_base`); esta tela não
 * alcança tabela nenhuma direto. O caminho é a Edge Function, que valida
 * o JWT de ADMIN antes de usar a service_role.
 */

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-planilha`;
const PALAVRA_CONFIRMACAO = "REMOVER";

type Contagens = { associadas: number; producoes: number; vinculos?: number | null };

type Relatorio = {
  dry_run?: boolean;
  importacao_id?: string;
  remover_ausentes?: boolean;
  antes?: Contagens;
  depois?: Contagens;
  pessoas?: { atualizadas: number; inseridas: number; ausentes: number; removidas: number };
  bibliografia?: {
    pessoas_afetadas: number; obras_saindo: number; obras_entrando: number;
    sem_dona: number; teses_derivadas: number;
  };
  aplicado?: {
    atualizadas: number; inseridas: number; removidas: number;
    obras_da_planilha: number; teses_derivadas: number; vinculos: number;
  };
  lista_ausentes?: { nome: string; id: string }[];
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

async function chamar(
  action: string,
  opts: { file?: File; body?: unknown; forcar?: boolean; removerAusentes?: boolean } = {}
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada. Entre novamente.");

  const headers: Record<string, string> = { Authorization: `Bearer ${session.access_token}` };
  let body: BodyInit | undefined;

  if (opts.file) {
    const fd = new FormData();
    fd.append("file", opts.file);
    if (opts.forcar) fd.append("confirmar_reducao", "true");
    if (opts.removerAusentes) fd.append("remover_ausentes", "true");
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

const Numero = ({ label, de, para }: { label: string; de?: number | null; para?: number | null }) => {
  const delta = (para ?? 0) - (de ?? 0);
  return (
    <div className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
      <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1 tracking-wider">{label}</span>
      <div className="flex items-baseline gap-2 flex-wrap">
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

export const AlimentacaoEmLote = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previa, setPrevia] = useState<Relatorio | null>(null);
  const [resultado, setResultado] = useState<Relatorio | null>(null);
  const [carregando, setCarregando] = useState<"" | "previa" | "aplicar" | "reverter">("");
  const [erro, setErro] = useState("");
  const [removerAusentes, setRemoverAusentes] = useState(false);
  // o banco recusa uma planilha que encolha a base em mais de 50% com a
  // remoção marcada; quando é de propósito, é aqui que se diz isso
  const [reducaoGrande, setReducaoGrande] = useState(false);
  const [confirmouReducao, setConfirmouReducao] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [historico, setHistorico] = useState<any[]>([]);
  const [verAusentes, setVerAusentes] = useState(false);

  const carregarHistorico = async () => {
    try {
      const r = await chamar("historico");
      setHistorico(r.importacoes || []);
    } catch { /* histórico é acessório; silencioso */ }
  };

  useEffect(() => { carregarHistorico(); }, []);

  const limparAnalise = () => {
    setPrevia(null);
    setConfirmacao("");
    setReducaoGrande(false);
    setConfirmouReducao(false);
  };

  const escolher = (f: File | null) => {
    setFile(f);
    setResultado(null);
    setErro("");
    limparAnalise();
  };

  // mudar a opção invalida a prévia: ela foi calculada com a outra regra
  const alternarRemocao = (v: boolean) => {
    setRemoverAusentes(v);
    limparAnalise();
  };

  const analisar = async (forcarReducao = confirmouReducao) => {
    if (!file) return;
    setCarregando("previa"); setErro(""); setResultado(null);
    try {
      setPrevia(await chamar("preview", { file, removerAusentes, forcar: forcarReducao }));
      setReducaoGrande(false);
    } catch (e: any) {
      setErro(e.message);
      setPrevia(null);
      // não é erro de formato: é o guarda-corpo pedindo confirmação
      setReducaoGrande(/queda de mais de 50%/.test(e.message));
    } finally { setCarregando(""); }
  };

  const confirmarReducao = () => {
    setConfirmouReducao(true);
    analisar(true);
  };

  const aplicar = async () => {
    if (!file) return;
    if (removerAusentes && confirmacao !== PALAVRA_CONFIRMACAO) return;
    setCarregando("aplicar"); setErro("");
    try {
      const r = await chamar("aplicar", { file, removerAusentes, forcar: confirmouReducao });
      setResultado(r);
      setFile(null);
      limparAnalise();
      carregarHistorico();
    } catch (e: any) {
      setErro(e.message);
    } finally { setCarregando(""); }
  };

  const reverter = async (id: string, quando: string) => {
    if (!confirm(
      `Restaurar a base ao estado anterior à importação de ${new Date(quando).toLocaleString("pt-BR")}?\n\n` +
      `Tudo que foi feito depois será perdido.`
    )) return;
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

  const pessoas = previa?.pessoas;
  const biblio = previa?.bibliografia;
  const podeAplicar = !!previa && !carregando &&
    (!removerAusentes || confirmacao === PALAVRA_CONFIRMACAO);

  return (
    <div className="space-y-6">
      {/* a regra, antes de tudo */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5 space-y-2">
        <p className="font-bold text-sm text-[var(--text-main)]">
          A planilha manda nas pessoas que ela contém, e é silenciosa sobre as demais.
        </p>
        <ul className="text-xs text-[var(--text-muted)] space-y-1 list-disc pl-4 leading-relaxed">
          <li>Quem está na <strong>aba 1</strong> tem o cadastro atualizado pelo que a planilha diz.</li>
          <li>Quem está na <strong>aba 2</strong> tem a bibliografia substituída pela da planilha — por isso
            reenviar o mesmo arquivo duas vezes não duplica nada.</li>
          <li>Quem <strong>não aparece</strong> na planilha continua na base, intacta.</li>
          <li>Dissertações e teses <strong>não vão na aba 2</strong>: o sistema as deriva das colunas de
            titulação da aba 1 e as recria a cada importação.</li>
        </ul>
      </div>

      {/* modelo */}
      <div className="bg-white p-5 rounded-xl border border-[var(--border)] shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <div className="text-xs text-[var(--text-muted)]">
          <p className="font-bold text-sm text-[var(--text-main)] mb-1">Planilha no formato correto</p>
          <p>Duas abas, com os nomes de coluna que o sistema procura e uma linha de exemplo preenchida.</p>
        </div>
        <a
          href="/modelo-planilha-bpf.xlsx"
          download
          className="flex items-center gap-2 px-4 py-2 border border-[var(--accent)] text-[var(--accent)] text-sm font-semibold rounded-lg hover:bg-[var(--accent)] hover:text-white transition shrink-0"
        >
          <Download className="w-4 h-4" /> Baixar modelo (.xlsx)
        </a>
      </div>

      {/* upload */}
      <div className="bg-white p-8 rounded-xl border border-[var(--border)] shadow-sm">
        <h3 className="font-serif italic text-xl text-[var(--text-main)] mb-1 flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-[var(--accent)]" />
          Enviar planilha
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-6">
          A aba 1 precisa da coluna <strong>"Nome da Processualista"</strong>; a aba 2, de
          <strong> "Nome da Processualista"</strong> e <strong>"Citação completa da Obra"</strong>.
          É por esses nomes que a importação encontra os campos.
        </p>

        <label className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${file ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg)]"}`}>
          <input type="file" className="hidden" accept=".xlsx"
            onChange={(e) => escolher(e.target.files?.[0] || null)} />
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

        <label className="mt-5 flex items-start gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] cursor-pointer">
          <input type="checkbox" checked={removerAusentes} className="mt-0.5"
            onChange={(e) => alternarRemocao(e.target.checked)} />
          <span className="text-xs leading-relaxed">
            <strong className="text-[var(--text-main)]">Remover quem não está na planilha.</strong>
            <span className="text-[var(--text-muted)]">
              {" "}Marque só para trocar a base inteira por este arquivo. Quem ficou de fora é excluída,
              com as obras e os vínculos. A prévia mostra a lista antes de gravar.
            </span>
          </span>
        </label>

        {file && !previa && (
          <button disabled={!!carregando} onClick={() => analisar()}
            className="mt-6 w-full py-3 bg-[var(--accent)] text-white font-bold rounded-lg hover:bg-[var(--accent-hover)] transition disabled:opacity-60 flex items-center justify-center gap-2">
            {carregando === "previa"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando planilha…</>
              : "Analisar (não grava nada)"}
          </button>
        )}
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 space-y-3">
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
          {reducaoGrande && (
            <div className="border-t border-red-200 pt-3">
              <p className="text-xs mb-3">
                Isso costuma ser arquivo errado. Se a planilha está certa e a base deve mesmo
                encolher tanto, confirme para ver a prévia — ela ainda vai listar, nome a nome,
                quem sairia.
              </p>
              <button disabled={!!carregando} onClick={confirmarReducao}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50">
                É isso mesmo, quero ver a prévia
              </button>
            </div>
          )}
        </div>
      )}

      {/* prévia */}
      {previa && pessoas && biblio && (
        <div className="bg-white p-6 rounded-xl border-2 border-[var(--accent)] shadow-md space-y-5">
          <h4 className="font-bold text-[var(--text-main)] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[var(--accent)]" />
            O que vai acontecer
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Numero label="Processualistas" de={previa.antes?.associadas} para={previa.depois?.associadas} />
            <Numero label="Obras" de={previa.antes?.producoes} para={previa.depois?.producoes} />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Cadastro
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                <div className="text-lg font-serif text-[var(--text-main)]">{pessoas.atualizadas}</div>
                <div className="text-[var(--text-muted)]">atualizadas</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="text-lg font-serif text-emerald-700">{pessoas.inseridas}</div>
                <div className="text-emerald-700">novas</div>
              </div>
              <div className="p-3 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                <div className="text-lg font-serif text-[var(--text-main)]">{pessoas.ausentes}</div>
                <div className="text-[var(--text-muted)]">fora da planilha</div>
              </div>
              <div className={`p-3 rounded-lg border ${pessoas.removidas > 0 ? "bg-red-50 border-red-100" : "bg-[var(--bg)] border-[var(--border)]"}`}>
                <div className={`text-lg font-serif ${pessoas.removidas > 0 ? "text-red-700" : "text-[var(--text-muted)]"}`}>
                  {pessoas.removidas}
                </div>
                <div className={pessoas.removidas > 0 ? "text-red-700" : "text-[var(--text-muted)]"}>removidas</div>
              </div>
            </div>
            {pessoas.ausentes > 0 && pessoas.removidas === 0 && (
              <p className="text-[11px] text-[var(--text-muted)] mt-2">
                As {pessoas.ausentes} que ficaram fora da planilha <strong>continuam na base</strong>.
              </p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" /> Bibliografia
            </p>
            <div className="text-xs text-[var(--text-muted)] bg-[var(--bg)] rounded-lg p-4 space-y-1 border border-[var(--border)]">
              <p>
                A planilha reescreve a bibliografia de <strong>{biblio.pessoas_afetadas}</strong> pessoas:
                saem <strong>{biblio.obras_saindo}</strong> obras, entram <strong>{biblio.obras_entrando}</strong>.
              </p>
              <p>
                Mais <strong>{biblio.teses_derivadas}</strong> dissertações e teses derivadas da titulação
                da aba 1, recriadas ao final.
              </p>
              {biblio.sem_dona > 0 && (
                <p className="text-amber-700">
                  {biblio.sem_dona} linhas da aba 2 citam um nome que não existe na aba 1 e serão ignoradas.
                </p>
              )}
            </div>
          </div>

          {previa.leitura && (
            <div className="text-xs text-[var(--text-muted)] bg-[var(--bg)] rounded-lg p-4 space-y-1 border border-[var(--border)]">
              <p>Abas lidas: <strong>{previa.leitura.abas.join(" · ")}</strong></p>
              <p>
                {previa.leitura.processualistas_validas} processualistas válidas na aba 1 ·{" "}
                {previa.leitura.producoes_lidas} produções na aba 2
              </p>
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

          {pessoas.ausentes > 0 && (
            <div>
              <button onClick={() => setVerAusentes(!verAusentes)}
                className={`text-xs font-bold hover:underline ${pessoas.removidas > 0 ? "text-red-700" : "text-[var(--accent)]"}`}>
                {verAusentes ? "Ocultar" : "Ver"} as {pessoas.ausentes} que estão na base e não na planilha
              </button>
              {verAusentes && (
                <div className={`mt-2 max-h-52 overflow-y-auto border rounded-lg p-3 ${pessoas.removidas > 0 ? "border-red-100 bg-red-50" : "border-[var(--border)] bg-[var(--bg)]"}`}>
                  <ul className={`text-xs space-y-0.5 ${pessoas.removidas > 0 ? "text-red-900" : "text-[var(--text-main)]"}`}>
                    {previa.lista_ausentes?.map((r) => <li key={r.id}>{r.nome}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-[var(--border)] pt-5">
            {removerAusentes ? (
              <>
                <label className="block text-xs font-bold text-red-700 mb-2">
                  Esta importação <strong>exclui {pessoas.removidas} processualistas</strong>. Para confirmar,
                  digite <span className="font-mono">{PALAVRA_CONFIRMACAO}</span>:
                </label>
                <div className="flex gap-3 flex-wrap">
                  <input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value.toUpperCase())}
                    placeholder={PALAVRA_CONFIRMACAO}
                    className="flex-1 min-w-[140px] px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-red-500 font-mono text-sm" />
                  <button disabled={!podeAplicar} onClick={aplicar}
                    className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                    {carregando === "aplicar"
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando…</>
                      : "Substituir a base"}
                  </button>
                </div>
              </>
            ) : (
              <button disabled={!podeAplicar} onClick={aplicar}
                className="w-full py-3 bg-[var(--accent)] text-white font-bold rounded-lg hover:bg-[var(--accent-hover)] transition disabled:opacity-40 flex items-center justify-center gap-2">
                {carregando === "aplicar"
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando…</>
                  : "Aplicar na base"}
              </button>
            )}
            <p className="text-[11px] text-[var(--text-muted)] mt-3">
              Antes de gravar, o sistema guarda uma cópia completa do estado atual. Se algo sair errado,
              dá para reverter pelo histórico no fim desta página.
            </p>
          </div>
        </div>
      )}

      {/* resultado */}
      {resultado?.aplicado && (
        <div className="bg-white p-6 rounded-xl border-2 border-emerald-500 shadow-md space-y-4">
          <h4 className="font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Base alimentada
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Numero label="Processualistas" de={resultado.antes?.associadas} para={resultado.depois?.associadas} />
            <Numero label="Obras" de={resultado.antes?.producoes} para={resultado.depois?.producoes} />
            <Numero label="Vínculos docentes" de={resultado.antes?.vinculos} para={resultado.depois?.vinculos} />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {resultado.aplicado.atualizadas} atualizadas · {resultado.aplicado.inseridas} novas ·{" "}
            {resultado.aplicado.removidas} removidas · {resultado.aplicado.obras_da_planilha} obras da planilha ·{" "}
            {resultado.aplicado.teses_derivadas} dissertações e teses derivadas da titulação.
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
          <div className="overflow-x-auto">
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
                          {h.relatorio?.depois?.associadas ?? "?"} processualistas ·{" "}
                          {h.relatorio?.depois?.producoes ?? "?"} obras
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {h.pode_reverter ? (
                        <button disabled={!!carregando} onClick={() => reverter(h.id, h.criado_em)}
                          className="inline-flex items-center gap-1 text-red-700 font-bold hover:underline disabled:opacity-50">
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
          </div>
        )}
      </div>
    </div>
  );
};
