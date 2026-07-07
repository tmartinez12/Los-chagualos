/* =============================================================================
 * Los Chagualos · REGLAS DE NEGOCIO PURAS  (core/rules.js)
 * -----------------------------------------------------------------------------
 * Funciones sin estado ni DOM, compartidas por la UI móvil y la de escritorio.
 * Antes estaban duplicadas (copiadas literal) en app.js y escritorio.js.
 *
 * Compatible con <script> (window.LCRules) y Node (module.exports).
 *
 * "Hoy" del prototipo = 2026-06-13 (mes 5 = junio, base 0). Las funciones de
 * fecha aceptan una base opcional para poder inyectar la fecha real con backend.
 * ===========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.LCRules = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const MESC = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

  /* "Hoy": por defecto la fecha real. Se puede inyectar una fecha (Date) para
   * pruebas o para un "hoy" fijo desde el backend. */
  function baseHoy(hoy) {
    if (hoy instanceof Date) return new Date(hoy.getTime());
    return new Date();
  }

  /* Fecha estimada de parto: hoy + lo que falta de gestación (~9 meses).
   * Devuelve { corta:'~13 sep', mes:'sep', larga:'13 sep' } (con año si != 2026). */
  function fechaParto(meses, hoy) {
    const d = baseHoy(hoy);
    d.setMonth(d.getMonth() + Math.max(0, 9 - meses));
    const y = d.getFullYear(), mes = MESC[d.getMonth()];
    return {
      corta: '~' + d.getDate() + ' ' + mes,
      mes: mes,
      larga: d.getDate() + ' ' + mes + (y !== 2026 ? ' ' + String(y).slice(2) : ''),
    };
  }

  /* Fecha a N días de hoy → '17 jun'. */
  function fechaDias(dias, hoy) {
    const d = baseHoy(hoy);
    d.setDate(d.getDate() + dias);
    return d.getDate() + ' ' + MESC[d.getMonth()];
  }

  /* ¿La leche de hoy es un bajón frente a ayer? (≤ 75% de lo de ayer). */
  function esBajonLeche(ayer, hoy) {
    return ayer > 0 && hoy <= ayer * 0.75;
  }

  /* Tratamientos mencionados en una anotación veterinaria (en mayúsculas). */
  function parseTrat(s) {
    const t = [];
    if (s.includes('FOSFOSAN') || s.includes('PQ/')) t.push('Fosfosan (suplemento mineral)');
    if (s.includes('ANTRIPAN')) t.push('Antripan');
    if (s.includes('VITAMINA A') || s.includes('VIT A')) t.push('Vitamina A');
    else if (s.includes('VITAMINA') || s.includes('VIT ')) t.push('Vitaminas');
    return t;
  }

  /* Interpreta la notación real del veterinario (P+120, VF, VO FRIO, CL, …).
   * Devuelve { tipo, label, trat:[...] } y campos extra según el caso. */
  function parsePalpNota(raw) {
    const s = raw.toUpperCase().trim().replace(/\s+/g, ' ');
    if (!s) return null;
    let m = s.match(/P(?:T)?[\s+]*(\d+)(?:\s*DIAS?)?/);
    if (m) { const dias = parseInt(m[1]); const meses = Math.round(dias / 30 * 10) / 10;
      return { tipo:'prenada', dias, meses, label:'Preñada ~' + dias + ' días (~' + meses.toFixed(1) + ' meses)', trat:parseTrat(s) }; }
    if (s.includes('PROXIMA')) return { tipo:'prenada', dias:240, meses:8, label:'Próxima a parir (~8+ meses)', trat:parseTrat(s) };
    if (s === 'VF' || s.includes('VACIA F') || s.includes('V.FISIOLOG'))
      return { tipo:'vacia', subtipo:'fisiologica', label:'Vacía fisiológica — lista para servicio', trat:parseTrat(s) };
    if (s.includes('VO FRIO') || s.includes('FRIO'))
      return { tipo:'observacion', subtipo:'frio', label:'Ovarios inactivos ("fríos") — sin actividad reproductiva', trat:parseTrat(s) };
    if (s === 'VO' || s.includes('V.OBS') || s.includes('VACIA OBS'))
      return { tipo:'observacion', label:'En observación — reevaluar en próxima visita', trat:parseTrat(s) };
    if (s.includes('V CELO') || s === 'CELO')
      return { tipo:'celo', label:'En celo — servir o programar servicio', trat:parseTrat(s) };
    if (s.includes('R-SERVIDA') || s.includes('RECIEN SERVIDA'))
      return { tipo:'servida', label:'Recién servida — esperar para confirmar preñez', trat:parseTrat(s) };
    if (s.includes('RECIEN PARIDA') || s.includes('R-PARIDA'))
      return { tipo:'parida', label:'Recién parida — involución uterina en curso', trat:parseTrat(s) };
    if (s === 'CL' || s.includes('CUERPO LUTEO'))
      return { tipo:'servida', label:'Cuerpo lúteo presente — posible preñez temprana, confirmar', trat:parseTrat(s) };
    if (s.includes('V.NORMAL') || s === 'NORMAL')
      return { tipo:'vacia', subtipo:'normal', label:'Aparato reproductor normal — vacía, lista para servicio', trat:parseTrat(s) };
    if (s.includes('COD'))
      return { tipo:'observacion', subtipo:'quiste', label:'Posible quiste ovárico — confirmar con veterinario', trat:parseTrat(s) };
    if (s.includes('VENCO'))
      return { tipo:'observacion', label:'Involución uterina / cérvix — confirmar con veterinario', trat:parseTrat(s) };
    const trat = parseTrat(s);
    if (trat.length) return { tipo:'tratamiento', label:'Tratamiento aplicado', trat };
    return { tipo:'otro', label:'Anotación registrada: "' + raw.trim() + '"', trat:[] };
  }

  /* Curva de lactancia — modelo de Wood: y(t) = a · t^b · e^(-c·t).
   * Pico en t = b/c. Se ancla de dos formas:
   *  - por el punto de hoy: {delActual, lActual} → la curva pasa por ahí.
   *  - por un pico típico: {picoL} → curva de referencia del hato.
   * Devuelve puntos muestreados, día y valor del pico, y la función valorEn(t). */
  function curvaLactancia(o) {
    o = o || {};
    const tp = o.picoDia || 55;
    const b = (o.b != null ? o.b : 0.20);
    const c = b / tp;
    const maxDia = o.maxDia || 180;
    const base = t => Math.pow(Math.max(t, 0.5), b) * Math.exp(-c * Math.max(t, 0.5));
    let a;
    if (o.picoL != null) a = o.picoL / base(tp);
    else a = (o.lActual || 0) / base(Math.max(1, o.delActual || 1));
    const valorEn = t => a * base(t);
    const step = Math.max(2, Math.round(maxDia / 120));
    const puntos = [];
    for (let t = 1; t <= maxDia; t += step) puntos.push([t, valorEn(t)]);
    if (puntos.length && puntos[puntos.length - 1][0] < maxDia) puntos.push([maxDia, valorEn(maxDia)]);
    return { puntos, picoDia: tp, picoL: valorEn(tp), maxDia, valorEn };
  }

  /* ----- Derivaciones compartidas por móvil y escritorio --------------------
   * Antes estaban duplicadas en app.js y escritorio.js. */

  /* Días desde hoy hasta una fecha ISO (negativo si ya pasó). null si no hay. */
  function diasHasta(iso, hoy) {
    if (!iso) return null;
    const d = new Date(iso + 'T00:00:00');
    return Math.round((d - baseHoy(hoy)) / 86400000);
  }

  /* "3er parto", "4to parto"… */
  function ordinalParto(n) {
    const m = { 1: '1er', 2: '2do', 3: '3er', 4: '4to', 5: '5to', 6: '6to', 7: '7mo', 8: '8vo', 9: '9no' };
    return (m[n] || n + 'to') + ' parto';
  }

  /* Fecha corta para mostrar: "13 jun". '—' si no hay. */
  function fmtFechaCorta(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return d.getDate() + ' ' + MESC[d.getMonth()];
  }

  /* Fecha larga del día (por defecto hoy real): "Jueves 24 de junio". */
  const DIASEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESLARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function fechaLarga(hoy) {
    const d = baseHoy(hoy), dn = DIASEM[d.getDay()];
    return dn.charAt(0).toUpperCase() + dn.slice(1) + ' ' + d.getDate() + ' de ' + MESLARGO[d.getMonth()];
  }
  /* ISO del día de hoy real: "YYYY-MM-DD". */
  function isoHoy(hoy) {
    const d = baseHoy(hoy);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* Snapshot de los campos reproductivos (forma BD) para poder revertir en
   * Supabase si se deshace un parto o una palpación. Solo columnas FUENTE:
   * parto_estimado, dias_vacia, secar y del se derivan en la vista v_animales. */
  function snapshotReproDB(a) {
    return {
      grupo: a.grupo, estado_repro: a.estadoRepro,
      prenez_meses: a.prenez ? a.prenez.meses : null,
      ultima_palpacion: a.ultimaPalpacion || (a.prenez ? a.prenez.ultimaPalpacion : null),
      inicio_lactancia: a.inicioLactancia || null,
    };
  }

  /* Escapa texto libre (nombres, notas, razas…) antes de meterlo en innerHTML.
   * Sin esto, un nombre con "<img onerror=…>" ejecutaría código (XSS). */
  function esc(s) {
    return s == null ? '' : String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    MESC, fechaParto, fechaDias, esBajonLeche, parseTrat, parsePalpNota, curvaLactancia,
    diasHasta, ordinalParto, fmtFechaCorta, snapshotReproDB, fechaLarga, isoHoy, esc,
  };
});
