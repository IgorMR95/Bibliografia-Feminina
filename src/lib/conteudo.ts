import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface Pagina {
  slug: string;
  titulo: string;
  subtitulo: string | null;
  conteudo: string;
  atualizado_em?: string;
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
  instituicoes: number;
  ufs: number;
}

/** Carrega o conteudo editavel de uma pagina. */
export function usePagina(slug: string) {
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    supabase
      .from("paginas")
      .select("slug, titulo, subtitulo, conteudo, atualizado_em")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!ativo) return;
        setPagina(data ?? null);
        setCarregando(false);
      });
    return () => { ativo = false; };
  }, [slug]);

  return { pagina, carregando };
}

/** Membros agrupados, na ordem definida em grupos_membros. */
export function useMembros() {
  const [grupos, setGrupos] = useState<{ nome: string; membros: Membro[] }[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [{ data: membros }, { data: defGrupos }] = await Promise.all([
        supabase.from("membros").select("*").order("ordem").order("nome"),
        supabase.from("grupos_membros").select("nome, ordem").order("ordem"),
      ]);
      if (!ativo) return;

      const ordemGrupo = new Map((defGrupos ?? []).map((g: any) => [g.nome, g.ordem]));
      const porGrupo = new Map<string, Membro[]>();
      for (const m of (membros ?? []) as Membro[]) {
        if (!porGrupo.has(m.grupo)) porGrupo.set(m.grupo, []);
        porGrupo.get(m.grupo)!.push(m);
      }

      const lista = [...porGrupo.entries()]
        .map(([nome, membros]) => ({ nome, membros }))
        // grupos nao cadastrados vao para o fim, em ordem alfabetica
        .sort((a, b) => (ordemGrupo.get(a.nome) ?? 999) - (ordemGrupo.get(b.nome) ?? 999) || a.nome.localeCompare(b.nome));

      setGrupos(lista);
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, []);

  return { grupos, carregando };
}

/** Numeros reais da base, para a Home nao divergir do que a busca mostra. */
export function useNumerosHome() {
  const [numeros, setNumeros] = useState<NumerosHome | null>(null);

  useEffect(() => {
    let ativo = true;
    supabase.rpc("get_numeros_home").then(({ data }) => {
      if (ativo && data) setNumeros(data as NumerosHome);
    });
    return () => { ativo = false; };
  }, []);

  return numeros;
}

/** iniciais para quem ainda nao tem foto */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => p.length > 2);
  if (partes.length === 0) return nome.slice(0, 2).toUpperCase();
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
