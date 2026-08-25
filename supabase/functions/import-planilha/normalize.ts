/**
 * Normalizacao da planilha BPF -> payload do banco.
 *
 * A planilha e' preenchida a mao por varias pessoas, entao praticamente
 * todo campo chega sujo: "Sim " com espaco, UF como "SP — Sao Paulo",
 * data ora em DD/MM/AAAA ora como serial do Excel, area escrita por
 * extenso. Tudo isso e' resolvido aqui, uma vez, antes de chegar no banco.
 */

export const COL = {
  nome: "Nome da Processualista",
  email: "E-mail da Processualista",
  ranking: "Integra Ranking 40+Universidades?",
  universidade: "Se sim, qual Universidade integra?",
  atuacao: "Qual a atuação profissional?",
  uf: "UF da atuação principal",
  ibdp: "É associada do IBDP?",
  abep: "É associada da ABEP?",
  lattes: "Link do currículo Lattes",
  lattesData: "Data da última atualização do Lattes",
  especialista: "É especialista (lato sensu)?",
  mestre: "É mestre?",
  tituloM: "Título da Dissertação de Mestrado",
  anoM: "Ano de publicação da dissertação de Mestrado",
  facM: "Faculdade em que defendeu Mestrado",
  areaM: "Área em que defendeu Mestrado",
  linkM: "Link de acesso ao trabalho (Mestrado)",
  doutora: "É doutora?",
  tituloD: "Título da Tese de Doutorado",
  anoD: "Ano de publicação da tese de Doutorado",
  facD: "Faculdade em que defendeu o Doutorado",
  areaD: "Área em que defendeu o Doutorado",
  linkD: "Link de acesso ao trabalho (Doutorado)",
  livre: "É livre-docente?",
  tituloL: "Título da Tese de Livre-Docência",
  anoL: "Ano de publicação da Tese de Livre-Docência",
  facL: "Faculdade em que defendeu a Livre-Docência",
  areaL: "Área em que defendeu a Livre-Docência",
  linkL: "Link de acesso ao trabalho (Livre-Docência)",
} as const;

export const PCOL = {
  nome: "Nome da Processualista",
  tipo: "Tipo de Obra",
  citacao: "Citação completa da Obra",
  ano: "Ano de publicação da Obra",
  area: "Área do Processo",
} as const;

type Row = Record<string, unknown>;

/** trim que tambem mata espaco nao-quebravel vindo do Excel */
const s = (v: unknown) => String(v ?? "").replace(/ /g, " ").trim();
const nn = (v: unknown) => { const t = s(v); return t === "" ? null : t; };

const fold = (v: unknown) =>
  s(v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** chave canonica de pessoa — precisa bater com public.nome_key() no banco */
export const nameKey = (v: unknown) =>
  fold(v).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

const toBool = (v: unknown) => ["sim", "s", "true", "1", "yes"].includes(fold(v));

/** "SP — São Paulo" -> "SP" */
function toUF(v: unknown): string | null {
  const t = s(v);
  if (!t) return null;
  const m = t.match(/^([A-Za-z]{2})\s*[—–-]/);
  if (m) return m[1].toUpperCase();
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();
  return null;
}

/** aceita DD/MM/AAAA, serial do Excel (base 1899-12-30) e ISO */
function toDate(v: unknown): string | null {
  const t = s(v);
  if (!t) return null;
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const [, d, mo, y] = br;
    const dt = new Date(Date.UTC(+y, +mo - 1, +d));
    if (dt.getUTCDate() !== +d || dt.getUTCMonth() !== +mo - 1) return null;
    return `${y}-${mo}-${d}`;
  }
  if (/^\d{4,6}$/.test(t)) {
    const serial = +t;
    if (serial < 20000 || serial > 60000) return null;
    return new Date(Date.UTC(1899, 11, 30) + serial * 86400000).toISOString().slice(0, 10);
  }
  const iso = t.match(/^\d{4}-\d{2}-\d{2}/);
  return iso ? iso[0] : null;
}

