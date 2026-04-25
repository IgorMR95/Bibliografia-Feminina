import { Router } from "express";
import { authRouter } from "./auth";
import { associadasRouter } from "./associadas";
import { importacaoRouter } from "./importacao";
import { notasRouter } from "./notas";
import { dashboardRouter } from "./dashboard";
import { usuariosRouter } from "./usuarios";
import { auditRouter } from "./audit";
import { dynamicRouter } from "./dynamic";
import { producaoRouter } from "./producao";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/associadas", associadasRouter);
apiRouter.use("/importacao", importacaoRouter);
apiRouter.use("/notas", notasRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/usuarios", usuariosRouter);
apiRouter.use("/audit", auditRouter);
apiRouter.use("/dynamic", dynamicRouter);
apiRouter.use("/producao", producaoRouter);
