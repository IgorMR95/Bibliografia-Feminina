import { Associada, Obra, Estatisticas, Contagem } from "./base";

/**
 * Recalcula os agregados no navegador quando há filtro ativo.
 *
 * Sem filtro a página usa estatisticas.json, que já vem pronto e pesa 1 KB.
 * Só quando alguém filtra é que vale a pena baixar a base e somar aqui —
 * espelha o que a função get_dashboard_stats fazia no banco.
 */

export interface Filtros {
  uf: string;
  ibdp: string;
  abep: string;
  ranking: string;
}

export const temFiltro = (f: Filtros) =>
  Boolean(f.uf || f.ibdp !== "" || f.abep !== "" || f.ranking !== "");

function contar<T>(itens: T[], chaveDe: (i: T) => string | null | undefined): Contagem[] {
  const m = new Map<string, number>();
  for (const i of itens) {
    const k = chaveDe(i);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function aplicarFiltros(associadas: Associada[], f: Filtros): Associada[] {
  return associadas.filter((a) => {
    if (f.uf && (a.uf ?? "").toUpperCase() !== f.uf.toUpperCase()) return false;
    if (f.ibdp !== "" && a.ibdp !== (f.ibdp === "true")) return false;
    if (f.abep !== "" && a.abep !== (f.abep === "true")) return false;
    if (f.ranking !== "" && a.ranking40 !== (f.ranking === "true")) return false;
    return true;
  });
}

export function calcular(associadas: Associada[], obras: Obra[]): Estatisticas {
  const ids = new Set(associadas.map((a) => a.id));
  const doGrupo = obras.filter((o) => ids.has(o.autorId));

  return {
    kpis: {
      total: associadas.length,
      total_producoes: doGrupo.length,
      total_ibdp: associadas.filter((a) => a.ibdp).length,
      total_abep: associadas.filter((a) => a.abep).length,
      total_docentes: associadas.filter((a) => a.leciona).length,
      total_ranking_40: associadas.filter((a) => a.ranking40).length,
      total_doutoras: associadas.filter((a) => a.doutora).length,
      total_mestres: associadas.filter((a) => a.mestre).length,
      total_livre_docentes: associadas.filter((a) => a.livreDocente).length,
      total_especialistas: associadas.filter((a) => a.especialista).length,
    },
    por_uf: contar(associadas, (a) => a.uf),
    por_atuacao: contar(associadas, (a) => a.atuacao),
    por_titulacao: [
      { label: "Mestre", valor: associadas.filter((a) => a.mestre).length },
      { label: "Doutora", valor: associadas.filter((a) => a.doutora).length },
      { label: "Especialista", valor: associadas.filter((a) => a.especialista).length },
      { label: "Livre-Docente", valor: associadas.filter((a) => a.livreDocente).length },
    ].filter((t) => t.valor > 0).sort((a, b) => b.valor - a.valor),
    por_tipo_obra: contar(doGrupo, (o) => o.tipo),
    por_area: contar(doGrupo, (o) => o.area),
    por_ano: contar(doGrupo.filter((o) => /^(19|20)\d{2}$/.test(o.ano)), (o) => o.ano)
      .sort((a, b) => a.label.localeCompare(b.label)),
    por_instituicao: contar(associadas, (a) => a.instituicao).slice(0, 10),
  };
}
