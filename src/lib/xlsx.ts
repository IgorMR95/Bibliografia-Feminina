/**
 * Escrita de .xlsx no navegador, sem dependência.
 *
 * Existe porque a exportação da base precisava da lib `xlsx` do npm, que
 * parou na 0.18.5 — versão com CVE-2023-30533 e CVE-2024-22363. Os dois
 * furos são na LEITURA de arquivo vindo de fora, e aqui só se escreve;
 * ainda assim, carregar 400 KB de biblioteca vulnerável no bundle público
 * para montar uma planilha de três abas não se paga.
 *
 * Um .xlsx é um zip de XMLs. É isso que este módulo faz e nada mais: não
 * lê planilha (quem lê é a Edge Function, com o parser dela) nem escreve
 * fórmula, número ou data — tudo sai como texto, que é o que a base tem.
 *
 * O gerador do arquivo-modelo, scripts/gerar-modelo.mjs, faz a mesma
 * coisa em Node (com zlib em vez de CompressionStream). Mudou a estrutura
 * de uma parte aqui, confira lá.
 */

export interface Aba {
  nome: string;
  /** primeira linha, em negrito e congelada */
  colunas: string[];
  linhas: (string | number | null | undefined)[][];
}

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // controles não são válidos em XML 1.0 e quebram o arquivo inteiro
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");

const letraColuna = (n: number) => {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) {
    s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  }
  return s;
};

const linhaXml = (valores: unknown[], numero: number, cabecalho = false) => {
  const celulas = valores
    .map((v, i) => {
      const texto = v === null || v === undefined ? "" : String(v);
      if (texto === "") return "";
      return `<c r="${letraColuna(i + 1)}${numero}" t="inlineStr"${cabecalho ? ' s="1"' : ""}>` +
        `<is><t xml:space="preserve">${esc(texto)}</t></is></c>`;
    })
    .join("");
  return `<row r="${numero}">${celulas}</row>`;
};

const folhaXml = (aba: Aba) => {
  const larguras = aba.colunas
    .map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, Math.max(12, h.length + 4))}" customWidth="1"/>`)
    .join("");
  const corpo = [
    linhaXml(aba.colunas, 1, true),
    ...aba.linhas.map((l, i) => linhaXml(l, i + 2)),
  ].join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${larguras}</cols>
<sheetData>${corpo}</sheetData>
</worksheet>`;
};

/** o nome da aba no Excel não aceita estes caracteres, nem passa de 31 */
const nomeDeAba = (n: string) => n.replace(/[\\/?*[\]:]/g, "-").slice(0, 31) || "Planilha";

// ------------------------------------------------------------------- zip
const TABELA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf: Uint8Array) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABELA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

/**
 * Comprime com a API do navegador. Onde ela não existir, o arquivo vai
 * sem compressão — maior, e válido do mesmo jeito (método 0 do zip).
 */
async function comprimir(dados: Uint8Array): Promise<{ bytes: Uint8Array; metodo: 0 | 8 }> {
  if (typeof CompressionStream === "undefined") return { bytes: dados, metodo: 0 };
  try {
    const fluxo = new Blob([dados as BlobPart]).stream()
      .pipeThrough(new CompressionStream("deflate-raw"));
    const bytes = new Uint8Array(await new Response(fluxo).arrayBuffer());
    return { bytes, metodo: 8 };
  } catch {
    return { bytes: dados, metodo: 0 };
  }
}

async function zipar(entradas: Record<string, string>): Promise<Blob> {
  const codificador = new TextEncoder();
  const locais: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  let total = 0;

  for (const [nome, texto] of Object.entries(entradas)) {
    const cru = codificador.encode(texto);
    const { bytes, metodo } = await comprimir(cru);
    const nomeBytes = codificador.encode(nome);
    const crc = crc32(cru);

    const cabecalho = new DataView(new ArrayBuffer(30));
    cabecalho.setUint32(0, 0x04034b50, true);  // assinatura local
    cabecalho.setUint16(4, 20, true);          // versão necessária
    cabecalho.setUint16(6, 0x0800, true);      // flag: nome em UTF-8
    cabecalho.setUint16(8, metodo, true);
    cabecalho.setUint32(10, 0, true);          // data/hora zeradas
    cabecalho.setUint32(14, crc, true);
    cabecalho.setUint32(18, bytes.length, true);
    cabecalho.setUint32(22, cru.length, true);
    cabecalho.setUint16(26, nomeBytes.length, true);
    cabecalho.setUint16(28, 0, true);
    locais.push(new Uint8Array(cabecalho.buffer), nomeBytes, bytes);

    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true); dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true); dir.setUint16(10, metodo, true);
    dir.setUint32(12, 0, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, bytes.length, true);
    dir.setUint32(24, cru.length, true);
    dir.setUint16(28, nomeBytes.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), nomeBytes);

    offset += 30 + nomeBytes.length + bytes.length;
    total++;
  }

  const tamanhoCentral = central.reduce((s, p) => s + p.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, total, true);
  fim.setUint16(10, total, true);
  fim.setUint32(12, tamanhoCentral, true);
  fim.setUint32(16, offset, true);

  return new Blob(
    [...locais, ...central, new Uint8Array(fim.buffer)] as BlobPart[],
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
  );
}

// --------------------------------------------------------------- arquivo
export async function montarXlsx(abas: Aba[]): Promise<Blob> {
  const usadas = abas.map((a, i) => ({ ...a, nome: nomeDeAba(a.nome || `Planilha${i + 1}`) }));

  const partes: Record<string, string> = {
    "[Content_Types].xml":
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      usadas.map((_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      `</Types>`,

    "_rels/.rels":
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`,

    "xl/workbook.xml":
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
      usadas.map((a, i) => `<sheet name="${esc(a.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
      `</sheets></workbook>`,

    "xl/_rels/workbook.xml.rels":
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      usadas.map((_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
      `<Relationship Id="rId${usadas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `</Relationships>`,

    "xl/styles.xml":
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
      `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
      `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
      `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
      `</styleSheet>`,
  };

  usadas.forEach((aba, i) => { partes[`xl/worksheets/sheet${i + 1}.xml`] = folhaXml(aba); });

  return zipar(partes);
}

/** Monta o arquivo e entrega ao navegador para download. */
export async function baixarXlsx(nomeArquivo: string, abas: Aba[]) {
  const blob = await montarXlsx(abas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // sem revogar, o blob fica na memória da aba até recarregarem a página
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Mesma tabela, em CSV.
 *
 * O BOM no começo não é enfeite: sem ele o Excel lê o arquivo como
 * ANSI e "Gonçalves" abre como "GonÃ§alves".
 */
export function baixarCsv(nomeArquivo: string, aba: Pick<Aba, "colunas" | "linhas">) {
  const campo = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const texto = [aba.colunas, ...aba.linhas]
    .map((l) => l.map(campo).join(","))
    .join("\r\n");

  const blob = new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Converte registros do banco em linhas, usando a união das chaves como
 * cabeçalho. Objeto e array viram JSON: é o que a exportação sempre fez,
 * e o que reimporta sem perder informação.
 */
export function deRegistros(registros: Record<string, any>[]): Pick<Aba, "colunas" | "linhas"> {
  const colunas: string[] = [];
  for (const r of registros) {
    for (const k of Object.keys(r)) if (!colunas.includes(k)) colunas.push(k);
  }
  const linhas = registros.map((r) =>
    colunas.map((c) => {
      const v = r[c];
      if (v === null || v === undefined) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v);
    })
  );
  return { colunas, linhas };
}
