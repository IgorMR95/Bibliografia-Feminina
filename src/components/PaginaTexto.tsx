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
    <div className="max-w-4xl mx-auto space-y-10 pb-20 fade-in">
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="p-10 md:p-16 border-b border-[var(--border)] bg-[var(--nav-active)] text-center">
          <Icone className="w-12 h-12 text-[var(--accent)] mx-auto mb-6" />
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[var(--heading)] mb-4">
            {pagina.titulo}
          </h1>
          {pagina.subtitulo && (
            <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">{pagina.subtitulo}</p>
          )}
        </div>

        <div className="p-10 md:p-16">
          <Markdown texto={pagina.conteudo} />
        </div>
      </div>
    </div>
  );
};
