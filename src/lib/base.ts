import { supabase } from "./supabase";

/**
 * Acesso à base pública — agora direto do Supabase.
 *
 * Esta camada já foi servida por arquivos estáticos gerados da planilha.
 * Voltou a consultar o banco a pedido, e a interface pública foi mantida
 * exatamente igual (getAssociadas/getObras/getEstatisticas/getConteudo),
 * de modo que Consulta, BuscaObras, Dashboards, FichaAssociada e as
 * páginas institucionais não precisaram mudar uma linha.
 *
 * Para voltar ao estático, é este arquivo que se troca — o gerador segue
 * em scripts/gerar-dados.mjs e os JSON em public/dados/.
 */

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
  link: string | null;
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

/** tipos de obra que vieram da titulação, e não da aba de bibliografia */
const TIPOS_ACADEMICOS = new Set([
  "Dissertação de Mestrado",
  "Tese de Doutorado",
  "Tese de Livre-Docência",
]);

const cache = new Map<string, Promise<unknown>>();

function memorizar<T>(chave: string, carregar: () => Promise<T>): Promise<T> {
  if (!cache.has(chave)) {
    cache.set(
      chave,
      carregar().catch((e) => {
        // erro preso no cache faria toda tentativa seguinte falhar igual
        cache.delete(chave);
        throw e;
      })
    );
  }
  return cache.get(chave) as Promise<T>;
}

const titulacao = (
  titulo: string | null, ano: string | null, faculdade: string | null,
  area: string | null, link: string | null
): Titulacao | null =>
  titulo || ano || faculdade || area || link
    ? { titulo, ano, faculdade, area, link }
    : null;

/**
 * O PostgREST devolve no máximo 1000 linhas por requisição; a bibliografia
 * passa de 7 mil. Sem paginar, a busca por obras perderia silenciosamente
 * tudo depois da milésima.
 *
 * As páginas vão em paralelo, não em fila: a contagem exata vem primeiro
 * (uma requisição HEAD, sem corpo) e daí todas as faixas são pedidas de
 * uma vez. Em fila, as 8 páginas da bibliografia levavam ~8 s — tempo que
 * o visitante passaria olhando um "carregando".
 */
async function todasAsPaginas<T>(
  tabela: string,
  colunas: string,
  ordenarPor: string,
  tamanho = 1000
): Promise<T[]> {
  const { count, error: erroContagem } = await supabase
    .from(tabela)
    .select(colunas, { count: "exact", head: true });
  if (erroContagem) throw erroContagem;

  const total = count ?? 0;
  if (total === 0) return [];

  const faixas: number[] = [];
  for (let inicio = 0; inicio < total; inicio += tamanho) faixas.push(inicio);

  const lotes = await Promise.all(
    faixas.map(async (inicio) => {
      const { data, error } = await supabase
        .from(tabela)
        .select(colunas)
        .order(ordenarPor)
        .range(inicio, inicio + tamanho - 1);
      if (error) throw error;
      return (data ?? []) as T[];
    })
  );

  return lotes.flat();
}

export const getAssociadas = () =>
  memorizar<Associada[]>("associadas", async () => {
    const linhas = await todasAsPaginas<any>(
      "associadas",
      "id,nome,email,uf_atuacao,atuacao_profissional,ibdp,abep,leciona,link_lattes," +
        "data_atualizacao_lattes,especialista,status_registro," +
        "mestre,titulo_mestrado,ano_mestrado,faculdade_mestrado,area_mestrado,link_mestrado," +
        "doutora,titulo_doutorado,ano_doutorado,faculdade_doutorado,area_doutorado,link_doutorado," +
        "livre_docente,titulo_livre_docencia,ano_livre_docencia,faculdade_livre_docencia," +
        "area_livre_docencia,link_livre_docencia," +
        "vinculos_docentes(instituicao,integra_ranking_40)",
      "nome"
    );

    return linhas.map((a): Associada => {
      const vinculos = a.vinculos_docentes ?? [];
      return {
        id: a.id,
        nome: a.nome,
        email: a.email,
        uf: a.uf_atuacao,
        atuacao: a.atuacao_profissional,
        ibdp: !!a.ibdp,
        abep: !!a.abep,
        leciona: !!a.leciona,
        ranking40: vinculos.some((v: any) => v.integra_ranking_40),
        instituicao: vinculos[0]?.instituicao ?? null,
        lattes: a.link_lattes,
        lattesAtualizado: a.data_atualizacao_lattes,
        especialista: !!a.especialista,
        mestre: !!a.mestre,
        mestrado: titulacao(a.titulo_mestrado, a.ano_mestrado, a.faculdade_mestrado, a.area_mestrado, a.link_mestrado),
        doutora: !!a.doutora,
        doutorado: titulacao(a.titulo_doutorado, a.ano_doutorado, a.faculdade_doutorado, a.area_doutorado, a.link_doutorado),
        livreDocente: !!a.livre_docente,
        livreDocencia: titulacao(a.titulo_livre_docencia, a.ano_livre_docencia, a.faculdade_livre_docencia, a.area_livre_docencia, a.link_livre_docencia),
        incompleto: a.status_registro === "INCOMPLETO",
      };
    });
  });

