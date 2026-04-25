import { Router } from "express";
import multer from "multer";
import * as xlsx from "xlsx";
import { prisma } from "./db";
import { authenticate } from "./auth";

const upload = multer({ storage: multer.memoryStorage() });

export const importacaoRouter = Router();

const normalizeString = (str: any) => {
  if (typeof str !== "string") return null;
  const val = str.trim();
  return val === "" ? null : val;
};

const normalizeBoolean = (val: any) => {
  if (typeof val === "boolean") return val;
  const str = normalizeString(val)?.toLowerCase();
  return str === "sim" || str === "x" || str === "true" || str === "1";
};

function normalizeHeaders(row: any[]): string[] {
  return row.map(cell => {
    const s = normalizeString(cell);
    return s ? s.toLowerCase().replace(/[\s\W_]+/g, "") : "";
  });
}

function findHeaderRowIndex(sheet: xlsx.WorkSheet): { rowIndex: number, headers: string[] } | null {
  const json = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });
  // find first row with a column called 'nome' or 'email' or 'id'
  for (let i = 0; i < json.length; i++) {
    const row = json[i];
    if (Array.isArray(row) && row.length > 0) {
      const normalized = normalizeHeaders(row);
      if (normalized.some(h => h.includes("nome") || h.includes("email"))) {
        return { rowIndex: i, headers: row };
      }
    }
  }
  return null;
}

