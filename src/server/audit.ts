import { Router } from "express";
import { prisma } from "./db";
import { authenticate, requireAdmin } from "./auth";

export const auditRouter = Router();

// GET /api/audit
auditRouter.get("/", authenticate, requireAdmin, async (req, res) => {
  const { limit = "50" } = req.query;
  const limitNum = parseInt(limit as string, 10);

  const logs = await prisma.auditLog.findMany({
    orderBy: { criado_em: 'desc' },
    take: limitNum,
    include: {
      usuario: { select: { nome: true, email: true } }
    }
  });

  res.json(logs);
});
