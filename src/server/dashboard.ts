import { Router } from "express";
import { prisma } from "./db";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", async (req, res) => {
  const { uf, status_registro, ibdp, abep, ranking, graduacao, pos } = req.query;
  const whereOptions: any = {};
  
  if (uf) whereOptions.uf_atuacao = uf;
  if (status_registro) whereOptions.status_registro = status_registro;
  if (ibdp === "true") whereOptions.ibdp = true;
  if (abep === "true") whereOptions.abep = true;
  if (ranking === "true") whereOptions.vinculos_docentes = { some: { integra_ranking_40: true } };
  if (graduacao === "true") whereOptions.vinculos_docentes = { some: { tipo: "GRADUACAO" } };
  if (pos === "true") whereOptions.vinculos_docentes = { some: { tipo: "POS" } };

  const totalRegistros = await prisma.associada.count({ where: whereOptions });
  const totalIbdp = await prisma.associada.count({ where: { ...whereOptions, ibdp: true } });
  const totalAbep = await prisma.associada.count({ where: { ...whereOptions, abep: true } });
  const totalDocentes = await prisma.associada.count({ where: { ...whereOptions, leciona: true } });
  const totalRanking = await prisma.associada.count({ where: { ...whereOptions, vinculos_docentes: { some: { integra_ranking_40: true } } } });
  const ambas = await prisma.associada.count({ where: { ...whereOptions, ibdp: true, abep: true } });

  const totalDoutoras = await prisma.associada.count({ where: { ...whereOptions, doutora: true } });
  const totalMestras = await prisma.associada.count({ where: { ...whereOptions, mestre: true } });
  const totalEsp = await prisma.associada.count({ where: { ...whereOptions, especialista: true } });
  const totalLivre = await prisma.associada.count({ where: { ...whereOptions, livre_docente: true } });
  const comLattes = await prisma.associada.count({ where: { ...whereOptions, link_lattes: { not: null, notIn: [''] } } });
  const completas = await prisma.associada.count({ where: { ...whereOptions, status_registro: 'ATIVO' } });
  const revisar = await prisma.associada.count({ where: { ...whereOptions, status_registro: 'REVISAR' } });

  const sul = await prisma.associada.count({ where: { ...whereOptions, uf_atuacao: { in: ['RS', 'SC', 'PR'] } }});
  const se = await prisma.associada.count({ where: { ...whereOptions, uf_atuacao: { in: ['SP', 'RJ', 'MG', 'ES'] } }});
  const ne = await prisma.associada.count({ where: { ...whereOptions, uf_atuacao: { in: ['BA', 'PE', 'CE', 'RN', 'PB', 'AL', 'SE', 'PI', 'MA'] } }});

  const associacaoGrouped = [
    { name: "IBDP" , _count: { id: totalIbdp - ambas } },
    { name: "ABEP", _count: { id: totalAbep - ambas } },
    { name: "Ambas", _count: { id: ambas } },
    { name: "Nenhuma", _count: { id: totalRegistros - (totalIbdp + totalAbep - ambas) } }
  ];

  const statusDocs = await prisma.associada.groupBy({
    by: ['status_registro'],
    _count: { id: true },
    where: whereOptions
  });

  const ufDocs = await prisma.associada.groupBy({
    by: ['uf_atuacao'],
    _count: { id: true },
    where: { ...whereOptions, uf_atuacao: { not: null, notIn: [''] } }
  });

  const atuacaoDocs = await prisma.associada.groupBy({
    by: ['atuacao_profissional'],
    _count: { id: true },
    where: { ...whereOptions, atuacao_profissional: { not: null, notIn: [''] } }
  });
  
  const lecionaGraduacao = await prisma.associada.count({ where: { ...whereOptions, vinculos_docentes: { some: { tipo: "GRADUACAO" } } }});
  const lecionaPos = await prisma.associada.count({ where: { ...whereOptions, vinculos_docentes: { some: { tipo: "POS" } } }});

  const lecionaRanking = await prisma.vinculoDocente.count({
     where: { 
       integra_ranking_40: true,
       associada: whereOptions
     }
  });

  const totalInstituicoes = await prisma.vinculoDocente.count({
    where: { associada: whereOptions }
  });

  const temporalTrend = [
    { name: 'Jan', cadastros: Math.floor(Math.random() * 50) + 10 },
    { name: 'Fev', cadastros: Math.floor(Math.random() * 50) + 10 },
    { name: 'Mar', cadastros: Math.floor(Math.random() * 50) + 10 },
    { name: 'Abr', cadastros: totalRegistros || 10 },
  ];

  const totalProd = await prisma.producaoBibliografica.count({
    where: { associada: whereOptions }
  });

  const prodPorTipo = await prisma.producaoBibliografica.groupBy({
    by: ['tipo_obra'],
    _count: { id: true },
    where: { associada: whereOptions }
  });

  const prodPorArea = await prisma.producaoBibliografica.groupBy({
    by: ['area_processo'],
    _count: { id: true },
    where: { associada: whereOptions }
  });

  const projecao = [
    { uf: 'SP', ibdp: Math.floor(Math.random() * 20), abep: Math.floor(Math.random() * 15) },
    { uf: 'RJ', ibdp: Math.floor(Math.random() * 20), abep: Math.floor(Math.random() * 15) },
    { uf: 'MG', ibdp: Math.floor(Math.random() * 20), abep: Math.floor(Math.random() * 15) },
    { uf: 'RS', ibdp: Math.floor(Math.random() * 20), abep: Math.floor(Math.random() * 15) },
  ];

  res.json({
    kpis: {
      total: totalRegistros,
      ibdp: totalIbdp,
      abep: totalAbep,
      docentes: totalDocentes,
      rankingTotal: totalRanking,
      rankingVotos: lecionaRanking,
      totalInstituicoes,
      doutoras: totalDoutoras,
      mestras: totalMestras,
      comLattes,
      completas,
      revisar,
      sul,
      se,
      ne,
      status: statusDocs,
      totalProducao: totalProd
    },
    charts: {
      uf: ufDocs,
      area: [], // Deprecated
      titulo: [
        { titulo: 'Doutorado', _count: { id: totalDoutoras } },
        { titulo: 'Mestrado', _count: { id: totalMestras } },
        { titulo: 'Especialista', _count: { id: totalEsp } },
        { titulo: 'Livre-Docente', _count: { id: totalLivre } },
      ],
      atuacao: atuacaoDocs,
      nivel_docencia: [
        { nivel_docencia: 'Graduação', _count: { id: lecionaGraduacao } },
        { nivel_docencia: 'Pós-Graduação', _count: { id: lecionaPos } },
      ],
      associacao: associacaoGrouped,
      temporal: temporalTrend,
      projecao: projecao,
      producao_tipo: prodPorTipo,
      producao_area: prodPorArea
    }
  });
});
