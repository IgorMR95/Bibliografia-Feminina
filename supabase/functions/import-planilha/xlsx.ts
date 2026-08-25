/**
 * Leitor minimo de .xlsx, sem dependencias externas.
 *
 * Por que nao usar a lib `xlsx` do npm: a ultima versao publicada la
 * (0.18.5) carrega CVE-2023-30533 (prototype pollution) e CVE-2024-22363
 * (ReDoS), e as versoes corrigidas so existem no cdn.sheetjs.com, que o
 * bundler das Edge Functions recusa. Como esta funcao roda no caminho que
 * substitui a base inteira, preferimos ler o arquivo nos mesmos termos em
 * que ele e' especificado: um ZIP com alguns XML dentro.
 *
 * Suporta o que a planilha BPF usa: entradas STORED (0) e DEFLATE (8),
 * sharedStrings, celulas de texto/numero/inline e datas como serial.
 */

// ----------------------------------------------------------------- zip

interface ZipEntry {
  name: string;
  method: number;
  offset: number;
  compressedSize: number;
  uncompressedSize: number;
}

const u16 = (d: DataView, o: number) => d.getUint16(o, true);
const u32 = (d: DataView, o: number) => d.getUint32(o, true);

function readCentralDirectory(buf: Uint8Array): ZipEntry[] {
  const d = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // End of Central Directory: assinatura 0x06054b50, procurada de tras pra frente
  let eocd = -1;
  const min = Math.max(0, buf.length - 66_000);
  for (let i = buf.length - 22; i >= min; i--) {
    if (u32(d, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Arquivo nao e' um ZIP valido (EOCD nao encontrado).");

  const count = u16(d, eocd + 10);
  let p = u32(d, eocd + 16);

  const out: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (u32(d, p) !== 0x02014b50) break;
    const method = u16(d, p + 10);
    const compressedSize = u32(d, p + 20);
    const uncompressedSize = u32(d, p + 24);
    const nameLen = u16(d, p + 28);
    const extraLen = u16(d, p + 30);
    const commentLen = u16(d, p + 32);
    const offset = u32(d, p + 42);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
    out.push({ name, method, offset, compressedSize, uncompressedSize });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data]).stream().pipeThrough(ds);
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

async function readEntry(buf: Uint8Array, e: ZipEntry): Promise<string> {
  const d = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (u32(d, e.offset) !== 0x04034b50) throw new Error(`Entrada ZIP corrompida: ${e.name}`);
  const nameLen = u16(d, e.offset + 26);
  const extraLen = u16(d, e.offset + 28);
  const start = e.offset + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + e.compressedSize);

  const bytes = e.method === 0 ? raw : e.method === 8 ? await inflate(raw) : null;
  if (!bytes) throw new Error(`Compressao ZIP nao suportada (metodo ${e.method}) em ${e.name}`);
  return new TextDecoder("utf-8").decode(bytes);
}

// ----------------------------------------------------------------- xml

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&"); // por ultimo, senao desfaz os anteriores
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    let txt = "";
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let t: RegExpExecArray | null;
    while ((t = tRe.exec(m[1]))) txt += decodeEntities(t[1]);
    out.push(txt);
  }
  return out;
}

function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * Celulas vazias vem auto-fechadas (<c r="D3" s="25"/>). Se os atributos
 * forem capturados de forma gulosa, a barra do fechamento e' consumida e a
 * celula "engole" as seguintes, deslocando as colunas — foi exatamente o que
 * corrompeu a primeira leitura desta planilha. Dai o `[^>]*?` nao-guloso.
 */
function parseSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  const rowRe = /<row[^>]*?>([\s\S]*?)<\/row>/g;
  let r: RegExpExecArray | null;

  while ((r = rowRe.exec(xml))) {
    const cells: string[] = [];
    const cRe = /<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let c: RegExpExecArray | null;

    while ((c = cRe.exec(r[1]))) {
      const attrs = c[1] ?? "";
      const inner = c[2] ?? "";
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
      if (!ref) continue;
      const idx = colIndex(ref);
      const type = attrs.match(/t="([^"]+)"/)?.[1] ?? "n";

      let val = "";
      if (type === "s") {
        const v = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (v) val = shared[+v[1]] ?? "";
      } else if (type === "inlineStr") {
        let txt = "";
        const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
        let t: RegExpExecArray | null;
        while ((t = tRe.exec(inner))) txt += decodeEntities(t[1]);
        val = txt;
      } else {
        const v = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (v) val = decodeEntities(v[1]);
      }
      cells[idx] = val;
    }
    rows.push(cells);
  }
  return rows;
}

// --------------------------------------------------------------- api

export interface Sheet {
  name: string;
  rows: Record<string, string>[];
  /** linhas de dados antes de descartar as inteiramente vazias */
  totalLinhas: number;
}

export interface Workbook {
  sheetNames: string[];
  sheets: Sheet[];
}

/** Le o .xlsx e devolve cada aba como lista de objetos {cabecalho: valor}. */
export async function readXlsx(data: Uint8Array, maxSheets = 3): Promise<Workbook> {
  const entries = readCentralDirectory(data);
  const byName = new Map(entries.map((e) => [e.name, e]));

  const wbEntry = byName.get("xl/workbook.xml");
  if (!wbEntry) throw new Error("Nao encontrei xl/workbook.xml — o arquivo e' mesmo um .xlsx?");
  const wbXml = await readEntry(data, wbEntry);

  // nome e rId de cada aba, na ordem em que aparecem
  const sheetDefs: { name: string; rid: string }[] = [];
  const sRe = /<sheet[^>]*?name="([^"]*)"[^>]*?r:id="([^"]*)"[^>]*?\/?>/g;
  let sm: RegExpExecArray | null;
  while ((sm = sRe.exec(wbXml))) sheetDefs.push({ name: decodeEntities(sm[1]), rid: sm[2] });

  // rId -> caminho do arquivo da aba
  const relsEntry = byName.get("xl/_rels/workbook.xml.rels");
  const relMap = new Map<string, string>();
  if (relsEntry) {
    const relsXml = await readEntry(data, relsEntry);
    const rRe = /<Relationship[^>]*?Id="([^"]*)"[^>]*?Target="([^"]*)"[^>]*?\/?>/g;
    let rm: RegExpExecArray | null;
    while ((rm = rRe.exec(relsXml))) {
      const target = rm[2].replace(/^\/?xl\//, "").replace(/^\//, "");
      relMap.set(rm[1], `xl/${target}`);
    }
  }

  const ssEntry = byName.get("xl/sharedStrings.xml");
  const shared = ssEntry ? parseSharedStrings(await readEntry(data, ssEntry)) : [];

  const sheets: Sheet[] = [];
  for (const def of sheetDefs.slice(0, maxSheets)) {
    const path = relMap.get(def.rid) ?? `xl/worksheets/sheet${sheets.length + 1}.xml`;
    const entry = byName.get(path);
    if (!entry) continue;

    const grid = parseSheet(await readEntry(data, entry), shared);
    if (grid.length === 0) { sheets.push({ name: def.name, rows: [], totalLinhas: 0 }); continue; }

    const header = grid[0];
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < grid.length; i++) {
      const o: Record<string, string> = {};
      let vazia = true;
      for (let j = 0; j < header.length; j++) {
        const h = header[j];
        if (!h) continue;
        const v = grid[i][j] ?? "";
        o[h] = v;
        if (v !== "") vazia = false;
      }
      if (!vazia) rows.push(o);
    }
    sheets.push({ name: def.name, rows, totalLinhas: grid.length - 1 });
  }

  return { sheetNames: sheetDefs.map((d) => d.name), sheets };
}
