/**
 * Script de importação do Excel do Observatório das Processualistas
 * Executa: node scripts/import-excel.mjs
 */
import xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://jljqkxkncubvcxyvrtdl.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsanFreGtuY3VidmN4eXZydGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA3Mzg2NCwiZXhwIjoyMDkyNjQ5ODY0fQ.mwKOv2CGT8G0Z5h_tQ-7yw8v67An0GqgsxZqTufdvqQ';
const EXCEL_PATH = 'C:/Users/Admin/Documents/Academico/Aleatórios/Projetos/Biblioteca processualistas/Mapeamento Universidades - BPF.xlsx';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Helpers ─────────────────────────────────────────────────────────────────

const toBool = (val) => {
  const s = String(val || '').trim().toLowerCase();
  return s.startsWith('sim') || s === 'true' || s === '1' || s === 's';
};

const extractUF = (val) => {
  const s = String(val || '').trim();
  const m = s.match(/^([A-Z]{2})/);
  return m ? m[1] : (s.length === 2 ? s.toUpperCase() : null);
};

const mapTitulo = (val) => {
  const s = String(val || '').trim().toLowerCase();
  return {
    especialista: s.includes('especialista'),
    mestre: s.includes('mestre'),
    doutora: s.includes('doutora') || s.includes('pós-doutora') || s.includes('pos-doutora'),
    livre_docente: s.includes('livre docente') || s.includes('livre-docente'),
  };
};

const mapTipoObra = (val) => {
  const s = String(val || '').trim().toLowerCase();
  if (s.includes('capítulo') || s.includes('capitulo')) return 'Capitulo de Livro';
  if (s.includes('livro')) return 'Livro';
  if (s.includes('anais')) return 'Anais de Eventos';
  if (s.includes('jornal') || s.includes('revista') || s.includes('coluna')) return 'Coluna em Jornais e Sites';
  return 'Artigo';
};

const mapArea = (val) => {
  const s = String(val || '').trim().toLowerCase();
  if (s.includes('civil')) return 'P. Civil';
  if (s.includes('penal') || s.includes('criminal')) return 'P. Penal';
  if (s.includes('trabalho') || s.includes('trabalhista')) return 'P. Trabalhista';
  if (s.includes('tribut')) return 'P. Tributario';
  if (s.includes('constitucional')) return 'P. Constitucional';
  return 'Outros';
};

const parseInstituicoes = (val) => {
  if (!val || String(val).trim() === '' || String(val).trim() === 'N/A') return [];
  return String(val)
    .split(/\n|\r\n/)
    .map(s => s.replace(/^\d+\)\s*/, '').trim())
    .filter(s => s.length > 2);
};

const parseTipoDocencia = (val) => {
  const s = String(val || '').trim().toLowerCase();
  if (s.includes('ambos')) return 'AMBOS';
  if (s.includes('pós') || s.includes('pos')) return 'POS';
  if (s.includes('grad')) return 'GRADUACAO';
  return null;
};

