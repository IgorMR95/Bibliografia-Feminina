import { Router } from "express";
import { prisma } from "./db";
import { authenticate, requireAdmin } from "./auth";

export const producaoRouter = Router();

// List all productions (with filters) - PUBLIC
producaoRouter.get("/", async (req, res) => {
  const { associada_id, tipo, area } = req.query;
  const where: any = {};
  if (associada_id) where.associada_id = String(associada_id);
  if (tipo) where.tipo_obra = String(tipo);
  if (area) where.area_processo = String(area);

  const records = await prisma.producaoBibliografica.findMany({
    where,
    include: { associada: { select: { nome: true } } },
    orderBy: { criado_em: "desc" }
  });
  res.json(records);
});

// Create new production
producaoRouter.post("/", authenticate, async (req, res) => {
  try {
    const { associada_id, tipo_obra, citacao_completa, ano_publicacao, area_processo, formato, acesso_eletronica, localizacao, link_acesso } = req.body;
    
    const record = await prisma.producaoBibliografica.create({
      data: {
        associada_id,
        tipo_obra,
        citacao_completa,
        ano_publicacao,
        area_processo,
        formato,
        acesso_eletronica,
        localizacao,
        link_acesso
      }
    });

    await prisma.auditLog.create({
      data: {
        acao: "CREATE",
        entidade: "ProducaoBibliografica",
        entidadeId: record.id,
        detalhes: JSON.stringify(record),
        usuario_id: (req as any).user.id
      }
    });

    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Erro ao criar produção bibliográfica" });
  }
});

// Update production - ADMIN ONLY
producaoRouter.put("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const record = await prisma.producaoBibliografica.update({
      where: { id: req.params.id },
      data: req.body
    });

    await prisma.auditLog.create({
      data: {
        acao: "UPDATE",
        entidade: "ProducaoBibliografica",
        entidadeId: record.id,
        detalhes: JSON.stringify(req.body),
        usuario_id: (req as any).user.id
      }
    });

    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Erro ao atualizar produção" });
  }
});

// Delete production - ADMIN ONLY
producaoRouter.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.producaoBibliografica.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Erro ao deletar produção" });
  }
});
