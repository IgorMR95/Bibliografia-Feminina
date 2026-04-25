import { Router } from "express";
import { prisma } from "./db";
import { authenticate, requireAdmin } from "./auth";
import bcrypt from "bcryptjs";

export const usuariosRouter = Router();

usuariosRouter.get("/", authenticate, requireAdmin, async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nome: true, email: true, role: true, criado_em: true }
  });
  res.json(usuarios);
});

usuariosRouter.post("/", authenticate, requireAdmin, async (req, res) => {
  const { nome, email, senha, role } = req.body;
  const senha_hash = await bcrypt.hash(senha, 10);
  const user = await prisma.usuario.create({
    data: { nome, email, senha_hash, role }
  });
  res.json({ id: user.id, email: user.email });
});

usuariosRouter.put("/:id", authenticate, requireAdmin, async (req, res) => {
  const { nome, email, role, senha } = req.body;
  const data: any = { nome, email, role };
  if (senha) {
    data.senha_hash = await bcrypt.hash(senha, 10);
  }
  const user = await prisma.usuario.update({
    where: { id: req.params.id },
    data
  });
  res.json({ id: user.id, email: user.email });
});

usuariosRouter.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  await prisma.usuario.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});
