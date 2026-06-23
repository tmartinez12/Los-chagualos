#!/usr/bin/env node
/* =============================================================================
 * Los Chagualos · PRUEBA DE HUMO  (prototipo/test/smoke.js)
 * -----------------------------------------------------------------------------
 * Validación automática sin navegador ni red. Corre con:  node prototipo/test/smoke.js
 * Verifica el contrato entre las UIs y el núcleo compartido + la integridad
 * del modelo + la coherencia esquema/seed. Sale con código !=0 si algo falla.
 * ===========================================================================*/
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');         // prototipo/
const REPO = path.join(ROOT, '..');              // raíz del repo

let fallos = 0, checks = 0;
function ok(msg) { checks++; console.log('  \x1b[32m✓\x1b[0m ' + msg); }
function fail(msg) { checks++; fallos++; console.log('  \x1b[31m✗ ' + msg + '\x1b[0m'); }
function seccion(t) { console.log('\n\x1b[1m' + t + '\x1b[0m'); }

/* ---------- 1) El núcleo carga ---------- */
seccion('1) Núcleo compartido (core/)');
let LCModel, LCRules, LCStore;
try { LCModel = require(path.join(ROOT, 'core/model.js')); ok('core/model.js carga'); }
catch (e) { fail('core/model.js: ' + e.message); }
try { LCRules = require(path.join(ROOT, 'core/rules.js')); ok('core/rules.js carga'); }
catch (e) { fail('core/rules.js: ' + e.message); }
try { LCStore = require(path.join(ROOT, 'core/store.js')); ok('core/store.js carga'); }
catch (e) { fail('core/store.js: ' + e.message); }

/* ---------- 2) store.js exporta todo lo que usan las UIs ---------- */
seccion('2) Cobertura de store.js (UIs ↔ núcleo)');
if (LCStore) {
  const exports = Object.keys(LCStore);
  ['app.js', 'escritorio.js'].forEach(file => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const usadas = [...new Set((src.match(/LCStore\.([a-zA-Z]+)/g) || []).map(s => s.split('.')[1]))];
    const faltan = usadas.filter(fn => !exports.includes(fn));
    if (faltan.length) fail(file + ' usa funciones no exportadas: ' + faltan.join(', '));
    else ok(file + ': las ' + usadas.length + ' funciones LCStore.* existen');
  });
}

/* ---------- 3) Reglas puras (core/rules.js) ---------- */
seccion('3) Reglas de negocio (rules.js)');
if (LCRules) {
  try {
    const f = LCRules.fechaParto(6);
    (f && f.corta) ? ok('fechaParto() devuelve fecha') : fail('fechaParto() sin .corta');
  } catch (e) { fail('fechaParto: ' + e.message); }
  try {
    const c = LCRules.curvaLactancia({ delActual: 150, lActual: 18 });
    (c && Array.isArray(c.puntos) && c.puntos.length) ? ok('curvaLactancia() devuelve puntos') : fail('curvaLactancia() sin puntos');
  } catch (e) { fail('curvaLactancia: ' + e.message); }
  try {
    const p = LCRules.parsePalpNota('P+120');
    (p && p.tipo === 'prenada') ? ok('parsePalpNota("P+120") → preñada') : fail('parsePalpNota mal: ' + JSON.stringify(p));
  } catch (e) { fail('parsePalpNota: ' + e.message); }
  try {
    LCRules.esBajonLeche(18, 10) === true ? ok('esBajonLeche detecta bajón') : fail('esBajonLeche no detecta bajón');
  } catch (e) { fail('esBajonLeche: ' + e.message); }
}

/* ---------- 4) Integridad del modelo ---------- */
seccion('4) Integridad del modelo (model.js)');
if (LCModel) {
  const A = LCModel.animales, ids = new Set(A.map(a => a.id));
  ids.size === A.length ? ok('IDs únicos (' + A.length + ' animales)') : fail('hay IDs duplicados');
  const refsMal = A.filter(a => (a.madreId && !ids.has(a.madreId)) || (a.padreId && !ids.has(a.padreId)));
  refsMal.length ? fail('refs madre/padre rotas: ' + refsMal.map(a => a.id).join(',')) : ok('genealogía: todas las refs existen');
  // enums (deben coincidir con los del esquema SQL)
  const E = LCModel.enums;
  const valida = (campo, lista) => {
    const malos = A.filter(a => a[campo] != null && !lista.includes(a[campo]));
    malos.length ? fail(campo + ' con valores fuera de enum: ' + malos.map(a => a.id + '=' + a[campo]).join(',')) : ok(campo + ': valores válidos');
  };
  valida('grupo', E.grupo);
  valida('sexo', E.sexo);
  valida('estadoRepro', E.estadoRepro.filter(Boolean));
  // partos referencian animales existentes
  const partosMal = LCModel.partos.filter(p => !ids.has(p.madreId) || (p.criaId && !ids.has(p.criaId)));
  partosMal.length ? fail('partos con refs rotas: ' + partosMal.map(p => p.id).join(',')) : ok('partos: refs madre/cría válidas');
}

/* ---------- 5) Coherencia esquema ↔ seed ---------- */
seccion('5) Coherencia esquema.sql ↔ seed-demo.sql');
try {
  const schema = fs.readFileSync(path.join(REPO, 'supabase/schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(REPO, 'supabase/seed-demo.sql'), 'utf8');
  // columnas declaradas por tabla en el esquema
  const tablas = {};
  const re = /CREATE TABLE (\w+)\s*\(([\s\S]*?)\n\);/g; let m;
  while ((m = re.exec(schema))) {
    const cols = m[2].split('\n').map(l => l.trim())
      .filter(l => l && !/^(CONSTRAINT|UNIQUE|PRIMARY|FOREIGN|CHECK|--)/i.test(l))
      .map(l => l.split(/\s+/)[0]).filter(c => /^[a-z_]+$/.test(c));
    tablas[m[1]] = cols;
  }
  ok('esquema: ' + Object.keys(tablas).length + ' tablas parseadas');
  // cada INSERT del seed usa columnas que existen
  const reIns = /INSERT INTO (\w+)\s*\(([^)]+)\)/g; let mi, problemas = 0;
  while ((mi = reIns.exec(seed))) {
    const tabla = mi[1], cols = mi[2].split(',').map(c => c.trim());
    if (!tablas[tabla]) { fail('seed inserta en tabla inexistente: ' + tabla); problemas++; continue; }
    const malas = cols.filter(c => !tablas[tabla].includes(c));
    if (malas.length) { fail(tabla + ': columnas inexistentes ' + malas.join(',')); problemas++; }
  }
  if (!problemas) ok('seed: todas las columnas de los INSERT existen en el esquema');
} catch (e) { fail('coherencia esquema/seed: ' + e.message); }

/* ---------- Resumen ---------- */
console.log('\n' + '='.repeat(48));
if (fallos === 0) { console.log('\x1b[32m\x1b[1m✓ PRUEBA DE HUMO OK\x1b[0m · ' + checks + ' verificaciones'); process.exit(0); }
else { console.log('\x1b[31m\x1b[1m✗ ' + fallos + ' FALLO(S)\x1b[0m de ' + checks + ' verificaciones'); process.exit(1); }
