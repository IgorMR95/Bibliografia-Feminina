/**
 * Edge Function: import-planilha
 *
 * Unico caminho pelo qual a base pode ser substituida por uma planilha.
 * O browser NAO alcanca `substituir_base_completa` diretamente — o EXECUTE
 * dela e' revogado de anon/authenticated. Aqui validamos que quem chama e'
 * um ADMIN de verdade e so entao usamos a service_role.
 *
 * Rotas (via ?action=):
 *   preview   POST multipart  -> le a planilha e devolve o que mudaria (nao escreve)
 *   aplicar   POST multipart  -> substitui a base, guardando snapshot para rollback
 *   historico GET             -> ultimas importacoes
 *   reverter  POST json {id}  -> restaura o snapshot de uma importacao
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { readXlsx } from "./xlsx.ts";
import {
  normalizeAssociadas,
  normalizeProducoes,
  associadasDeOrfas,
  COL,
  PCOL,
} from "./normalize.ts";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // .xlsx e' um zip

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const erro = (msg: string, status = 400) => json({ error: msg }, status);

/**
 * Recusa uma requisicao que ainda tem corpo pendente.
 *
 * Responder sem consumir o upload faz o runtime derrubar a conexao e quem
 * chamou recebe um 503 opaco no lugar do 401/403 — era o que acontecia com
 * uma anotadora tentando substituir a base. Cancelar o stream tambem nao
 * serve: vira RST_STREAM e o cliente leva ECONNRESET em vez da resposta.
 * O jeito de entregar o status correto e' ler o corpo ate o fim e descartar.
 * O tamanho ja foi limitado pelo Content-Length antes de chegar aqui.
 */
async function negar(req: Request, msg: string, status: number) {
  try { if (req.body) await req.arrayBuffer(); } catch { /* corpo ja consumido */ }
  return erro(msg, status);
}

