import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Markdown } from "../lib/markdown";
import { iniciais, Membro, Pagina } from "../lib/conteudo";
import {
  Save, Eye, PencilLine, FileText, Users, Plus, Trash2,
  Upload, Loader2, CheckCircle2, AlertTriangle, RotateCcw,
} from "lucide-react";

const AJUDA = [
  ["## Título", "abre uma seção"],
  ["### Subtítulo", "título menor dentro da seção"],
  ["**negrito**", "destaque"],
  ["*itálico*", "ênfase"],
  ["- item", "lista (uma linha por item)"],
  ["[texto](https://…)", "link"],
];

/* ------------------------------------------------------------------ */
/* textos das páginas                                                  */
/* ------------------------------------------------------------------ */

const EditorPaginas = () => {
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [slug, setSlug] = useState<string>("");
  const [rascunho, setRascunho] = useState<Pagina | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const [verPrevia, setVerPrevia] = useState(true);

  const carregar = async () => {
    const { data } = await supabase.from("paginas").select("*").order("ordem");
    const lista = (data ?? []) as Pagina[];
    setPaginas(lista);
    if (!slug && lista.length) { setSlug(lista[0].slug); setRascunho({ ...lista[0] }); }
  };

  useEffect(() => { carregar(); }, []);

  const trocar = (s: string) => {
    const p = paginas.find((x) => x.slug === s);
    setSlug(s);
    setRascunho(p ? { ...p } : null);
    setAviso(""); setErro("");
  };

  const original = paginas.find((p) => p.slug === slug);
  const sujo =
    !!rascunho && !!original &&
    (rascunho.titulo !== original.titulo ||
      (rascunho.subtitulo ?? "") !== (original.subtitulo ?? "") ||
      rascunho.conteudo !== original.conteudo);

  const salvar = async () => {
    if (!rascunho) return;
    setSalvando(true); setErro(""); setAviso("");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("paginas")
      .update({
        titulo: rascunho.titulo,
        subtitulo: rascunho.subtitulo,
        conteudo: rascunho.conteudo,
        atualizado_por: user?.id ?? null,
      })
      .eq("slug", rascunho.slug);

    if (error) setErro(error.message);
    else { setAviso("Alterações publicadas no site."); await carregar(); }
    setSalvando(false);
  };

  const descartar = () => { if (original) { setRascunho({ ...original }); setAviso(""); setErro(""); } };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {paginas.map((p) => (
          <button
            key={p.slug}
            onClick={() => trocar(p.slug)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
              slug === p.slug
                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                : "bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent)]"
            }`}
          >
            {p.titulo}
          </button>
        ))}
      </div>

      {rascunho && (
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Título da página</label>
              <input
                value={rascunho.titulo}
                onChange={(e) => setRascunho({ ...rascunho, titulo: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Linha de apoio (subtítulo)</label>
              <input
                value={rascunho.subtitulo ?? ""}
                onChange={(e) => setRascunho({ ...rascunho, subtitulo: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--text-muted)]">Texto da página</label>
            <button
              onClick={() => setVerPrevia(!verPrevia)}
              className="text-xs font-bold text-[var(--accent)] inline-flex items-center gap-1 hover:underline"
            >
              {verPrevia ? <><PencilLine className="w-3 h-3" /> Só edição</> : <><Eye className="w-3 h-3" /> Ver prévia</>}
            </button>
          </div>

          <div className={`grid gap-4 ${verPrevia ? "lg:grid-cols-2" : "grid-cols-1"}`}>
            <textarea
              value={rascunho.conteudo}
              onChange={(e) => setRascunho({ ...rascunho, conteudo: e.target.value })}
              spellCheck
              className="w-full h-[28rem] px-4 py-3 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)] font-mono text-[13px] leading-relaxed resize-y"
            />
            {verPrevia && (
              <div className="h-[28rem] overflow-y-auto border border-[var(--border)] rounded-lg p-5 bg-[var(--bg)]">
                <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest mb-4">
                  Como vai aparecer no site
                </p>
                <Markdown texto={rascunho.conteudo} />
              </div>
            )}
          </div>

          <details className="text-xs text-[var(--text-muted)]">
            <summary className="cursor-pointer font-bold">Como formatar o texto</summary>
            <table className="mt-3 w-full max-w-md">
              <tbody>
                {AJUDA.map(([sintaxe, oque]) => (
                  <tr key={sintaxe}>
                    <td className="py-1 pr-4 font-mono text-[var(--text-main)] whitespace-nowrap">{sintaxe}</td>
                    <td className="py-1">{oque}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3">Uma linha em branco separa parágrafos.</p>
          </details>

          {erro && (
            <p className="text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {erro}
            </p>
          )}
          {aviso && (
            <p className="text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {aviso}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
            <span className="text-xs text-[var(--text-muted)]">
              {sujo ? "Há alterações não publicadas." : "Tudo publicado."}
            </span>
            <div className="flex gap-3">
              <button
                onClick={descartar}
                disabled={!sujo || salvando}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--row-hover)] disabled:opacity-40 inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Descartar
              </button>
              <button
                onClick={salvar}
                disabled={!sujo || salvando}
                className="px-6 py-2 bg-[var(--accent)] text-white font-bold rounded-lg hover:bg-[var(--accent-hover)] transition disabled:opacity-40 inline-flex items-center gap-2"
              >
                {salvando ? <><Loader2 className="w-4 h-4 animate-spin" /> Publicando…</> : <><Save className="w-4 h-4" /> Publicar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* equipe                                                              */
/* ------------------------------------------------------------------ */

const VAZIO = { nome: "", funcao: "", grupo: "Integrantes", bio: "", lattes_url: "", ordem: 99 };

const EditorMembros = () => {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [editando, setEditando] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = async () => {
    const [{ data: m }, { data: g }] = await Promise.all([
      supabase.from("membros").select("*").order("grupo").order("ordem").order("nome"),
      supabase.from("grupos_membros").select("nome").order("ordem"),
    ]);
    setMembros((m ?? []) as Membro[]);
    setGrupos((g ?? []).map((x: any) => x.nome));
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    if (!editando?.nome?.trim()) return setErro("O nome é obrigatório.");
    setSalvando(true); setErro("");
    const payload = {
      nome: editando.nome.trim(),
      funcao: editando.funcao?.trim() || null,
      grupo: editando.grupo,
      bio: editando.bio?.trim() || null,
      lattes_url: editando.lattes_url?.trim() || null,
      foto_url: editando.foto_url || null,
      ordem: Number(editando.ordem) || 0,
    };
    const { error } = editando.id
      ? await supabase.from("membros").update(payload).eq("id", editando.id)
      : await supabase.from("membros").insert(payload);

    if (error) setErro(error.message);
    else { setEditando(null); await carregar(); }
    setSalvando(false);
  };

  const remover = async (m: Membro) => {
    if (!confirm(`Remover ${m.nome} da equipe?`)) return;
    await supabase.from("membros").delete().eq("id", m.id);
    carregar();
  };

  const enviarFoto = async (file: File) => {
    if (!file.type.startsWith("image/")) return setErro("Selecione um arquivo de imagem.");
    if (file.size > 5 * 1024 * 1024) return setErro("Imagem acima de 5 MB.");
    setSubindo(true); setErro("");

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const slug = (editando.nome || "membro")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const caminho = `${slug}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("membros").upload(caminho, file, { upsert: true });
    if (error) setErro(error.message);
    else {
      const { data } = supabase.storage.from("membros").getPublicUrl(caminho);
      setEditando({ ...editando, foto_url: data.publicUrl });
    }
    setSubindo(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          {membros.length} pessoas · aparecem na página <strong>Quem Somos</strong>
        </p>
        <button
          onClick={() => setEditando({ ...VAZIO })}
          className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--accent-hover)] inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Adicionar pessoa
        </button>
      </div>

      {editando && (
        <div className="bg-white rounded-xl border-2 border-[var(--accent)] shadow-md p-6 space-y-4">
          <h4 className="font-bold text-[var(--text-main)]">
            {editando.id ? "Editar pessoa" : "Nova pessoa"}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Nome *</label>
              <input
                value={editando.nome}
                onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Função / vínculo</label>
              <input
                value={editando.funcao ?? ""}
                placeholder="Pesquisadora, FD-USP"
                onChange={(e) => setEditando({ ...editando, funcao: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Grupo</label>
              <select
                value={editando.grupo}
                onChange={(e) => setEditando({ ...editando, grupo: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)] bg-white"
              >
                {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Ordem no grupo</label>
              <input
                type="number"
                value={editando.ordem}
                onChange={(e) => setEditando({ ...editando, ordem: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Link do Lattes</label>
              <input
                value={editando.lattes_url ?? ""}
                placeholder="http://lattes.cnpq.br/…"
                onChange={(e) => setEditando({ ...editando, lattes_url: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Mini-biografia (opcional)</label>
              <textarea
                value={editando.bio ?? ""}
                onChange={(e) => setEditando({ ...editando, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 border-t border-[var(--border)] pt-4">
            <div className="w-16 h-20 rounded-lg bg-[var(--sidebar)] overflow-hidden shrink-0 flex items-center justify-center">
              {editando.foto_url ? (
                <img src={editando.foto_url} alt="" className="w-full h-full object-cover object-top" />
              ) : (
                <span className="text-[var(--accent)] font-serif italic">
                  {editando.nome ? iniciais(editando.nome) : "—"}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <label className="px-4 py-2 border border-[var(--border)] rounded-lg text-xs font-bold cursor-pointer hover:bg-[var(--row-hover)] inline-flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarFoto(f); }}
                />
                {subindo ? <><Loader2 className="w-3 h-3 animate-spin" /> Enviando…</> : <><Upload className="w-3 h-3" /> Enviar foto</>}
              </label>
              {editando.foto_url && (
                <button
                  onClick={() => setEditando({ ...editando, foto_url: null })}
                  className="block text-[11px] text-red-600 hover:underline"
                >
                  remover foto
                </button>
              )}
              <p className="text-[11px] text-[var(--text-muted)]">
                Sem foto, aparecem as iniciais. Ideal: retrato, até 5 MB.
              </p>
            </div>
          </div>

          {erro && <p className="text-sm text-red-700">{erro}</p>}

          <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
            <button
              onClick={() => { setEditando(null); setErro(""); }}
              className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--row-hover)]"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="px-6 py-2 bg-[var(--accent)] text-white font-bold rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 inline-flex items-center gap-2"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--bg)] border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Pessoa</th>
              <th className="px-4 py-3 font-semibold">Grupo</th>
              <th className="px-4 py-3 font-semibold">Ordem</th>
              <th className="px-4 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {membros.map((m) => (
              <tr key={m.id} className="hover:bg-[var(--row-hover)]">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--nav-active)] overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-bold text-[var(--accent)]">
                      {m.foto_url
                        ? <img src={m.foto_url} alt="" className="w-full h-full object-cover object-top" />
                        : iniciais(m.nome)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text-main)] truncate">{m.nome}</p>
                      {m.funcao && <p className="text-[var(--text-muted)] truncate">{m.funcao}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-[var(--text-muted)] whitespace-nowrap">{m.grupo}</td>
                <td className="px-4 py-2 text-[var(--text-muted)] tabular-nums">{m.ordem}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setEditando({ ...m })} className="text-[var(--accent)] font-bold hover:underline mr-4">
                    Editar
                  </button>
                  <button onClick={() => remover(m)} className="text-red-600 hover:text-red-800">
                    <Trash2 className="w-3 h-3 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const EditorConteudo = () => {
  const [aba, setAba] = useState<"textos" | "equipe">("textos");

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 text-xs text-[var(--text-muted)]">
        O que você publicar aqui fica <strong>salvo na hora</strong>, mas o site público lê os
        textos de um arquivo gerado a cada atualização da base — então a alteração só aparece
        para os visitantes na próxima vez que os dados forem regerados e enviados ao repositório.
      </div>

      <div className="flex gap-2">
        {([["textos", "Textos das páginas", FileText], ["equipe", "Equipe", Users]] as const).map(
          ([id, rotulo, Icone]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border inline-flex items-center gap-2 transition ${
                aba === id
                  ? "bg-white text-[var(--accent)] border-[var(--accent)]"
                  : "bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent)]"
              }`}
            >
              <Icone className="w-4 h-4" /> {rotulo}
            </button>
          )
        )}
      </div>

      {aba === "textos" ? <EditorPaginas /> : <EditorMembros />}
    </div>
  );
};