const toAno = (v: unknown) => s(v).match(/(19|20)\d{2}/)?.[0] ?? null;

const ATUACAO: Record<string, string | null> = {
  "advocacia privada": "Advocacia Privada",
  "advocacia publica": "Advocacia Pública",
  "docencia (exclusivamente)": "Docência (Exclusivamente)",
  "poder judiciario": "Poder Judiciário",
  "ministerio publico": "Ministério Público",
  "defensoria publica": "Defensoria Pública",
  "mediacao / conciliacao": "Mediação / Conciliação",
  "membro de camara arb.": "Membro de Câmara Arb.",
  "outros setores": "Outros Setores",
  "nao localizada": null,
};
function toAtuacao(v: unknown): string | null {
  const f = fold(v);
  if (!f) return null;
  return f in ATUACAO ? ATUACAO[f] : s(v);
}

/** "Direito Processual - Civil " -> "P. Civil" */
function toArea(v: unknown): string {
  const f = fold(v);
  if (!f) return "Outros";
  if (f.includes("civil")) return "P. Civil";
  if (f.includes("penal")) return "P. Penal";
  if (f.includes("trabalho") || f.includes("trabalhista")) return "P. Trabalhista";
  if (f.includes("tributario")) return "P. Tributario";
  if (f.includes("constitucional")) return "P. Constitucional";
  if (f.includes("administrativo")) return "P. Administrativo";
  return "Outros";
}

function toTipoObra(v: unknown): string {
  const f = fold(v);
  if (!f) return "Artigo";
  if (f === "artigo") return "Artigo";
  if (f === "livro") return "Livro";
  if (f.startsWith("capitulo")) return "Capitulo de Livro";
  if (f.startsWith("anais")) return "Anais de Eventos";
  if (f.startsWith("coluna")) return "Coluna em Jornais e Sites";
  if (f.startsWith("org")) return "Org. ou Coord.";
  return "Artigo";
}

/** a planilha usa "Não é público" como marcador, nao como URL */
function toLink(v: unknown): string | null {
  const t = nn(v);
  if (!t) return null;
  if (/^n[aã]o\s+[eé]\s+p[uú]blico/i.test(t)) return null;
  return t;
}

export interface Associada {
  nome: string; nome_key: string; email: string | null; status_registro: string;
  uf_atuacao: string | null; atuacao_profissional: string | null;
  ibdp: boolean; abep: boolean; leciona: boolean;
  link_lattes: string | null; data_atualizacao_lattes: string | null;
  especialista: boolean; mestre: boolean; doutora: boolean; livre_docente: boolean;
  [k: string]: unknown;
  vinculos_docentes: { instituicao: string; integra_ranking_40: boolean; tipo: string }[];
}

