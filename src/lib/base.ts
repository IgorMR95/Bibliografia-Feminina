/**
 * Acesso à base pública, servida como arquivos estáticos.
 *
 * Todo o lado público do site — consulta de pessoas, busca de obras,
 * gráficos e páginas institucionais — lê daqui, e não do Supabase. Os
 * arquivos são gerados por `npm run gerar-dados` a partir da planilha em
 * dados/base-processualistas.xlsx.
 *
 * O Supabase continua atendendo o que precisa de servidor: login e a área
 * da equipe (editor de textos, importação de planilha).
 *
 * Os três arquivos são carregados sob demanda e memorizados: quem só abre
 * a consulta de pessoas baixa 66 KB, não os 441 KB da bibliografia.
 */

import { VERSAO_DADOS } from "../dadosVersao";

export interface Titulacao {
  titulo: string | null;
  ano: string | null;
  faculdade: string | null;
  area: string | null;
  link: string | null;
}

export interface Associada {
  id: string;
  nome: string;
  email: string | null;
  uf: string | null;
  atuacao: string | null;
  ibdp: boolean;
  abep: boolean;
  leciona: boolean;
  ranking40: boolean;
  instituicao: string | null;
  lattes: string | null;
  lattesAtualizado: string | null;
  especialista: boolean;
  mestre: boolean;
  mestrado: Titulacao | null;
  doutora: boolean;
  doutorado: Titulacao | null;
  livreDocente: boolean;
  livreDocencia: Titulacao | null;
  incompleto: boolean;
}

export interface Obra {
  id: string;
  autorId: string;
  tipo: string;
  citacao: string;
  ano: string;
  area: string;
  /** link para o texto completo — hoje só as dissertações e teses têm */
  link: string | null;
  /**
   * "bibliografia" vem da aba 2 da planilha; "titulacao" é derivada da
   * aba 1 (dissertações e teses). As duas aparecem na busca, mas só a
   * primeira entra nas contagens das estatísticas.
   */
  origem: "bibliografia" | "titulacao";
}

export interface Contagem { label: string; valor: number }

export interface Estatisticas {
  kpis: Record<string, number>;
  por_uf: Contagem[];
  por_atuacao: Contagem[];
  por_titulacao: Contagem[];
  por_tipo_obra: Contagem[];
  por_area: Contagem[];
  por_ano: Contagem[];
  por_instituicao: Contagem[];
}

export interface Conteudo {
  paginas: { slug: string; titulo: string; subtitulo: string | null; conteudo: string }[];
  membros: {
    id: string; nome: string; funcao: string | null; grupo: string;
    bio: string | null; foto_url: string | null; lattes_url: string | null; ordem: number;
  }[];
  grupos: { nome: string; ordem: number }[];
}

const cache = new Map<string, Promise<unknown>>();

function carregar<T>(arquivo: string): Promise<T> {
  if (!cache.has(arquivo)) {
    cache.set(
      arquivo,
      fetch(`/dados/${arquivo}?v=${VERSAO_DADOS}`).then((r) => {
        if (!r.ok) throw new Error(`Falha ao carregar ${arquivo} (${r.status})`);
        return r.json();
      }).catch((e) => {
        // não deixa o erro preso no cache: a próxima tentativa refaz
        cache.delete(arquivo);
        throw e;
      })
    );
  }
  return cache.get(arquivo) as Promise<T>;
}

export const getAssociadas = () => carregar<Associada[]>("associadas.json");
export const getObras = () => carregar<Obra[]>("obras.json");
export const getEstatisticas = () => carregar<Estatisticas>("estatisticas.json");
export const getConteudo = () => carregar<Conteudo>("conteudo.json");

/** índice por id, para a ficha individual não varrer a lista */
let indice: Map<string, Associada> | null = null;
export async function getAssociada(id: string): Promise<Associada | null> {
  const lista = await getAssociadas();
  if (!indice) indice = new Map(lista.map((a) => [a.id, a]));
  return indice.get(id) ?? null;
}

export async function getObrasDe(autorId: string): Promise<Obra[]> {
  const obras = await getObras();
  return obras.filter((o) => o.autorId === autorId);
}

/** comparação sem acento e sem caixa, usada pelas buscas locais */
export const semAcento = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
