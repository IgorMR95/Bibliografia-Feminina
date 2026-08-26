import { useEffect, useState } from "react";
import { getConteudo, getEstatisticas } from "./base";

/**
 * Conteúdo institucional das páginas públicas.
 *
 * Vem do arquivo estático conteudo.json, congelado a partir do Supabase
 * por `npm run gerar-dados`. O editor do painel continua gravando no
 * Supabase; o que ele publica aparece no site depois que os dados forem
 * regerados e enviados — é o mesmo ciclo da planilha.
 */

export interface Pagina {
  slug: string;
  titulo: string;
  subtitulo: string | null;
  conteudo: string;
}

export interface Membro {
  id: string;
  nome: string;
  funcao: string | null;
  grupo: string;
  bio: string | null;
  foto_url: string | null;
  lattes_url: string | null;
  ordem: number;
}

export interface NumerosHome {
  processualistas: number;
  producoes: number;
  mestrados: number;
  doutorados: number;
  livre_docencias: number;
}

export function usePagina(slug: string) {
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    getConteudo()
      .then((c) => { if (ativo) setPagina(c.paginas.find((p) => p.slug === slug) ?? null); })
      .catch(() => { if (ativo) setPagina(null); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [slug]);

  return { pagina, carregando };
}

export function useMembros() {
  const [grupos, setGrupos] = useState<{ nome: string; membros: Membro[] }[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    getConteudo()
      .then((c) => {
        if (!ativo) return;
        const ordem = new Map(c.grupos.map((g) => [g.nome, g.ordem]));
        const porGrupo = new Map<string, Membro[]>();
        for (const m of c.membros as Membro[]) {
          if (!porGrupo.has(m.grupo)) porGrupo.set(m.grupo, []);
          porGrupo.get(m.grupo)!.push(m);
        }
        for (const lista of porGrupo.values()) {
          lista.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
        }
        setGrupos(
          [...porGrupo.entries()]
            .map(([nome, membros]) => ({ nome, membros }))
            // grupo não cadastrado vai para o fim, em ordem alfabética
            .sort((a, b) =>
              (ordem.get(a.nome) ?? 999) - (ordem.get(b.nome) ?? 999) ||
              a.nome.localeCompare(b.nome, "pt-BR"))
        );
      })
      .catch(() => { if (ativo) setGrupos([]); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  return { grupos, carregando };
}

/** números reais da base, para a Home não divergir do que a busca mostra */
export function useNumerosHome() {
  const [numeros, setNumeros] = useState<NumerosHome | null>(null);

  useEffect(() => {
    let ativo = true;
    getEstatisticas()
      .then((e) => {
        if (!ativo) return;
        setNumeros({
          processualistas: e.kpis.total ?? 0,
          producoes: e.kpis.total_producoes ?? 0,
          mestrados: e.kpis.total_mestres ?? 0,
          doutorados: e.kpis.total_doutoras ?? 0,
          livre_docencias: e.kpis.total_livre_docentes ?? 0,
        });
      })
      .catch(() => { if (ativo) setNumeros(null); });
    return () => { ativo = false; };
  }, []);

  return numeros;
}

/** iniciais para quem ainda não tem foto */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => p.length > 2);
  if (partes.length === 0) return nome.slice(0, 2).toUpperCase();
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
