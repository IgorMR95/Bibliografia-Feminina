/**
 * Gera public/modelo-planilha-bpf.xlsx — o arquivo que a tela de
 * alimentação em lote oferece para download.
 *
 * Escreve o .xlsx na unha (zip + XML) em vez de usar a lib `xlsx` do npm:
 * ela parou na 0.18.5, que tem CVE-2023-30533 e CVE-2024-22363, e não vale
 * uma dependência vulnerável para produzir um arquivo de duas abas.
 *
 * Os nomes das colunas precisam bater EXATAMENTE com os de
 * supabase/functions/import-planilha/normalize.ts (COL e PCOL) — é por eles
 * que a importação encontra cada campo. Mudou lá, mude aqui e rode
 * `node scripts/gerar-modelo.mjs`.
 */
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

// ---------------------------------------------------------------- colunas
const ABA1 = [
  "Nome da Processualista",
  "E-mail da Processualista",
  "UF da atuação principal",
  "Qual a atuação profissional?",
  "É associada do IBDP?",
  "É associada da ABEP?",
  "Integra Ranking 40+Universidades?",
  "Se sim, qual Universidade integra?",
  "Link do currículo Lattes",
  "Data da última atualização do Lattes",
  "É especialista (lato sensu)?",
  "É mestre?",
  "Título da Dissertação de Mestrado",
  "Ano de publicação da dissertação de Mestrado",
  "Faculdade em que defendeu Mestrado",
  "Área em que defendeu Mestrado",
  "Link de acesso ao trabalho (Mestrado)",
  "É doutora?",
  "Título da Tese de Doutorado",
  "Ano de publicação da tese de Doutorado",
  "Faculdade em que defendeu o Doutorado",
  "Área em que defendeu o Doutorado",
  "Link de acesso ao trabalho (Doutorado)",
  "É livre-docente?",
  "Título da Tese de Livre-Docência",
  "Ano de publicação da Tese de Livre-Docência",
  "Faculdade em que defendeu a Livre-Docência",
  "Área em que defendeu a Livre-Docência",
  "Link de acesso ao trabalho (Livre-Docência)",
];

const EXEMPLO1 = [
  "Maria Aparecida de Souza",
  "maria.souza@exemplo.br",
  "SP",
  "Docência e Advocacia",
  "Sim",
  "Não",
  "Sim",
  "Universidade de São Paulo",
  "http://lattes.cnpq.br/0000000000000000",
  "2025-03-14",
  "Sim",
  "Sim",
  "A tutela provisória e o contraditório",
  "2012",
  "Universidade de São Paulo",
  "Direito Processual Civil",
  "https://exemplo.br/dissertacao",
  "Sim",
  "Coisa julgada e segurança jurídica",
  "2018",
  "Universidade de São Paulo",
  "Direito Processual Civil",
  "https://exemplo.br/tese",
  "Não",
  "", "", "", "", "",
];

const ABA2 = [
  "Nome da Processualista",
  "Tipo de Obra",
  "Citação completa da Obra",
  "Ano de publicação da Obra",
  "Área do Processo",
];

const EXEMPLO2 = [
  [
    "Maria Aparecida de Souza",
    "Artigo",
    "SOUZA, Maria Aparecida de. O contraditório na tutela de urgência. Revista de Processo, São Paulo, v. 300, p. 55-78, 2020.",
    "2020",
    "P. Civil",
  ],
  [
    "Maria Aparecida de Souza",
    "Livro",
    "SOUZA, Maria Aparecida de. Coisa julgada: limites objetivos. São Paulo: Editora Exemplo, 2021.",
    "2021",
    "P. Civil",
  ],
];

// A dissertação e a tese NÃO entram aqui: o sistema as deriva das colunas
// de titulação da aba 1. Repetir criaria duas versões do mesmo trabalho.

// ------------------------------------------------------------------- XML
const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  // caracteres de controle não são válidos em XML 1.0
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");

