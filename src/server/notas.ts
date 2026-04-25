import { Router } from "express";
import { prisma } from "./db";
import { authenticate } from "./auth";

export const notasRouter = Router();

notasRouter.get("/:associada_id", authenticate, async (req, res) => {
  const notas = await prisma.nota.findMany({
    where: { associada_id: req.params.associada_id },
    include: { autor: { select: { nome: true } } },
    orderBy: { criado_em: "desc" }
  });
  res.json(notas);
});

notasRouter.post("/", authenticate, async (req, res) => {
  const { associada_id, texto } = req.body;
  const autor_id = (req as any).user.id;

  const nota = await prisma.nota.create({
    data: {
      texto,
      associada_id,
      autor_id
    },
    include: {
      autor: { select: { nome: true } }
    }
  });

  res.json(nota);
});