export const getObras = () =>
  memorizar<Obra[]>("obras", async () => {
    const linhas = await todasAsPaginas<any>(
      "producoes_bibliograficas",
      "id,associada_id,tipo_obra,citacao_completa,ano_publicacao,area_processo,link_acesso",
      "id"
    );
    return linhas.map((o): Obra => ({
      id: o.id,
      autorId: o.associada_id,
      tipo: o.tipo_obra,
      citacao: o.citacao_completa,
      ano: o.ano_publicacao,
      area: o.area_processo,
      link: o.link_acesso,
      origem: TIPOS_ACADEMICOS.has(o.tipo_obra) ? "titulacao" : "bibliografia",
    }));
  });

export const getEstatisticas = () =>
  memorizar<Estatisticas>("estatisticas", async () => {
    const { data, error } = await supabase.rpc("get_dashboard_stats", {
      p_uf: null, p_status: null, p_ibdp: null,
      p_abep: null, p_ranking: null, p_leciona: null,
    });
    if (error) throw error;
    return data as Estatisticas;
  });

/**
 * Estatísticas com filtro, somadas no banco.
 *
 * Quando a base era estática, filtrar exigia baixar as 7.404 obras e
 * recontar no navegador. Consultando o Supabase, a função do banco já
 * aceita os filtros e devolve pronto — cerca de 350 ms contra os ~4 s de
 * baixar tudo.
 */
export async function getEstatisticasFiltradas(f: {
  uf?: string; ibdp?: string; abep?: string; ranking?: string;
}): Promise<Estatisticas> {
  const booleano = (v?: string) => (v === "" || v === undefined ? null : v === "true");
  const { data, error } = await supabase.rpc("get_dashboard_stats", {
    p_uf: f.uf || null,
    p_status: null,
    p_ibdp: booleano(f.ibdp),
    p_abep: booleano(f.abep),
    p_ranking: booleano(f.ranking),
    p_leciona: null,
  });
  if (error) throw error;
  return data as Estatisticas;
}

export const getConteudo = () =>
  memorizar<Conteudo>("conteudo", async () => {
    const [paginas, membros, grupos] = await Promise.all([
      supabase.from("paginas").select("slug,titulo,subtitulo,conteudo").order("ordem"),
      supabase.from("membros").select("id,nome,funcao,grupo,bio,foto_url,lattes_url,ordem").order("ordem"),
      supabase.from("grupos_membros").select("nome,ordem").order("ordem"),
    ]);
    if (paginas.error) throw paginas.error;

    // título e subtítulo são texto puro; "## " digitado no editor apareceria
    // literal na página
    const semMarcacao = (v: string | null) =>
      typeof v === "string" ? v.replace(/^\s*#{1,6}\s*/, "").trim() : v;

    return {
      paginas: (paginas.data ?? []).map((p: any) => ({
        ...p,
        titulo: semMarcacao(p.titulo) ?? p.titulo,
        subtitulo: semMarcacao(p.subtitulo),
      })),
      membros: (membros.data ?? []) as Conteudo["membros"],
      grupos: (grupos.data ?? []) as Conteudo["grupos"],
    };
  });

/**
 * Identificador legível que a versão estática usava na URL, quando a
 * planilha não trazia id nenhum: /consulta/ada-pellegrini-grinover.
 * Com o banco de volta, o id é o UUID — mas quem tiver guardado ou
 * divulgado um link daqueles continua chegando na pessoa certa.
 */
const apelido = (nome: string) =>
  semAcento(nome).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim()
    .replace(/ /g, "-").slice(0, 80);

/** índices por id e por apelido, para a ficha individual não varrer a lista */
let indice: Map<string, Associada> | null = null;
export async function getAssociada(id: string): Promise<Associada | null> {
  const lista = await getAssociadas();
  if (!indice) {
    indice = new Map();
    for (const a of lista) {
      indice.set(a.id, a);
      // o UUID sempre vence: só entra o apelido que ainda não tem dono
      const alias = apelido(a.nome);
      if (alias && !indice.has(alias)) indice.set(alias, a);
    }
  }
  return indice.get(id) ?? null;
}

/**
 * Busca as obras de uma pessoa direto no banco: a ficha individual não
 * precisa baixar a bibliografia inteira para mostrar algumas dezenas.
 */
export async function getObrasDe(autorId: string): Promise<Obra[]> {
  // a URL pode trazer o apelido antigo em vez do UUID; nesse caso o filtro
  // por uuid daria erro de tipo no PostgREST antes de chegar ao banco
  if (!/^[0-9a-f-]{36}$/i.test(autorId)) {
    const pessoa = await getAssociada(autorId);
    if (!pessoa) return [];
    autorId = pessoa.id;
  }
  const { data, error } = await supabase
    .from("producoes_bibliograficas")
    .select("id,associada_id,tipo_obra,citacao_completa,ano_publicacao,area_processo,link_acesso")
    .eq("associada_id", autorId);
  if (error) throw error;
  return (data ?? []).map((o: any): Obra => ({
    id: o.id,
    autorId: o.associada_id,
    tipo: o.tipo_obra,
    citacao: o.citacao_completa,
    ano: o.ano_publicacao,
    area: o.area_processo,
    link: o.link_acesso,
    origem: TIPOS_ACADEMICOS.has(o.tipo_obra) ? "titulacao" : "bibliografia",
  }));
}

/** comparação sem acento e sem caixa, usada pelas buscas locais */
export const semAcento = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
