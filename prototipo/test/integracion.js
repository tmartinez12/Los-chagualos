'use strict';
/* =============================================================================
 * Los Chagualos · PRUEBAS DE INTEGRACIÓN
 * -----------------------------------------------------------------------------
 * Dos partes:
 *   A) JS puro (SIEMPRE corre, sin dependencias): paginación en el borde
 *      1000/1001 vía un cliente Supabase falso, y utilidades de core/rules.
 *   B) SQL contra un Postgres real (si hay uno alcanzable con psql): esquema,
 *      registrar_parto_completo, restaurar_respaldo, derivaciones de v_animales
 *      e idempotencia de migraciones. Si no hay Postgres, se SALTA (no falla),
 *      para no romper entornos sin base. En CI se le da un servicio postgres.
 *
 * Conexión de la parte B: variables de entorno estándar de libpq
 *   (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE). Crea una base efímera
 *   `lc_test` (la borra y recrea en cada corrida).
 *
 * Uso:  node prototipo/test/integracion.js
 * ===========================================================================*/
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const SCHEMA = path.join(RAIZ, 'supabase', 'schema.sql');
const SQL_DIR = path.join(__dirname, 'sql');

let fallos = 0, ok = 0, saltados = 0;
const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', b: '\x1b[1m', x: '\x1b[0m' };
function pass(m) { ok++; console.log('  ' + C.g + '✓' + C.x + ' ' + m); }
function fail(m, e) { fallos++; console.log('  ' + C.r + '✗ ' + m + C.x + (e ? '\n    ' + String(e.message || e).split('\n')[0] : '')); }
function skip(m) { saltados++; console.log('  ' + C.y + '⊘ ' + m + ' (saltado)' + C.x); }

/* ─── A) Paginación (borde 1000/1001) con un cliente Supabase falso ──────────
 * _paginado baja de a 1000 y para cuando una página trae < 1000. El bug clásico
 * es cortar exactamente en 1000 y perder la fila 1001. */
function pruebaPaginacion() {
  console.log(C.b + '\nA) Núcleo (JS puro)' + C.x);
  let FILAS = [];
  const builder = {
    from() { return builder; }, select() { return builder; }, eq() { return builder; },
    order() { return builder; },
    range(a, b) { return Promise.resolve({ data: FILAS.slice(a, b + 1), error: null }); },
  };
  global.supabase = { createClient() { return { from() { return builder; } }; } };

  // cargar el store con el cliente falso ya puesto
  const LCStore = require(path.join(RAIZ, 'prototipo', 'core', 'store.js'));

  return (async () => {
    for (const n of [0, 999, 1000, 1001, 2000, 2001]) {
      FILAS = Array.from({ length: n }, (_, i) => ({ id: 'P' + i, madre_id: 'M', fecha: '2026-01-01' }));
      try {
        const filas = await LCStore.getPartos();
        if (filas.length === n) pass('paginación devuelve ' + n + ' filas exactas');
        else fail('paginación: esperaba ' + n + ', obtuvo ' + filas.length);
      } catch (e) { fail('paginación con ' + n + ' filas lanzó error', e); }
    }

    // rules: idUnico razonablemente único + clampLitros en los bordes
    const R = require(path.join(RAIZ, 'prototipo', 'core', 'rules.js'));
    const s = new Set();
    for (let i = 0; i < 50000; i++) s.add(R.idUnico('P-'));
    if (s.size >= 49990) pass('idUnico: ' + s.size + '/50000 únicos en ráfaga');
    else fail('idUnico: demasiadas colisiones (' + s.size + '/50000)');
    const casos = [[150, 99.9], [-3, 0], ['12.34', 12.3], ['', 0], [60, 60]];
    let clampOk = true;
    for (const [inp, exp] of casos) if (R.clampLitros(inp) !== exp) { clampOk = false; fail('clampLitros(' + JSON.stringify(inp) + ') = ' + R.clampLitros(inp) + ', esperaba ' + exp); }
    if (clampOk) pass('clampLitros respeta [0, 99.9] con 1 decimal');

    // contrato del respaldo: store (TABLAS_RESPALDO ↔ COLUMNAS_RESPALDO) y el
    // script de respaldo (TABLAS) deben listar las MISMAS tablas.
    const claves = Object.keys(LCStore.COLUMNAS_RESPALDO).sort();
    const tablasStore = LCStore.TABLAS_RESPALDO.slice().sort();
    if (JSON.stringify(claves) === JSON.stringify(tablasStore)) pass('store: TABLAS_RESPALDO ↔ COLUMNAS_RESPALDO alineados');
    else fail('store: TABLAS_RESPALDO ≠ claves de COLUMNAS_RESPALDO', new Error(tablasStore + ' vs ' + claves));

    try {
      const txt = fs.readFileSync(path.join(RAIZ, '.github', 'scripts', 'respaldo.js'), 'utf8');
      const m = txt.match(/const\s+TABLAS\s*=\s*\[([\s\S]*?)\]/);
      const tablasRespaldo = m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean).sort();
      // respaldo.js incluye 'unidades' (semilla) que el store no respalda por columnas
      const esperadas = tablasStore.concat(['unidades']).sort();
      if (JSON.stringify(tablasRespaldo) === JSON.stringify(esperadas)) pass('respaldo.js TABLAS ↔ store (schema ↔ store ↔ respaldo sincronizados)');
      else fail('respaldo.js TABLAS desalineado', new Error(tablasRespaldo + ' vs ' + esperadas));
    } catch (e) { fail('no se pudo leer .github/scripts/respaldo.js', e); }
  })();
}

/* ─── B) SQL contra Postgres ─────────────────────────────────────────────── */
function tienePsql() {
  try { execFileSync('psql', ['--version'], { stdio: 'ignore' }); return true; } catch (_) { return false; }
}
function psql(db, args, opts) {
  return execFileSync('psql', ['-d', db, '-v', 'ON_ERROR_STOP=1', '-X', '-q'].concat(args),
    Object.assign({ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }, opts || {}));
}
function psqlRows(db, sql) {   // -tA: tuplas sin adornos, una por línea
  return psql(db, ['-tA', '-c', sql]).split('\n').map(s => s.trim()).filter(Boolean);
}
function maintDb() { return process.env.PGDATABASE || 'postgres'; }
function pgAlcanzable() {
  try { psql(maintDb(), ['-c', 'select 1']); return true; } catch (_) { return false; }
}

function pruebasSql() {
  console.log(C.b + '\nB) SQL (Postgres real)' + C.x);
  if (!tienePsql()) { skip('psql no está instalado'); return; }
  if (!pgAlcanzable()) { skip('no hay Postgres alcanzable (PGHOST/PGPORT/PGUSER…)'); return; }

  const M = maintDb();
  // roles que el esquema espera
  try {
    psql(M, ['-c', "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; END $$;"]);
    psql(M, ['-c', 'DROP DATABASE IF EXISTS lc_test']);
    psql(M, ['-c', 'CREATE DATABASE lc_test']);
  } catch (e) { fail('preparar base lc_test (¿el usuario puede CREATE DATABASE/ROLE?)', e); return; }

  // 1) el esquema canónico instala limpio
  try { psql('lc_test', ['-f', SCHEMA], { stdio: ['ignore', 'ignore', 'pipe'] }); pass('schema.sql instala en una base fresca'); }
  catch (e) { fail('schema.sql no instaló', e); return; }

  // 2) archivos de aserciones (cada uno hace BEGIN…ROLLBACK y RAISE si falla)
  for (const f of ['parto-completo.sql', 'restaurar.sql', 'derivaciones.sql']) {
    try { psql('lc_test', ['-f', path.join(SQL_DIR, f)], { stdio: ['ignore', 'ignore', 'pipe'] }); pass(f.replace('.sql', '')); }
    catch (e) { fail(f.replace('.sql', ''), new Error((e.stderr || e.message || '').toString().split('\n').filter(Boolean).slice(-2).join(' | '))); }
  }

  // 3) idempotencia: cada migración RE-EJECUTABLE corre DOS veces sobre el
  //    esquema canónico sin romper. `migracion-integridad` queda fuera a
  //    propósito: recrea v_animales con una definición PREVIA a la de
  //    `migracion-ganancia`, así que solo aplica en orden sobre la base
  //    desplegada (integridad → … → ganancia), no sobre el schema ya fusionado.
  //    Viven en migraciones-aplicadas/ (ya corrieron en la finca); el test las
  //    re-ejecuta solo en la base EFÍMERA local — la prohibición de re-correr
  //    es sobre la base de producción. Migraciones NUEVAS (supabase/
  //    migracion-*.sql) se agregan aquí mientras estén pendientes.
  const migs = ['migracion-nacimiento.sql', 'migracion-restaurar.sql', 'migracion-ganancia.sql', 'migracion-ciclo-vida.sql', 'migracion-movimientos-grupo.sql'];
  for (const m of migs) {
    const ruta = fs.existsSync(path.join(RAIZ, 'supabase', m))
      ? path.join(RAIZ, 'supabase', m)                              // pendiente
      : path.join(RAIZ, 'supabase', 'migraciones-aplicadas', m);    // ya aplicada
    if (!fs.existsSync(ruta)) { skip(m + ' (no existe)'); continue; }
    try {
      psql('lc_test', ['-f', ruta], { stdio: ['ignore', 'ignore', 'pipe'] });
      psql('lc_test', ['-f', ruta], { stdio: ['ignore', 'ignore', 'pipe'] });
      pass('idempotente ×2: ' + m);
    } catch (e) { fail('idempotencia ' + m, new Error((e.stderr || e.message || '').toString().split('\n').filter(Boolean).slice(-2).join(' | '))); }
  }
  skip('idempotencia migracion-integridad (orden-dependiente: va antes de ganancia)');

  // 4) contrato de columnas: COLUMNAS_RESPALDO (store) == columnas reales de cada
  //    tabla base. Atrapa la deriva silenciosa schema ↔ store (una columna nueva
  //    en el esquema que no se agrega al respaldo se perdería al restaurar).
  try {
    const LCStore = require(path.join(RAIZ, 'prototipo', 'core', 'store.js'));
    let sincronizado = true;
    for (const t of Object.keys(LCStore.COLUMNAS_RESPALDO)) {
      const reales = psqlRows('lc_test',
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='" + t + "' ORDER BY column_name").sort();
      const declaradas = LCStore.COLUMNAS_RESPALDO[t].slice().sort();
      if (JSON.stringify(reales) !== JSON.stringify(declaradas)) {
        sincronizado = false;
        const faltan = reales.filter(c => !declaradas.includes(c));
        const sobran = declaradas.filter(c => !reales.includes(c));
        fail('COLUMNAS_RESPALDO.' + t + ' desalineado con el esquema',
          new Error((faltan.length ? 'faltan: ' + faltan.join(',') + '  ' : '') + (sobran.length ? 'sobran: ' + sobran.join(',') : '')));
      }
    }
    if (sincronizado) pass('COLUMNAS_RESPALDO == columnas reales de cada tabla (schema ↔ store)');
  } catch (e) { fail('contrato de columnas del respaldo', e); }

  // 5) paridad de fórmulas: core/rules.js replica LOCALMENTE (Estado único,
  //    Fase 6) las derivaciones de fecha de v_animales (parto_estimado_calc,
  //    secar_calc, dias_vacia_calc, prenez_meses_actual) para poder pintar
  //    optimista sin esperar una vuelta a Supabase. Si alguien cambia la
  //    fórmula SQL sin actualizar el espejo en JS, este test lo atrapa.
  try {
    const R = require(path.join(RAIZ, 'prototipo', 'core', 'rules.js'));
    /* prenez_meses_actual y dias_vacia_calc dependen de hoy_finca() (fecha REAL
     * del sistema en Postgres) — se leen fechas RELATIVAS a ese "hoy" real (no
     * hardcodeadas) para que el test no falle en otro día ni caiga siempre en
     * el tope de 9 meses de prenez_meses_actual. */
    const [hoyReal, hace60, hace100, hace20] = psqlRows('lc_test',
      "SELECT hoy_finca()::text, (hoy_finca()-60)::text, (hoy_finca()-100)::text, (hoy_finca()-20)::text")[0].split('|');
    const casos = [
      { ultimaPalpacion: hace60, prenezMeses: 6 },
      { ultimaPalpacion: hace60, prenezMeses: 6.5 },
      { ultimaPalpacion: hace100, prenezMeses: 8 },   // este SÍ debe topar en 9
    ];
    let todoOk = true;
    for (const c of casos) {
      psql('lc_test', ['-c',
        "INSERT INTO animales (id,nombre,especie,grupo,sexo,estado_repro,prenez_meses,ultima_palpacion) " +
        "VALUES ('FX','x','bovino','horra','H','prenada'," + c.prenezMeses + ",'" + c.ultimaPalpacion + "')"]);
      const [pe, se, pa] = psqlRows('lc_test',
        "SELECT coalesce(parto_estimado_calc::text,''), coalesce(secar_calc::text,''), coalesce(prenez_meses_actual::text,'') FROM v_animales WHERE id='FX'")[0].split('|');
      psql('lc_test', ['-c', "DELETE FROM animales WHERE id='FX'"]);
      const jsPE = R.partoEstimadoCalc(c.ultimaPalpacion, c.prenezMeses);
      const jsSE = R.secarCalc(c.ultimaPalpacion, c.prenezMeses);
      const jsPA = R.prenezMesesActual(c.prenezMeses, c.ultimaPalpacion, hoyReal);
      if (pe !== jsPE) { todoOk = false; fail('parto_estimado_calc diverge', new Error('SQL=' + pe + ' JS=' + jsPE)); }
      if (se !== jsSE) { todoOk = false; fail('secar_calc diverge', new Error('SQL=' + se + ' JS=' + jsSE)); }
      if (Number(pa) !== Number(jsPA)) { todoOk = false; fail('prenez_meses_actual diverge', new Error('SQL=' + pa + ' JS=' + jsPA)); }   // valor, no formato de texto
    }
    // dias_vacia_calc: caso vacía por separado
    psql('lc_test', ['-c', "INSERT INTO animales (id,nombre,especie,grupo,sexo,estado_repro,ultima_palpacion) VALUES ('FX','x','bovino','horra','H','vacia','" + hace20 + "')"]);
    const dv = psqlRows('lc_test', "SELECT dias_vacia_calc FROM v_animales WHERE id='FX'")[0];
    psql('lc_test', ['-c', "DELETE FROM animales WHERE id='FX'"]);
    const jsDV = R.diasVaciaCalc(hace20, hoyReal);
    if (Number(dv) !== Number(jsDV)) { todoOk = false; fail('dias_vacia_calc diverge', new Error('SQL=' + dv + ' JS=' + jsDV)); }
    if (todoOk) pass('fórmulas de fecha de v_animales ↔ core/rules.js (parto/secado/vacía) coinciden exacto');
  } catch (e) { fail('paridad de fórmulas de fecha', e); }

  try { psql(M, ['-c', 'DROP DATABASE IF EXISTS lc_test']); } catch (_) {}
}

/* ─── Orquestación ──────────────────────────────────────────────────────── */
(async () => {
  console.log(C.b + '════════ PRUEBAS DE INTEGRACIÓN ════════' + C.x);
  await pruebaPaginacion();
  pruebasSql();
  console.log('\n' + '─'.repeat(44));
  const resumen = ok + ' ok · ' + fallos + ' fallo(s)' + (saltados ? ' · ' + saltados + ' saltado(s)' : '');
  if (fallos) { console.log(C.r + C.b + '✗ ' + resumen + C.x); process.exit(1); }
  console.log(C.g + C.b + '✓ ' + resumen + C.x);
})();