export function normalizeAssociadas(rows: Row[]) {
  const out: Associada[] = [];
  const erros: { linha: number; erro: string; nome?: string }[] = [];
  const vistos = new Map<string, number>();

  rows.forEach((r, i) => {
    const linha = i + 2; // +1 cabecalho, +1 base 1
    const nome = s(r[COL.nome]);
    if (!nome) { erros.push({ linha, erro: "linha sem nome" }); return; }

    const k = nameKey(nome);
    if (vistos.has(k)) {
      erros.push({ linha, erro: `nome repetido (ja aparece na linha ${vistos.get(k)})`, nome });
      return;
    }
    vistos.set(k, linha);

    let email = nn(r[COL.email]);
    if (email && (/^n\/?a$/i.test(email) || !email.includes("@"))) email = null;

    const universidade = nn(r[COL.universidade]);
    const vinculos = universidade
      ? [{ instituicao: universidade, integra_ranking_40: toBool(r[COL.ranking]), tipo: "GRADUACAO" }]
      : [];

    out.push({
      nome, nome_key: k, email, status_registro: "ATIVO",
      uf_atuacao: toUF(r[COL.uf]),
      atuacao_profissional: toAtuacao(r[COL.atuacao]),
      ibdp: toBool(r[COL.ibdp]),
      abep: toBool(r[COL.abep]),
      // a planilha nao tem coluna "Leciona?"; o unico sinal e' ter instituicao
      leciona: vinculos.length > 0,
      link_lattes: nn(r[COL.lattes]),
      data_atualizacao_lattes: toDate(r[COL.lattesData]),
      especialista: toBool(r[COL.especialista]),
      mestre: toBool(r[COL.mestre]),
      titulo_mestrado: nn(r[COL.tituloM]),
      ano_mestrado: toAno(r[COL.anoM]),
      faculdade_mestrado: nn(r[COL.facM]),
      area_mestrado: nn(r[COL.areaM]),
      link_mestrado: toLink(r[COL.linkM]),
      doutora: toBool(r[COL.doutora]),
      titulo_doutorado: nn(r[COL.tituloD]),
      ano_doutorado: toAno(r[COL.anoD]),
      faculdade_doutorado: nn(r[COL.facD]),
      area_doutorado: nn(r[COL.areaD]),
      link_doutorado: toLink(r[COL.linkD]),
      livre_docente: toBool(r[COL.livre]),
      titulo_livre_docencia: nn(r[COL.tituloL]),
      ano_livre_docencia: toAno(r[COL.anoL]),
      faculdade_livre_docencia: nn(r[COL.facL]),
      area_livre_docencia: nn(r[COL.areaL]),
      link_livre_docencia: toLink(r[COL.linkL]),
      vinculos_docentes: vinculos,
    });
  });

  return { associadas: out, erros };
}

export function normalizeProducoes(rows: Row[], associadas: Associada[]) {
  const known = new Set(associadas.map((a) => a.nome_key));
  const producoes: Record<string, unknown>[] = [];
  const orfas = new Map<string, { nome: string; key: string; n: number }>();
  let descartadas = 0;

  for (const r of rows) {
    const nome = s(r[PCOL.nome]);
    const citacao = s(r[PCOL.citacao]);
    // linhas de rodape / separadores vem sem nome ou sem citacao
    if (!nome || !citacao) { descartadas++; continue; }

    const k = nameKey(nome);
    if (!known.has(k)) {
      if (!orfas.has(k)) orfas.set(k, { nome, key: k, n: 0 });
      orfas.get(k)!.n++;
    }

    producoes.push({
      nome_key: k,
      tipo_obra: toTipoObra(r[PCOL.tipo]),
      citacao_completa: citacao,
      ano_publicacao: toAno(r[PCOL.ano]) ?? "s/d",
      area_processo: toArea(r[PCOL.area]),
      formato: "ELETRONICA",
    });
  }

  return { producoes, orfas: [...orfas.values()], descartadas };
}

/** processualistas citadas so na aba 2 — entram como INCOMPLETO para revisao */
export function associadasDeOrfas(orfas: { nome: string; key: string }[]): Associada[] {
  return orfas.map((o) => ({
    nome: o.nome, nome_key: o.key, email: null, status_registro: "INCOMPLETO",
    uf_atuacao: null, atuacao_profissional: null,
    ibdp: false, abep: false, leciona: false,
    link_lattes: null, data_atualizacao_lattes: null,
    especialista: false, mestre: false, doutora: false, livre_docente: false,
    titulo_mestrado: null, ano_mestrado: null, faculdade_mestrado: null, area_mestrado: null, link_mestrado: null,
    titulo_doutorado: null, ano_doutorado: null, faculdade_doutorado: null, area_doutorado: null, link_doutorado: null,
    titulo_livre_docencia: null, ano_livre_docencia: null, faculdade_livre_docencia: null,
    area_livre_docencia: null, link_livre_docencia: null,
    vinculos_docentes: [],
  }));
}
