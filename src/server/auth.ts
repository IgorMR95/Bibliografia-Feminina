import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./db";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me-in-production";

// Middleware to extract and verify JWT
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Requires administrator role" });
  }
  next();
};

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  if (!user.senha_hash) {
     return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.senha_hash);
  if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "10h" });
  res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role } });
});

authRouter.get("/me", authenticate, async (req, res) => {
  const userId = (req as any).user.id;
  const user = await prisma.usuario.findUnique({ where: { id: userId }, select: { id: true, nome: true, email: true, role: true } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

authRouter.post("/logout", (req, res) => {
  res.json({ message: "Logged out" });
});