const coluna = (n) => {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) {
    s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  }
  return s;
};

/** linha de células de texto, com `s="1"` (negrito) no cabeçalho */
const linha = (valores, numero, cabecalho = false) => {
  const celulas = valores.map((v, i) =>
    v === "" || v == null
      ? ""
      : `<c r="${coluna(i + 1)}${numero}" t="inlineStr"${cabecalho ? ' s="1"' : ""}>` +
        `<is><t xml:space="preserve">${esc(v)}</t></is></c>`
  ).join("");
  return `<row r="${numero}">${celulas}</row>`;
};

const planilha = (cabecalho, linhas) => {
  const larguras = cabecalho
    .map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, Math.max(14, h.length + 4))}" customWidth="1"/>`)
    .join("");
  const corpo = [linha(cabecalho, 1, true), ...linhas.map((l, i) => linha(l, i + 2))].join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${larguras}</cols>
<sheetData>${corpo}</sheetData>
</worksheet>`;
};

const ARQUIVOS = {
  "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,

  "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,

  "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Processualistas" sheetId="1" r:id="rId1"/>
<sheet name="Bibliografia" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>`,

  "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,

  "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
</styleSheet>`,

  "xl/worksheets/sheet1.xml": planilha(ABA1, [EXEMPLO1]),
  "xl/worksheets/sheet2.xml": planilha(ABA2, EXEMPLO2),
};

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

const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABELA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

/** Monta um .zip com deflate — o .xlsx é exatamente isso. */
function zipar(entradas) {
  const locais = [];
  const central = [];
  let offset = 0;

  for (const [nome, texto] of Object.entries(entradas)) {
    const cru = Buffer.from(texto, "utf8");
    const comprimido = zlib.deflateRawSync(cru, { level: 9 });
    const nomeBuf = Buffer.from(nome, "utf8");
    const crc = crc32(cru);

    const cabecalho = Buffer.alloc(30);
    cabecalho.writeUInt32LE(0x04034b50, 0);   // assinatura local
    cabecalho.writeUInt16LE(20, 4);           // versão necessária
    cabecalho.writeUInt16LE(0x0800, 6);       // flag: nome em UTF-8
    cabecalho.writeUInt16LE(8, 8);            // método: deflate
    cabecalho.writeUInt32LE(0, 10);           // data/hora (zeradas: arquivo reprodutível)
    cabecalho.writeUInt32LE(crc, 14);
    cabecalho.writeUInt32LE(comprimido.length, 18);
    cabecalho.writeUInt32LE(cru.length, 22);
    cabecalho.writeUInt16LE(nomeBuf.length, 26);
    cabecalho.writeUInt16LE(0, 28);
    locais.push(cabecalho, nomeBuf, comprimido);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8); dir.writeUInt16LE(8, 10);
    dir.writeUInt32LE(0, 12);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(comprimido.length, 20);
    dir.writeUInt32LE(cru.length, 24);
    dir.writeUInt16LE(nomeBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nomeBuf);

    offset += cabecalho.length + nomeBuf.length + comprimido.length;
  }

  const corpoCentral = Buffer.concat(central);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(Object.keys(entradas).length, 8);
  fim.writeUInt16LE(Object.keys(entradas).length, 10);
  fim.writeUInt32LE(corpoCentral.length, 12);
  fim.writeUInt32LE(offset, 16);

  return Buffer.concat([...locais, corpoCentral, fim]);
}

const destino = path.resolve("public/modelo-planilha-bpf.xlsx");
fs.writeFileSync(destino, zipar(ARQUIVOS));
console.log(
  `${destino}\n` +
  `  aba 1 "Processualistas": ${ABA1.length} colunas, 1 linha de exemplo\n` +
  `  aba 2 "Bibliografia":    ${ABA2.length} colunas, ${EXEMPLO2.length} linhas de exemplo\n` +
  `  ${(fs.statSync(destino).size / 1024).toFixed(1)} KB`
);
