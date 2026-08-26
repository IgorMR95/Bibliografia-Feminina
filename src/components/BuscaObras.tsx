import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Search, ExternalLink, Loader2 } from "lucide-react";

/**
 * Busca por obra: quem procura "coisa julgada" chega na lista de trabalhos
 * e, deles, nas autoras — o caminho inverso da consulta por pessoa.
 *
 * O filtro roda no banco (buscar_obras), sem acento e sem caixa, apoiado
 * num indice trigram: varrer as ~6.800 citacoes no navegador seria lento e
 * obrigaria a baixar tudo.
 */

const POR_PAGINA = 20;

const AREAS = [
  "P. Civil", "P. Penal", "P. Trabalhista",
  "P. Tributario", "P. Constitucional", "P. Administrativo", "Outros",
];
const TIPOS = [
  "Artigo", "Capitulo de Livro", "Livro",
  "Coluna em Jornais e Sites", "Anais de Eventos", "Org. ou Coord.",
];

type Obra = {
  id: string;
  citacao_completa: string;
  ano_publicacao: string;
  tipo_obra: string;
  area_processo: string;
  link_acesso: string | null;
  associada_id: string;
  associada_nome: string;
  uf_atuacao: string | null;
};

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** destaca o trecho procurado dentro da citacao, ignorando acento e caixa */
function Destacado({ texto, termo }: { texto: string; termo: string }) {
  const alvo = termo.trim();
  if (!alvo) return <>{texto}</>;

  const base = semAcento(texto);
  const busca = semAcento(alvo);
  // a remocao de diacriticos pode encurtar a string (ex: "ç" -> "c" mantem
  // 1 char, mas ligaduras nao); se os tamanhos divergirem, os indices nao
  // batem com o texto original e o destaque sairia deslocado
  if (!busca || base.length !== texto.length) return <>{texto}</>;

  const partes: React.ReactNode[] = [];
  let i = 0;
  let achou = base.indexOf(busca);
  let n = 0;

  while (achou !== -1) {
    partes.push(texto.slice(i, achou));
    partes.push(
      <mark key={n++} className="bg-[var(--nav-active)] text-[var(--accent)] font-semibold rounded px-0.5">
        {texto.slice(achou, achou + busca.length)}
      </mark>
    );
    i = achou + busca.length;
    achou = base.indexOf(busca, i);
  }
  partes.push(texto.slice(i));
  return <>{partes}</>;
}