async function sha256(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "preview";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ---------------------------------------------------------------
  // 1. autenticacao: precisa ser um ADMIN
  // ---------------------------------------------------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return negar(req, "Nao autenticado.", 401);

  const asUser = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData?.user) return negar(req, "Sessao invalida ou expirada.", 401);

  const admin = createClient(SUPABASE_URL, SERVICE);

  const { data: perfil } = await admin
    .from("perfis")
    .select("nome, role")
    .eq("id", userData.user.id)
    .single();

  if (!perfil || perfil.role !== "ADMIN") {
    return negar(req, "Apenas administradoras podem substituir a base.", 403);
  }

  try {
    // -------------------------------------------------------------
    // historico
    // -------------------------------------------------------------
    if (action === "historico") {
      const { data, error } = await admin
        .from("importacoes")
        .select("id, usuario_nome, arquivo_nome, arquivo_tamanho, status, relatorio, criado_em, revertida_em, snapshot")
        .order("criado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      // nunca devolve o snapshot inteiro (varios MB), so se ele existe
      const enxuto = (data ?? []).map(({ snapshot, ...r }) => ({
        ...r,
        pode_reverter: snapshot !== null && r.status === "APLICADA",
      }));
      return json({ importacoes: enxuto });
    }

    // -------------------------------------------------------------
    // reverter
    // -------------------------------------------------------------
    if (action === "reverter") {
      const body = await req.json().catch(() => ({}));
      const id = String(body?.id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) return erro("Id de importacao invalido.");

      const { data, error } = await admin.rpc("reverter_importacao", {
        p_id: id,
        p_usuario_id: userData.user.id,
      });
      if (error) throw error;
      return json(data);
    }

    // -------------------------------------------------------------
    // preview / aplicar — ambos precisam do arquivo
    // -------------------------------------------------------------
    if (action !== "preview" && action !== "aplicar") return erro("Acao desconhecida.");
    if (req.method !== "POST") return erro("Use POST.", 405);

    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) {
      return negar(req, `Arquivo acima do limite de ${MAX_BYTES / 1024 / 1024} MB.`, 413);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return erro("Envie a planilha no campo 'file'.");
    if (file.size === 0) return erro("Arquivo vazio.");
    if (file.size > MAX_BYTES) {
      return erro(`Arquivo acima do limite de ${MAX_BYTES / 1024 / 1024} MB.`, 413);
    }
    if (!/\.xlsx$/i.test(file.name)) return erro("Envie um arquivo .xlsx.");

    const buf = await file.arrayBuffer();
    const head = new Uint8Array(buf.slice(0, 4));
    if (!ZIP_MAGIC.every((b, i) => head[i] === b)) {
      return erro("O arquivo nao e' um .xlsx valido.");
    }

    // -------------------------------------------------------------
    // 2. leitura da planilha
    // -------------------------------------------------------------
    let wb;
    try {
      wb = await readXlsx(new Uint8Array(buf));
    } catch (e) {
      return erro(
        `Nao consegui abrir a planilha (${e instanceof Error ? e.message : "erro"}). ` +
          `Ela esta corrompida ou protegida por senha?`
      );
    }

    if (wb.sheets.length < 2) {
      return erro("A planilha precisa de pelo menos 2 abas: dados das processualistas e bibliografia.");
    }

    const rows1 = wb.sheets[0].rows;
    const rows2 = wb.sheets[1].rows;

    if (rows1.length === 0) return erro("A primeira aba esta vazia.");

    // confere se as colunas essenciais existem — evita importar a planilha errada
    const head1 = Object.keys(rows1[0] as object);
    const faltando: string[] = [];
    if (!head1.includes(COL.nome)) faltando.push(`Aba 1: "${COL.nome}"`);
    if (rows2.length > 0) {
      const head2 = Object.keys(rows2[0] as object);
      if (!head2.includes(PCOL.nome)) faltando.push(`Aba 2: "${PCOL.nome}"`);
      if (!head2.includes(PCOL.citacao)) faltando.push(`Aba 2: "${PCOL.citacao}"`);
    }
    if (faltando.length) {
      return erro(
        `A planilha nao tem o formato esperado. Colunas faltando -> ${faltando.join("; ")}. ` +
          `Confira se enviou o arquivo certo.`
      );
    }

    // -------------------------------------------------------------
    // 3. normalizacao
    // -------------------------------------------------------------
    const { associadas, erros } = normalizeAssociadas(rows1 as Record<string, unknown>[]);
    if (associadas.length === 0) {
      return erro("Nenhuma processualista valida encontrada na primeira aba.");
    }

    const { producoes, orfas, descartadas } = normalizeProducoes(
      rows2 as Record<string, unknown>[],
      associadas
    );

    // quem so aparece na aba de bibliografia entra como INCOMPLETO,
    // para nao perder a producao nem inventar dado
    const todas = [...associadas, ...associadasDeOrfas(orfas)];

    const hashBase = await sha256(buf);
    const forcar = form.get("confirmar_reducao") === "true";

    // -------------------------------------------------------------
    // 4. delega a decisao final ao banco (transacional)
    // -------------------------------------------------------------
    const { data, error } = await admin.rpc("substituir_base_completa", {
      p_associadas: todas,
      p_producoes: producoes,
      p_dry_run: action === "preview",
      p_arquivo_nome: file.name,
      p_arquivo_tamanho: file.size,
      p_arquivo_hash: forcar ? `FORCE:${hashBase}` : hashBase,
      p_usuario_id: userData.user.id,
      p_usuario_nome: perfil.nome,
    });

    if (error) return erro(error.message, 400);

    return json({
      ...data,
      leitura: {
        arquivo: file.name,
        abas: wb.sheetNames,
        linhas_aba1: rows1.length,
        linhas_aba2: rows2.length,
        // vazias descartadas na leitura do arquivo + as sem nome/citacao
        linhas_bibliografia_descartadas:
          (wb.sheets[1].totalLinhas - rows2.length) + descartadas,
        processualistas_validas: associadas.length,
        criadas_a_partir_da_bibliografia: orfas.length,
        producoes_lidas: producoes.length,
        avisos: erros,
      },
    });
  } catch (e) {
    console.error("import-planilha:", e);
    return erro(e instanceof Error ? e.message : "Erro inesperado ao processar a planilha.", 500);
  }
});
