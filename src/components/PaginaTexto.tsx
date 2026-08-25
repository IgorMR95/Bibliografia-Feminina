import { LucideIcon } from "lucide-react";
import { usePagina } from "../lib/conteudo";
import { Markdown } from "../lib/markdown";

/**
 * Casca das paginas institucionais cujo texto vem do banco e e' editavel
 * pelo painel (Administracao > Textos das Páginas).
 */
export const PaginaTexto = ({ slug, Icone }: { slug: string; Icone: LucideIcon }) => {
  const { pagina, carregando } = usePagina(slug);

  if (carregando) {
    return <div className="max-w-4xl mx-auto py-20 text-center text-[var(--text-muted)]">Carregando…</div>;
  }

  if (!pagina) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <p className="text-[var(--text-muted)]">Conteúdo ainda não publicado.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-24 fade-in">
      <header className="pt-12 pb-10 text-center">
        <div className="w-11 h-11 rounded-lg bg-[var(--nav-active)] flex items-center justify-center mx-auto mb-6">
          <Icone className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <h1 className="text-4xl md:text-[2.75rem] font-serif font-bold text-[var(--heading)] leading-tight">
          {pagina.titulo}
        </h1>
        {pagina.subtitulo && (
          <p className="mt-4 text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            {pagina.subtitulo}
          </p>
        )}
      </header>

      <article className="rounded-xl border border-[var(--border)] bg-white p-8 md:p-12">
        <Markdown texto={pagina.conteudo} />
      </article>
    </div>
  );
};
