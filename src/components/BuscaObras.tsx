import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { getObras, getAssociadas, Obra, Associada, semAcento } from "../lib/base";

/**
 * Busca por obra: quem procura "coisa julgada" chega na lista de trabalhos
 * e, deles, nas autoras — o caminho inverso da consulta por pessoa.
 *
 * A bibliografia é o arquivo mais pesado da base (441 KB comprimidos), por
 * isso só é baixada quando esta aba é aberta, e não no carregamento do
 * site. Depois disso o filtro roda em memória, sem ida ao servidor.
 */

const POR_PAGINA = 20;

const AREAS = [
  "P. Civil", "P. Penal", "P. Trabalhista",
  "P. Tributario", "P. Constitucional", "P. Administrativo", "Outros",
];
const TIPOS = [
  "Artigo", "Capitulo de Livro", "Livro",
  "Coluna em Jornais e Sites", "Anais de Eventos", "Org. ou Coord.",
  // derivados da aba 1: a titulação também é obra
  "Dissertação de Mestrado", "Tese de Doutorado", "Tese de Livre-Docência",
];

/** destaca o trecho procurado dentro da citação, ignorando acento e caixa */
function Destacado({ texto, termo }: { texto: string; termo: string }) {
  const alvo = termo.trim();
  if (!alvo) return <>{texto}</>;

  const base = semAcento(texto);
  const busca = semAcento(alvo);
  // se a versão sem acento mudar de comprimento, os índices não batem com
  // o texto original e a marcação sairia deslocada
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
  const [obras, setObras] = useState<Obra[]>([]);
  const [autores, setAutores] = useState<Map<string, Associada>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [termo, setTermo] = useState("");
  const [termoAtivo, setTermoAtivo] = useState("");
  const [area, setArea] = useState("");
  const [tipo, setTipo] = useState("");
  const [ano, setAno] = useState("");
  const [pagina, setPagina] = useState(1);

  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getObras(), getAssociadas()])
      .then(([o, a]) => {
        setObras(o);
        setAutores(new Map(a.map((x) => [x.id, x])));
      })
      .catch(() => setErro("Não foi possível carregar a bibliografia."))
      .finally(() => setCarregando(false));
  }, []);

  /** texto já normalizado por obra, para não refazer a cada tecla */
  const indice = useMemo(
    () => obras.map((o) => semAcento(o.citacao)),
    [obras]
  );

  const achadas = useMemo(() => {
    const busca = semAcento(termoAtivo.trim());
    const res: Obra[] = [];
    for (let i = 0; i < obras.length; i++) {
      const o = obras[i];
      if (busca && !indice[i].includes(busca)) continue;
      if (area && o.area !== area) continue;
      if (tipo && o.tipo !== tipo) continue;
      if (ano && o.ano !== ano) continue;
      res.push(o);
    }
    // sem data por último; o ano é texto e "s/d" ordenaria antes de 2025
    return res.sort((a, b) => {
      const sa = /^\d{4}$/.test(a.ano) ? 0 : 1;
      const sb = /^\d{4}$/.test(b.ano) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      if (a.ano !== b.ano) return b.ano.localeCompare(a.ano);
      const na = autores.get(a.autorId)?.nome ?? "";
      const nb = autores.get(b.autorId)?.nome ?? "";
      return na.localeCompare(nb, "pt-BR");
    });
  }, [obras, indice, termoAtivo, area, tipo, ano, autores]);

  useEffect(() => { setPagina(1); }, [termoAtivo, area, tipo, ano]);

  const total = achadas.length;
  const paginas = Math.ceil(total / POR_PAGINA) || 1;
  const visiveis = achadas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setTermoAtivo(termo);
  };

  const limpar = () => {
    setTermo(""); setTermoAtivo(""); setArea(""); setTipo(""); setAno("");
  };

  const campoCls =
    "px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-main)]";

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando a bibliografia…
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-white rounded-xl border border-[var(--border)] py-16 text-center">
        <p className="text-[var(--error)]">{erro}</p>
      </div>
    );
  }

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
          <span className="font-semibold text-[var(--text-main)] tabular-nums">
            {total.toLocaleString("pt-BR")}
          </span>
          {total === 1 ? " obra encontrada" : " obras encontradas"}
          {termoAtivo && (
            <> para <span className="font-semibold text-[var(--text-main)]">“{termoAtivo}”</span></>
          )}
        </p>
        {total > POR_PAGINA && (
          <p className="text-[12px] text-[var(--text-muted)]">página {pagina} de {paginas}</p>
        )}
      </div>

      {visiveis.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--border)] py-16 text-center">
          <p className="text-[var(--text-muted)]">
            {termoAtivo || area || tipo || ano
              ? "Nenhuma obra encontrada com esses critérios."
              : "Digite um termo para buscar entre as obras mapeadas."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visiveis.map((o) => {
            const autor = autores.get(o.autorId);
            return (
              <li
                key={o.id}
                className="bg-white rounded-xl border border-[var(--border)] p-5 hover:border-[var(--heading)] transition-colors"
              >
                <p className="text-[14px] text-[var(--text-main)] leading-relaxed">
                  <Destacado texto={o.citacao} termo={termoAtivo} />
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px]">
                  {autor && (
                    <button
                      onClick={() => navigate(`/consulta/${autor.id}`)}
                      className="font-semibold text-[var(--accent)] hover:underline"
                    >
                      {autor.nome}
                    </button>
                  )}
                  {autor?.uf && <span className="text-[var(--text-muted)]">{autor.uf}</span>}
                  <span className="text-[var(--border)]">·</span>
                  <span className="text-[var(--text-muted)]">
                    {o.ano === "s/d" ? "sem data" : o.ano}
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded bg-[var(--nav-active)] text-[var(--accent)] font-medium">
                    {o.tipo}
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)]">
                    {o.area}
                  </span>
                  {o.link && (
                    <a
                      href={o.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--accent)] font-semibold hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> texto completo
                    </a>
                  )}
                </div>
              </li>
            );
          })}
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
              disabled={pagina === 1}
              onClick={() => setPagina(pagina - 1)}
              className="px-3 py-1.5 border border-[var(--border)] rounded-lg font-semibold text-[var(--text-muted)] hover:bg-[var(--row-hover)] disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={pagina >= paginas}
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
