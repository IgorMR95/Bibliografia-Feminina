import { Router } from "express";
import { prisma } from "./db";
import { authenticate, requireAdmin } from "./auth";

export const associadasRouter = Router();

// GET /api/associadas
associadasRouter.get("/", async (req, res) => {
  const { 
    page = "1", 
    limit = "20", 
    search = "", 
    ibdp, 
    abep, 
    uf, 
    status_registro,
    orderBy = "nome",
    order = "asc",
    leciona,
    ranking
  } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  const whereOptions: any = {};

  if (leciona === "true") whereOptions.leciona = true;
  if (leciona === "false") whereOptions.leciona = false;
  if (ranking === "true") whereOptions.vinculos_docentes = { some: { integra_ranking_40: true } };
  if (ranking === "false") whereOptions.vinculos_docentes = { none: { integra_ranking_40: true } };

  if (search) {
    whereOptions.OR = [
      { nome: { contains: search as string } },
      { email: { contains: search as string } },
      { atuacao_profissional: { contains: search as string } },
      { producoes: { some: { citacao_completa: { contains: search as string } } } },
      { titulo_mestrado: { contains: search as string } },
      { titulo_doutorado: { contains: search as string } },
      { titulo_livre_docencia: { contains: search as string } },
    ];
  }

  if (ibdp !== undefined && ibdp !== "") whereOptions.ibdp = ibdp === "true";
  if (abep !== undefined && abep !== "") whereOptions.abep = abep === "true";
  if (uf) whereOptions.uf_atuacao = uf;
  if (status_registro) whereOptions.status_registro = status_registro;

  const totalCount = await prisma.associada.count({ where: whereOptions });
  const records = await prisma.associada.findMany({
    where: whereOptions,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    orderBy: { [orderBy as string]: order },
  });

  res.json({
    data: records,
    meta: {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    }
  });
});

associadasRouter.get("/:id", async (req, res) => {
  const record = await prisma.associada.findUnique({
    where: { id: req.params.id },
    include: {
      vinculos_docentes: true,
      notas: {
        include: { autor: { select: { nome: true } } },
        orderBy: { criado_em: 'desc'}
      }
    }
  });
  if (!record) return res.status(404).json({ error: "Not found" });
  res.json(record);
});

associadasRouter.post("/", authenticate, async (req, res) => {
  // Add some simple logic to check duplication on email
  const { vinculos_docentes, ...rest } = req.body;
  let { email } = rest;
  let status_registro = rest.status_registro || "ATIVO";
  
  if (email) {
    const existing = await prisma.associada.findFirst({ where: { email } });
    if (existing) {
      status_registro = "DUPLICADO";
    }
  }

  const record = await prisma.associada.create({
    data: {
      ...rest,
      status_registro,
      vinculos_docentes: vinculos_docentes ? {
        create: vinculos_docentes
      } : undefined
    }
  });

  await prisma.auditLog.create({
    data: {
      acao: "CREATE",
      entidade: "Associada",
      entidadeId: record.id,
      detalhes: JSON.stringify(req.body),
      usuario_id: (req as any).user.id
    }
  });

  res.json(record);
});

associadasRouter.put("/:id", authenticate, requireAdmin, async (req, res) => {
  const { vinculos_docentes, ...rest } = req.body;

  const record = await prisma.associada.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      vinculos_docentes: vinculos_docentes ? {
        deleteMany: {},
        create: vinculos_docentes
      } : undefined
    },
  });

  await prisma.auditLog.create({
    data: {
      acao: "UPDATE",
      entidade: "Associada",
      entidadeId: record.id,
      detalhes: JSON.stringify(req.body),
      usuario_id: (req as any).user.id
    }
  });

  res.json(record);
});

associadasRouter.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  await prisma.associada.delete({ where: { id: req.params.id } });
  
  await prisma.auditLog.create({
    data: {
      acao: "DELETE",
      entidade: "Associada",
      entidadeId: req.params.id,
      usuario_id: (req as any).user.id
    }
  });

  res.json({ success: true });
});
