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

  /* Tope de litros por ordeño (día): el CHECK de la BD es litros >= 0 AND < 100
   * (NUMERIC(6,1)). Único valor para móvil, escritorio y la parrilla semanal. */
  const LITROS_MAX = 99.9;
  function clampLitros(raw) {
    const n = parseFloat(raw);
    if (isNaN(n)) return 0;
    return Math.max(0, Math.min(LITROS_MAX, Math.round(n * 10) / 10));
  }

  /* ID único para PKs de texto (partos, tratamientos). Tiempo (base36, ordenable)
   * + sufijo aleatorio: dos dispositivos en el mismo milisegundo NO chocan la PK.
   * Antes era solo 'P-'+Date.now(), que colisionaba. */
  function idUnico(prefijo) {
    const t = Date.now().toString(36);
    const r = Math.floor(Math.random() * 2176782336).toString(36).padStart(6, '0'); // 36^6
    return (prefijo || '') + t + '-' + r;
  }

  /* "Hoy": por defecto la fecha real. Se puede inyectar una fecha (Date) para
   * pruebas o para un "hoy" fijo desde el backend. */
  function baseHoy(hoy) {
    if (hoy instanceof Date) return new Date(hoy.getTime());
    return new Date();
  }

  /* Fecha estimada de parto: hoy + lo que falta de gestación (~9 meses).
   * Devuelve { corta:'~13 sep', mes:'sep', larga:'13 sep' } (con año si no es
   * el año en curso — antes estaba clavado 2026 y en 2027 fallaría). */
  function fechaParto(meses, hoy) {
    const d = baseHoy(hoy);
    d.setMonth(d.getMonth() + Math.max(0, 9 - meses));
    const y = d.getFullYear(), mes = MESC[d.getMonth()];
    return {
      corta: '~' + d.getDate() + ' ' + mes,
      mes: mes,
      larga: d.getDate() + ' ' + mes + (y !== baseHoy(hoy).getFullYear() ? ' ' + String(y).slice(2) : ''),
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

  /* ----- Espejo LOCAL de las derivaciones de reproducción de v_animales -----
   * (Estado único, Fase 6): para que animalesPorId quede optimista al toque
   * tras palpación/secado sin esperar una vuelta a Supabase, replican EXACTO
   * las fórmulas de parto_estimado_calc/secar_calc/dias_vacia_calc/
   * prenez_meses_actual del esquema (ver supabase/schema.sql). Se re-derivan
   * en cada carga real desde la BD, así que un desvío aquí se autocorrige solo
   * en el próximo refresco — mismo trato que hoyFincaDate()/diasDesdeReal()
   * para DEL/edad optimistas (Fase 2). Si cambia la fórmula SQL, cambiar
   * también acá (validado en Postgres 16 local; ver prototipo/test/integracion.js). */
  function _fechaMasDias(iso, dias) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + Math.round(dias));
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function diasEntreIso(a, b) {   // b - a, en días (ambas fechas ISO)
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  }
  function partoEstimadoCalc(ultimaPalpacion, prenezMeses) {
    if (ultimaPalpacion == null || prenezMeses == null) return null;
    return _fechaMasDias(ultimaPalpacion, (9 - prenezMeses) * 30.44);
  }
  function secarCalc(ultimaPalpacion, prenezMeses) {
    if (ultimaPalpacion == null || prenezMeses == null) return null;
    return _fechaMasDias(ultimaPalpacion, (7 - prenezMeses) * 30.44);
  }
  function diasVaciaCalc(ultimaPalpacion, hoy) {
    if (ultimaPalpacion == null) return null;
    return diasEntreIso(ultimaPalpacion, hoy || isoHoy());
  }
  function prenezMesesActual(prenezMeses, ultimaPalpacion, hoy) {
    if (prenezMeses == null || ultimaPalpacion == null) return prenezMeses;
    const dias = diasEntreIso(ultimaPalpacion, hoy || isoHoy());
    return Math.min(9, Math.round((prenezMeses + dias / 30.44) * 10) / 10);
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

  /* Plan sanitario de la finca (meses 0-11): desparasitación trimestral y
   * aftosa en los ciclos ICA (mayo/noviembre). ÚNICA fuente para las dos UIs. */
  const PROTOCOLO_SAN = { despar: [0, 3, 6, 9], aftosa: [4, 10] };

  /* Fecha de nacimiento para la ficha: la real, o estimada desde la edad.
   * ÚNICA fuente para las dos UIs (antes estaba duplicada y podía divergir). */
  function fmtNacimiento(a, hoy) {
    if (a && a.nacimiento) { const d = new Date(a.nacimiento + 'T00:00:00'); return d.getDate() + ' ' + MESC[d.getMonth()] + ' ' + d.getFullYear(); }
    if (a && a.edadAnios != null) { const d = baseHoy(hoy); d.setMonth(d.getMonth() - Math.round(a.edadAnios * 12)); return '~' + MESC[d.getMonth()] + ' ' + d.getFullYear() + ' (estimada)'; }
    return '—';
  }

  /* Estado reproductivo/sanitario de la ficha, canónico para las dos UIs.
   * Devuelve {nivel:''|'ok'|'warn'|'bad', titulo, sub, secar?} o null (la UI
   * decide el texto por grupo). aux: {retiroDias, diasAbiertos, hijas, fmtFecha}.
   * Regla unificada: preñada es buena noticia (verde); amarillo SOLO cuando
   * ya toca programar el secado (≥7 meses y sigue en ordeño). */
  function deriveReproFicha(a, aux) {
    aux = aux || {};
    const f = aux.fmtFecha || function (x) { return x; };
    if (aux.retiroDias != null && aux.retiroDias >= 0)
      return { nivel: 'bad', titulo: 'Retiro de leche · ' + aux.retiroDias + (aux.retiroDias === 1 ? ' día' : ' días') + ' más', sub: 'No vender su leche hasta terminar el retiro' };
    if (a.estadoRepro === 'prenada' && a.prenez) {
      const m = a.prenez.meses; let sub = '';
      if (a.prenez.partoEstimado) sub = 'Parto probable ~' + f(a.prenez.partoEstimado);
      if (a.secarEstimado) sub += (sub ? ' · ' : '') + 'Secar ~' + f(a.secarEstimado);
      if (m >= 7 && a.grupo === 'ordeño')
        return { nivel: 'warn', titulo: 'Preñada · ' + m + ' meses — programar secado', sub: sub || 'Secar ~2 meses antes del parto', secar: true };
      return { nivel: 'ok', titulo: 'Preñada · ' + m + ' meses', sub: sub || 'Gestación en curso', secar: true };
    }
    if (a.estadoRepro === 'servida') return { nivel: '', titulo: 'Servida · por palpar', sub: 'Confirmar preñez en la próxima palpación' };
    if (a.estadoRepro === 'vacia') {
      const da = aux.diasAbiertos != null ? aux.diasAbiertos : a.diasVacia;
      return { nivel: 'bad', titulo: 'Vacía' + (da ? ' · ' + da + ' días abiertos' : ''), sub: da > 120 ? 'Evaluar descarte o tratamiento reproductivo' : 'Esperar para servicio' };
    }
    if (a.grupo === 'novilla') return { nivel: a.listaServicio ? 'warn' : '', titulo: a.listaServicio ? 'Novilla lista para servicio' : 'Novilla en desarrollo', sub: a.pesoKg ? a.pesoKg + ' kg' : '' };
    if (a.grupo === 'macho' && a.rolToro) return { nivel: '', titulo: 'Toro reproductor activo', sub: aux.hijas ? aux.hijas + ' hijas en la finca' : '' };
    return null;
  }

  return {
    MESC, LITROS_MAX, clampLitros, idUnico, fechaParto, fechaDias, esBajonLeche, parseTrat, parsePalpNota, curvaLactancia,
    diasHasta, ordinalParto, fmtFechaCorta, snapshotReproDB, fechaLarga, isoHoy, esc,
    PROTOCOLO_SAN, fmtNacimiento, deriveReproFicha,
    diasEntreIso, partoEstimadoCalc, secarCalc, diasVaciaCalc, prenezMesesActual,
  };
});