const normalizeName = (n) => String(n || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

const isNA = (val) => {
  const s = String(val || '').trim().toLowerCase();
  return !s || s === 'n/a' || s === 'n/i' || s === '-';
};

const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

// ── Leitura do Excel ─────────────────────────────────────────────────────────

console.log('📂 Lendo arquivo Excel...');
const wb = xlsx.readFile(EXCEL_PATH);

// Aba principal: Lista ABEP e IBDP (header na linha 3, dados a partir da linha 4)
const rawAssoc = xlsx.utils.sheet_to_json(wb.Sheets['Lista ABEP e IBDP'], { header: 1, defval: '' })
  .slice(3)
  .filter(r => r[1] && String(r[1]).trim());

// Aba de artigos/obras (header na linha 3, dados a partir da linha 4)
const rawArtigos = xlsx.utils.sheet_to_json(wb.Sheets['Artigos (Univ+ABEPIBDP)'], { header: 1, defval: '' })
  .slice(3)
  .filter(r => r[1] && String(r[1]).trim() && r[4] && String(r[4]).trim());

// Aba ranking (header na linha 1, dados a partir da linha 2)
const rawRanking = xlsx.utils.sheet_to_json(wb.Sheets['Nomes (Ranking)'], { header: 1, defval: '' })
  .slice(1)
  .filter(r => r[0] && r[1] && String(r[1]).trim());

console.log(`📊 Dados lidos: ${rawAssoc.length} associadas | ${rawArtigos.length} produções | ${rawRanking.length} entradas ranking`);

// ── Mapa de ranking: normName → Set de universidades ─────────────────────────

const rankingMap = new Map(); // normName → [{universidade, area}]
for (const r of rawRanking) {
  const nome = normalizeName(r[1]);
  if (!rankingMap.has(nome)) rankingMap.set(nome, []);
  rankingMap.get(nome).push({ universidade: String(r[0]).trim(), area: String(r[2] || '').trim() });
}

// ── Processar associadas ─────────────────────────────────────────────────────

console.log('\n🔨 Processando associadas...');
const associadasPayload = [];
const vinculosPayload = [];  // será preenchido depois do insert

for (const r of rawAssoc) {
  const nome = String(r[1]).trim();
  const email = String(r[2]).trim() || null;
  const ibdp = toBool(r[3]);
  const abep = toBool(r[4]);
  const linkLattes = String(r[6]).trim() || null;
  const { especialista, mestre, doutora, livre_docente } = mapTitulo(r[7]);
  const atuacaoProfissional = String(r[9] || '').trim() || null;
  const uf = extractUF(r[10]);
  const leciona = toBool(r[12]);
  const tipoDoc = parseTipoDocencia(r[13]);
  const instituicoesRaw = parseInstituicoes(r[14]);

  const tituloMestrado = !isNA(r[15]) ? String(r[15]).trim() : null;
  const tituloDoutorado = !isNA(r[16]) ? String(r[16]).trim() : null;
  const tituloLivreDoc = !isNA(r[17]) ? String(r[17]).trim() : null;

  // Outras entidades → dados_extras JSONB
  const outrasEntidades = String(r[11] || '').trim() || null;

  associadasPayload.push({
    nome,
    email: email || null,
    ibdp,
    abep,
    link_lattes: linkLattes,
    especialista,
    mestre,
    doutora,
    livre_docente,
    atuacao_profissional: atuacaoProfissional,
    uf_atuacao: uf,
    leciona,
    titulo_mestrado: tituloMestrado,
    titulo_doutorado: tituloDoutorado,
    titulo_livre_docencia: tituloLivreDoc,
    status_registro: 'ATIVO',
    dados_extras: outrasEntidades ? { outras_entidades: outrasEntidades } : {},
    // vinculos para processar depois
    _nome_norm: normalizeName(nome),
    _tipo_docencia: tipoDoc,
    _instituicoes: instituicoesRaw,
  });
}

// ── Inserir associadas em lotes ──────────────────────────────────────────────

console.log('\n📥 Inserindo associadas...');
const nameToId = new Map(); // normName → id
let totalAssocInserted = 0;

// Buscar registros já existentes para evitar duplicatas
console.log('  🔍 Verificando registros existentes...');
let page = 0;
while (true) {
  const { data: existing } = await supabase.from('associadas').select('id, nome').range(page * 1000, page * 1000 + 999);
  if (!existing || existing.length === 0) break;
  for (const e of existing) nameToId.set(normalizeName(e.nome), e.id);
  if (existing.length < 1000) break;
  page++;
}
console.log(`  ℹ️  ${nameToId.size} registros já existem no banco`);

const cleanAssoc = associadasPayload
  .filter(a => !nameToId.has(a._nome_norm)) // pular os que já existem
  .map(({ _nome_norm, _tipo_docencia, _instituicoes, ...rest }) => rest);

for (const batch of chunk(cleanAssoc, 50)) {
  const { data, error } = await supabase
    .from('associadas')
    .insert(batch)
    .select('id, nome');

  if (error) {
    console.error('  ❌ Erro no lote:', error.message);
    // Tentar um a um para pular duplicatas
    for (const row of batch) {
      const { data: d2, error: e2 } = await supabase
        .from('associadas')
        .insert(row)
        .select('id, nome')
        .single();
      if (e2) {
        console.warn(`  ⚠️  Pulando "${row.nome}": ${e2.message}`);
      } else if (d2) {
        nameToId.set(normalizeName(d2.nome), d2.id);
        totalAssocInserted++;
      }
    }
  } else {
    for (const d of data) {
      nameToId.set(normalizeName(d.nome), d.id);
      totalAssocInserted++;
    }
  }
}

console.log(`  ✅ ${totalAssocInserted} associadas inseridas`);

// ── Inserir vinculos_docentes ────────────────────────────────────────────────

console.log('\n📥 Inserindo vínculos docentes...');
const vinculosToInsert = [];

for (const a of associadasPayload) {
  const id = nameToId.get(a._nome_norm);
  if (!id || !a.leciona || a._instituicoes.length === 0) continue;

  const rankingEntries = rankingMap.get(a._nome_norm) || [];
  const rankingUnis = new Set(rankingEntries.map(e => normalizeName(e.universidade)));

  for (const inst of a._instituicoes) {
    const instNorm = normalizeName(inst);
    const integraRanking = rankingUnis.size > 0 &&
      [...rankingUnis].some(ru => instNorm.includes(ru.slice(0, 10)) || ru.includes(instNorm.slice(0, 10)));

    // tipo da docência
    let tipos = [];
    if (a._tipo_docencia === 'GRADUACAO') tipos = ['GRADUACAO'];
    else if (a._tipo_docencia === 'POS') tipos = ['POS'];
    else if (a._tipo_docencia === 'AMBOS') tipos = ['GRADUACAO', 'POS'];
    else tipos = ['GRADUACAO'];

    for (const tipo of tipos) {
      vinculosToInsert.push({ associada_id: id, tipo, instituicao: inst, integra_ranking_40: integraRanking });
    }
  }

  // Se está no ranking mas não tinha instituição listada, adicionar da aba ranking
  if (a._instituicoes.length === 0 && rankingMap.has(a._nome_norm)) {
    for (const re of rankingMap.get(a._nome_norm)) {
      vinculosToInsert.push({ associada_id: id, tipo: 'POS', instituicao: re.universidade, integra_ranking_40: true });
    }
  }
}

// Também processar nomes da aba ranking que NÃO estão na lista ABEP/IBDP
// (professoras de universidades do ranking que não são da lista principal)
// Esses já foram inseridos como associadas? Se não, pular por ora pois a instrução é não mudar estrutura

let totalVinculos = 0;
for (const batch of chunk(vinculosToInsert, 100)) {
  const { error } = await supabase.from('vinculos_docentes').insert(batch);
  if (error) console.warn('  ⚠️  Erro vínculo:', error.message);
  else totalVinculos += batch.length;
}
console.log(`  ✅ ${totalVinculos} vínculos inseridos`);

// ── Inserir producoes_bibliograficas ─────────────────────────────────────────

console.log('\n📥 Inserindo produções bibliográficas...');

// Também criar IDs para nomes da aba ranking que coincidirem
// Buscar IDs de associadas que existam por lattes (fallback)
const lateInsert = [];

for (const r of rawArtigos) {
  const nomeAutora = String(r[1]).trim();
  const nomeNorm = normalizeName(nomeAutora);
  const associadaId = nameToId.get(nomeNorm);

  if (!associadaId) continue; // pular se não encontrou a associada

  const tipoObra = mapTipoObra(r[3]);
  const citacao = String(r[4]).trim();
  const ano = parseInt(r[5]) || null;
  const area = mapArea(r[6]);

  if (!citacao || !ano) continue; // ano é NOT NULL no banco

  lateInsert.push({
    associada_id: associadaId,
    tipo_obra: tipoObra,
    citacao_completa: citacao,
    ano_publicacao: ano,
    area_processo: area,
    formato: 'ELETRONICA',
    acesso_eletronica: 'PUBLICA',
  });
}

let totalProducoes = 0;
for (const batch of chunk(lateInsert, 100)) {
  const { error } = await supabase.from('producoes_bibliograficas').insert(batch);
  if (error) console.warn('  ⚠️  Erro produções:', error.message);
  else totalProducoes += batch.length;
}
console.log(`  ✅ ${totalProducoes} produções inseridas`);

// ── Resumo final ─────────────────────────────────────────────────────────────

console.log('\n🎉 Importação concluída!');
console.log(`   Associadas: ${totalAssocInserted}`);
console.log(`   Vínculos docentes: ${totalVinculos}`);
console.log(`   Produções bibliográficas: ${totalProducoes}`);
console.log(`   Produções puladas (autora não encontrada): ${lateInsert.length - totalProducoes + (rawArtigos.length - lateInsert.length)}`);
