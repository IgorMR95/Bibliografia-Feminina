import { ReactNode } from "react";

/**
 * Renderizador de Markdown para o conteudo editavel das paginas.
 *
 * Escopo deliberadamente pequeno — titulos, paragrafos, listas, negrito,
 * italico e links — porque e' o que os textos institucionais usam. Gera
 * elementos React em vez de injetar HTML: o conteudo vem do painel admin,
 * e nada do que for digitado la vira marcacao executavel.
 *
 * Sintaxe:
 *   ## Titulo        ### Subtitulo
 *   - item de lista
 *   **negrito**      *italico*
 *   [texto](https://…)
 */

type Inline = { tipo: "texto" | "negrito" | "italico" | "link"; valor: string; href?: string };

/** quebra uma linha em trechos formatados, sem aninhar (suficiente aqui) */
function fatiar(linha: string): Inline[] {
  const partes: Inline[] = [];
  // ordem importa: ** antes de *, senao o italico come o negrito
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(linha))) {
    if (m.index > ultimo) partes.push({ tipo: "texto", valor: linha.slice(ultimo, m.index) });
    if (m[2] !== undefined) partes.push({ tipo: "negrito", valor: m[2] });
    else if (m[4] !== undefined) partes.push({ tipo: "italico", valor: m[4] });
    else if (m[6] !== undefined) partes.push({ tipo: "link", valor: m[6], href: m[7] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < linha.length) partes.push({ tipo: "texto", valor: linha.slice(ultimo) });
  return partes;
}

/** so http(s) e mailto viram link clicavel; o resto fica como texto */
function hrefSeguro(href: string): string | null {
  const limpo = href.trim();
  return /^(https?:\/\/|mailto:)/i.test(limpo) ? limpo : null;
}

function Trechos({ linha }: { linha: string }) {
  return (
    <>
      {fatiar(linha).map((p, i) => {
        if (p.tipo === "negrito") return <strong key={i} className="text-[var(--text-main)] font-semibold">{p.valor}</strong>;
        if (p.tipo === "italico") return <em key={i}>{p.valor}</em>;
        if (p.tipo === "link") {
          const href = hrefSeguro(p.href ?? "");
          if (!href) return <span key={i}>{p.valor}</span>;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] underline underline-offset-2 hover:opacity-80 break-words"
            >
              {p.valor}
            </a>
          );
        }
        return <span key={i}>{p.valor}</span>;
      })}
    </>
  );
}

export function Markdown({ texto, className = "" }: { texto: string; className?: string }) {
  const linhas = (texto ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocos: ReactNode[] = [];
  let lista: string[] = [];

  const fecharLista = () => {
    if (lista.length === 0) return;
    blocos.push(
      <ul key={`ul-${blocos.length}`} className="list-disc pl-6 space-y-2 text-[var(--text-muted)]">
        {lista.map((item, i) => (
          <li key={i} className="leading-relaxed"><Trechos linha={item} /></li>
        ))}
      </ul>
    );
    lista = [];
  };

  for (const bruta of linhas) {
    const linha = bruta.trim();

    if (!linha) { fecharLista(); continue; }

    const item = linha.match(/^[-*]\s+(.*)$/);
    if (item) { lista.push(item[1]); continue; }

    fecharLista();

    const titulo = linha.match(/^(#{1,6})\s+(.*)$/);
    if (titulo) {
      const nivel = titulo[1].length;
      const txt = titulo[2];
      if (nivel <= 2) {
        blocos.push(
          <h2 key={blocos.length} className="text-2xl font-serif italic text-[var(--text-main)] mt-10 mb-4 first:mt-0">
            <Trechos linha={txt} />
          </h2>
        );
      } else {
        blocos.push(
          <h3 key={blocos.length} className="text-lg font-bold text-[var(--text-main)] mt-8 mb-3">
            <Trechos linha={txt} />
          </h3>
        );
      }
      continue;
    }

    blocos.push(
      <p key={blocos.length} className="text-[var(--text-muted)] leading-relaxed text-justify">
        <Trechos linha={linha} />
      </p>
    );
  }
  fecharLista();

  return <div className={`space-y-4 ${className}`}>{blocos}</div>;
}
