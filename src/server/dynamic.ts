import { Router } from "express";
import { prisma } from "./db";
import { authenticate, requireAdmin } from "./auth";

export const dynamicRouter = Router();

// ========================
// CAMPOS EXTRAS (ASSOCIADA)
// ========================

// List custom extra fields defined for a specific entity
dynamicRouter.get("/campos-extras", authenticate, async (req, res) => {
  const { entidade = "Associada" } = req.query;
  const records = await prisma.definicaoCampoExtra.findMany({
    where: { entidade: String(entidade) },
    orderBy: { criado_em: "asc" }
  });
  res.json(records);
});

// Create a new custom extra field
dynamicRouter.post("/campos-extras", authenticate, requireAdmin, async (req, res) => {
  try {
    const record = await prisma.definicaoCampoExtra.create({
      data: req.body
    });
    
    await prisma.auditLog.create({
      data: {
        acao: "CREATE",
        entidade: "DefinicaoCampoExtra",
        entidadeId: record.id,
        detalhes: JSON.stringify(record),
        usuario_id: (req as any).user.id
      }
    });

    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to create extra field." });
  }
});

// Delete a custom extra field
dynamicRouter.delete("/campos-extras/:id", authenticate, requireAdmin, async (req, res) => {
  await prisma.definicaoCampoExtra.delete({ where: { id: req.params.id }});
  res.json({ success: true });
});

// ========================
// TABELAS CUSTOMIZADAS
// ========================

// List custom tables definitions
dynamicRouter.get("/tabelas", authenticate, async (req, res) => {
  const records = await prisma.definicaoTabela.findMany({
    orderBy: { criado_em: "desc" }
  });
  res.json(records);
});

// Create a new custom table definition
dynamicRouter.post("/tabelas", authenticate, requireAdmin, async (req, res) => {
  try {
    const record = await prisma.definicaoTabela.create({
      data: req.body
    });

    await prisma.auditLog.create({
      data: {
        acao: "CREATE",
        entidade: "DefinicaoTabela",
        entidadeId: record.id,
        detalhes: JSON.stringify(record),
        usuario_id: (req as any).user.id
      }
    });
    
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to create custom table." });
  }
});

// Delete a custom table
dynamicRouter.delete("/tabelas/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    // Delete all records inside it first
    await prisma.registroDinamico.deleteMany({ where: { tabela_id: req.params.id } });
    await prisma.definicaoTabela.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Failed to delete table." });
  }
});

// ========================
// REGISTROS DINÂMICOS DA TABELA
// ========================

// GET records for a specific table
dynamicRouter.get("/tabelas/:tabela_id/registros", authenticate, async (req, res) => {
  const records = await prisma.registroDinamico.findMany({
    where: { tabela_id: req.params.tabela_id },
    orderBy: { criado_em: "desc" }
  });
  res.json(records);
});

// POST new record for a table
dynamicRouter.post("/tabelas/:tabela_id/registros", authenticate, async (req, res) => {
  const { tabela_id } = req.params;
  const { dados } = req.body;
  try {
    const record = await prisma.registroDinamico.create({
      data: {
        tabela_id,
        dados: typeof dados === 'string' ? dados : JSON.stringify(dados),
      }
    });

    await prisma.auditLog.create({
      data: {
        acao: "CREATE",
        entidade: "RegistroDinamico",
        entidadeId: record.id,
        detalhes: JSON.stringify(req.body),
        usuario_id: (req as any).user.id
      }
    });

    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to insert dynamic record" });
  }
});