importacaoRouter.post("/excel", authenticate, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });

    const sheet1Info = findHeaderRowIndex(workbook.Sheets[workbook.SheetNames[0]]);
    const sheet2Name = workbook.SheetNames.find(n => n.toLowerCase().includes("produ") || n.toLowerCase().includes("aba 2"));
    const sheet2 = sheet2Name ? workbook.Sheets[sheet2Name] : null;
    const sheet2Info = sheet2 ? findHeaderRowIndex(sheet2) : null;

    if (!sheet1Info && !sheet2Info) {
      return res.status(400).json({ error: "Could not detect valid headers in any sheet." });
    }

    // Process Sheet 1 (Processualistas)
    const validAssociadas: any[] = [];
    if (sheet1Info) {
        const { rowIndex, headers: rawHeaders } = sheet1Info;
        const jsonRows = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1, range: rowIndex + 1, defval: null });
        const normalizedHeaders = normalizeHeaders(rawHeaders);
        const getColIndex = (keywords: string[]) => normalizedHeaders.findIndex(h => keywords.some(k => h.includes(k)));

        const idxNome = getColIndex(["nome"]);
        const idxEmail = getColIndex(["email", "mail"]);
        const idxIbdp = getColIndex(["ibdp"]);
        const idxAbep = getColIndex(["abep"]);
        const idxLattes = getColIndex(["lattes"]);
        const idxAtuacao = getColIndex(["atuacao"]);
        const idxUf = getColIndex(["uf", "estado"]);
        
        const idxLeciona = getColIndex(["leciona"]);
        const idxGrad = getColIndex(["lecionagraduacao", "graduacao"]);
        const idxUniGrad = getColIndex(["universidadegraduacao", "unigrad"]);
        const idxPos = getColIndex(["lecionapos", "posgraduacao"]);
        const idxUniPos = getColIndex(["universidadepos", "unipos"]);
        const idxRanking = getColIndex(["ranking", "integra"]);
        const idxUniRanking = getColIndex(["universidaderanking", "uniranking"]);

        for (const row of jsonRows) {
            if (!Array.isArray(row) || row.length === 0 || row.every(c => c === null || c === "")) continue;
            const nome = normalizeString(idxNome !== -1 ? row[idxNome] : null);
            if (!nome) continue;

            const uGrad = normalizeString(idxUniGrad !== -1 ? row[idxUniGrad] : null);
            const uPos = normalizeString(idxUniPos !== -1 ? row[idxUniPos] : null);
            
            const vinculos: any[] = [];
            if (uGrad) {
              uGrad.split(/[;|,]/).forEach(inst => {
                const name = inst.trim();
                if (name) vinculos.push({ tipo: "GRADUACAO", instituicao: name, integra_ranking_40: normalizeBoolean(idxRanking !== -1 ? row[idxRanking] : false) });
              });
            }
            if (uPos) {
              uPos.split(/[;|,]/).forEach(inst => {
                const name = inst.trim();
                if (name) vinculos.push({ tipo: "POS", instituicao: name, integra_ranking_40: normalizeBoolean(idxRanking !== -1 ? row[idxRanking] : false) });
              });
            }

            validAssociadas.push({
                nome,
                email: normalizeString(idxEmail !== -1 ? row[idxEmail] : null),
                ibdp: normalizeBoolean(idxIbdp !== -1 ? row[idxIbdp] : false),
                abep: normalizeBoolean(idxAbep !== -1 ? row[idxAbep] : false),
                link_lattes: normalizeString(idxLattes !== -1 ? row[idxLattes] : null),
                atuacao_profissional: normalizeString(idxAtuacao !== -1 ? row[idxAtuacao] : null),
                uf_atuacao: normalizeString(idxUf !== -1 ? row[idxUf] : null),
                leciona: normalizeBoolean(idxLeciona !== -1 ? row[idxLeciona] : vinculos.length > 0),
                vinculos_docentes: vinculos,
                status_registro: 'ATIVO'
            });
        }
    }

    // Process Sheet 2 (Produção)
    const validProducoes: any[] = [];
    if (sheet2 && sheet2Info) {
        const { rowIndex, headers: rawHeaders } = sheet2Info;
        const jsonRows = xlsx.utils.sheet_to_json<any[]>(sheet2, { header: 1, range: rowIndex + 1, defval: null });
        const normalizedHeaders = normalizeHeaders(rawHeaders);
        const getColIndex = (keywords: string[]) => normalizedHeaders.findIndex(h => keywords.some(k => h.includes(k)));

        const idxNome = getColIndex(["nome", "processualista"]);
        const idxTipo = getColIndex(["tipo", "obra"]);
        const idxCitacao = getColIndex(["citacao", "completa"]);
        const idxAno = getColIndex(["ano", "publicacao"]);
        const idxArea = getColIndex(["area", "processo"]);

        for (const row of jsonRows) {
            if (!Array.isArray(row) || row.length === 0 || row.every(c => c === null || c === "")) continue;
            const nome = normalizeString(idxNome !== -1 ? row[idxNome] : null);
            const citacao = normalizeString(idxCitacao !== -1 ? row[idxCitacao] : null);
            if (!nome || !citacao) continue;
            validProducoes.push({
                nome_processualista: nome, // temporary for linking
                tipo_obra: normalizeString(idxTipo !== -1 ? row[idxTipo] : "Artigo"),
                citacao_completa: citacao,
                ano_publicacao: parseInt(String(idxAno !== -1 ? row[idxAno] : 2024)) || 2024,
                area_processo: normalizeString(idxArea !== -1 ? row[idxArea] : "Outros"),
            });
        }
    }

    if (req.body.preview === "true") {
      return res.json({
        associadas_count: validAssociadas.length,
        producoes_count: validProducoes.length,
        preview_associadas: validAssociadas.slice(0, 5),
        preview_producoes: validProducoes.slice(0, 5),
      });
    }

    let createdAssociadas = 0;
    let createdProducoes = 0;
    let duplicates = 0;

    // 1. Import Associadas
    const nameToIdMap = new Map<string, string>();
    for (const record of validAssociadas) {
        const existing = await prisma.associada.findFirst({
            where: { OR: [ { email: record.email || "---" }, { nome: record.nome } ] }
        });
        if (existing) {
            nameToIdMap.set(record.nome.toLowerCase(), existing.id);
            duplicates++;
            continue;
        }
        const created = await prisma.associada.create({ 
            data: {
                ...record,
                vinculos_docentes: record.vinculos_docentes ? {
                    create: record.vinculos_docentes
                } : undefined
            } 
        });
        nameToIdMap.set(record.nome.toLowerCase(), created.id);
        createdAssociadas++;
    }

    // 2. Import Produção (Try to link to existing or newly created associada)
    for (const prod of validProducoes) {
        const associadaId = nameToIdMap.get(prod.nome_processualista.toLowerCase());
        if (!associadaId) continue; // Skip if no linking possible
        
        const { nome_processualista, ...data } = prod;
        await prisma.producaoBibliografica.create({
            data: { ...data, associada_id: associadaId }
        });
        createdProducoes++;
    }

    res.json({
      success_associadas: createdAssociadas,
      success_producoes: createdProducoes,
      duplicates_skipped: duplicates,
    });
});
