import { Users, GraduationCap } from "lucide-react";
import { usePagina, useMembros, iniciais, Membro } from "../lib/conteudo";
import { Markdown } from "../lib/markdown";

/** cartao grande, para quem tem foto (coordenacao e organizacao) */
const CartaoFoto = ({ m }: { m: Membro }) => (
  <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col group hover:border-[var(--accent)] transition-colors">
    <div className="aspect-[4/5] w-full bg-[var(--sidebar)] overflow-hidden">
      {m.foto_url ? (
        <img
          src={m.foto_url}
          alt={m.nome}
          loading="lazy"
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl font-serif italic text-[var(--accent)]">
          {iniciais(m.nome)}
        </div>
      )}
    </div>
    <div className="p-5 text-center flex-1 flex flex-col">
      <h3 className="font-bold text-[var(--text-main)] leading-snug">{m.nome}</h3>
      {m.funcao && (
        <p className="text-[11px] uppercase font-bold text-[var(--accent)] tracking-wider mt-2 leading-relaxed">
          {m.funcao}
        </p>
      )}
      {m.bio && <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-3">{m.bio}</p>}
      {m.lattes_url && (
        <a
          href={m.lattes_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto pt-4 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors inline-flex items-center justify-center text-xs font-bold uppercase tracking-wider"
        >
          <GraduationCap className="w-4 h-4 mr-2" />
          Ver Lattes
        </a>
      )}
    </div>
  </div>
);

/** chip compacto, para os grupos numerosos sem foto */
const Chip = ({ m }: { m: Membro }) => (
  <div className="flex items-center gap-3 bg-white rounded-xl border border-[var(--border)] px-4 py-3 hover:border-[var(--accent)] transition-colors">
    <div className="w-9 h-9 shrink-0 rounded-full bg-[var(--nav-active)] flex items-center justify-center text-[var(--accent)] font-bold text-xs">
      {iniciais(m.nome)}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium text-[var(--text-main)] truncate">{m.nome}</p>
      {m.funcao && <p className="text-[11px] text-[var(--text-muted)] truncate">{m.funcao}</p>}
    </div>
  </div>
);

export const QuemSomos = () => {
  const { pagina, carregando } = usePagina("quem-somos");
  const { grupos, carregando: carregandoMembros } = useMembros();

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 fade-in">
      <div className="text-center py-10">
        <Users className="w-10 h-10 text-[var(--accent)] mx-auto mb-6" />
        <h1 className="text-4xl font-serif italic text-[var(--text-main)] mb-4">
          {pagina?.titulo ?? "Quem Somos"}
        </h1>
        {pagina?.subtitulo && (
          <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">{pagina.subtitulo}</p>
        )}
      </div>

      {!carregando && pagina?.conteudo && (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[var(--border)] shadow-sm p-8 md:p-10">
          <Markdown texto={pagina.conteudo} />
        </div>
      )}

      {carregandoMembros ? (
        <p className="text-center text-[var(--text-muted)] py-10">Carregando equipe…</p>
      ) : (
        grupos.map((g) => {
          const comFoto = g.membros.some((m) => m.foto_url);
          return (
            <section key={g.nome} className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-serif italic text-[var(--text-main)] whitespace-nowrap">{g.nome}</h2>
                <div className="h-px bg-[var(--border)] flex-1" />
                <span className="text-xs text-[var(--text-muted)] tabular-nums">{g.membros.length}</span>
              </div>

              {comFoto ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {g.membros.map((m) => <CartaoFoto key={m.id} m={m} />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {g.membros.map((m) => <Chip key={m.id} m={m} />)}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
};