export const BuscaObras = () => {
  const [termo, setTermo] = useState("");
  const [termoAtivo, setTermoAtivo] = useState("");
  const [area, setArea] = useState("");
  const [tipo, setTipo] = useState("");
  const [ano, setAno] = useState("");
  const [pagina, setPagina] = useState(1);

  const [obras, setObras] = useState<Obra[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const buscar = useCallback(async (p: number, t: string) => {
    setCarregando(true);
    try {
      const { data, error } = await supabase.rpc("buscar_obras", {
        p_termo: t || null,
        p_area: area || null,
        p_tipo: tipo || null,
        p_ano: ano || null,
        p_limite: POR_PAGINA,
        p_offset: (p - 1) * POR_PAGINA,
      });
      if (error) throw error;
      setObras((data?.obras ?? []) as Obra[]);
      setTotal(Number(data?.total ?? 0));
    } catch {
      setObras([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [area, tipo, ano]);

  // filtros aplicam na hora; o termo so no submit, para nao consultar a
  // cada tecla digitada
  useEffect(() => { setPagina(1); buscar(1, termoAtivo); }, [area, tipo, ano]);
  useEffect(() => { buscar(pagina, termoAtivo); }, [pagina]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setTermoAtivo(termo);
    setPagina(1);
    buscar(1, termo);
  };

  const limpar = () => {
    setTermo(""); setTermoAtivo(""); setArea(""); setTipo(""); setAno(""); setPagina(1);
  };

  const paginas = Math.ceil(total / POR_PAGINA) || 1;
  const campoCls =
    "px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-main)]";

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-xl border border-[var(--border)]">
        <form onSubmit={enviar} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Buscar no título ou na citação
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: coisa julgada, tutela provisória, execução…"
                className="w-full pl-10 pr-4 py-2 bg-white border border-[var(--border)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
              />
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
            </div>
          </div>

          <div className="w-44">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Área</label>
            <select value={area} onChange={(e) => setArea(e.target.value)} className={`w-full ${campoCls}`}>
              <option value="">Todas</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="w-52">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Tipo de obra</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`w-full ${campoCls}`}>
              <option value="">Todos</option>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="w-24">
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Ano</label>
            <input
              type="text" maxLength={4} placeholder="2024" value={ano}
              onChange={(e) => setAno(e.target.value.replace(/\D/g, ""))}
              className={`w-full ${campoCls}`}
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--accent-hover)] transition"
          >
            Buscar
          </button>

          {(termoAtivo || area || tipo || ano) && (
            <button
              type="button"
              onClick={limpar}
              className="px-3 py-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              Limpar
            </button>
          )}
        </form>
      </div>

      <div className="flex items-baseline justify-between px-1">
        <p className="text-[13px] text-[var(--text-muted)]">
          {carregando ? "Buscando…" : (
            <>
              <span className="font-semibold text-[var(--text-main)] tabular-nums">
                {total.toLocaleString("pt-BR")}
              </span>
              {total === 1 ? " obra encontrada" : " obras encontradas"}
              {termoAtivo && (
                <> para <span className="font-semibold text-[var(--text-main)]">“{termoAtivo}”</span></>
              )}
            </>
          )}
        </p>
        {total > POR_PAGINA && (
          <p className="text-[12px] text-[var(--text-muted)]">página {pagina} de {paginas}</p>
        )}
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Buscando…
        </div>
      ) : obras.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--border)] py-16 text-center">
          <p className="text-[var(--text-muted)]">
            {termoAtivo || area || tipo || ano
              ? "Nenhuma obra encontrada com esses critérios."
              : "Digite um termo para buscar entre as obras mapeadas."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {obras.map((o) => (
            <li
              key={o.id}
              className="bg-white rounded-xl border border-[var(--border)] p-5 hover:border-[var(--heading)] transition-colors"
            >
              <p className="text-[14px] text-[var(--text-main)] leading-relaxed">
                <Destacado texto={o.citacao_completa} termo={termoAtivo} />
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px]">
                <button
                  onClick={() => navigate(`/consulta/${o.associada_id}`)}
                  className="font-semibold text-[var(--accent)] hover:underline"
                >
                  {o.associada_nome}
                </button>
                {o.uf_atuacao && <span className="text-[var(--text-muted)]">{o.uf_atuacao}</span>}
                <span className="text-[var(--border)]">·</span>
                <span className="text-[var(--text-muted)]">
                  {o.ano_publicacao === "s/d" ? "sem data" : o.ano_publicacao}
                </span>
                <span className="inline-flex px-2 py-0.5 rounded bg-[var(--nav-active)] text-[var(--accent)] font-medium">
                  {o.tipo_obra}
                </span>
                <span className="inline-flex px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)]">
                  {o.area_processo}
                </span>
                {o.link_acesso && (
                  <a
                    href={o.link_acesso} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> acessar
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {paginas > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-[var(--border)] px-4 py-3 text-[13px]">
          <span className="text-[var(--text-muted)]">
            Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, total)} de{" "}
            {total.toLocaleString("pt-BR")}
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagina === 1 || carregando}
              onClick={() => setPagina(pagina - 1)}
              className="px-3 py-1.5 border border-[var(--border)] rounded-lg font-semibold text-[var(--text-muted)] hover:bg-[var(--row-hover)] disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={pagina >= paginas || carregando}
              onClick={() => setPagina(pagina + 1)}
              className="px-3 py-1.5 border border-[var(--border)] rounded-lg font-semibold text-[var(--text-muted)] hover:bg-[var(--row-hover)] disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
