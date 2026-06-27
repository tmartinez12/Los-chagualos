/* =============================================================================
 * Los Chagualos · CAPA DE DATOS  (core/store.js)
 * -----------------------------------------------------------------------------
 * Frontera entre la UI y Supabase. La UI nunca habla con Supabase directo:
 * siempre pasa por aquí. Esto permite, más adelante, meter caché local +
 * outbox (offline-first) sin tocar las pantallas.
 *
 * Mapea entre la forma de la BD (snake_case, columnas planas) y la forma
 * canónica del modelo (camelCase, objetos anidados leche{}/prenez{}).
 *
 * Requiere el cliente de Supabase cargado antes (window.supabase, v2):
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *
 * Compatible con <script> (window.LCStore) y Node (module.exports).
 * ===========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.LCStore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  /* --- Configuración -------------------------------------------------------- *
   * La anon key es pública por diseño (va en el cliente). NO es la service_role.
   */
  const CONFIG = {
    url: 'https://vjzhehvsptvakczynnyw.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqemhlaHZzcHR2YWtjenlubnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjA3MTksImV4cCI6MjA5NzY5NjcxOX0.-yNFEQsswSba5cKRfuobNoGj8kljNx2jw78owXb_kWc',
  };

  let _client = null;
  function client() {
    if (_client) return _client;
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      throw new Error('Cliente de Supabase no cargado. Incluye supabase-js antes de store.js.');
    }
    _client = supabase.createClient(CONFIG.url, CONFIG.anonKey);
    return _client;
  }

  /* --- Mapeo BD → modelo canónico ------------------------------------------- */
  function animalFromDB(r) {
    if (!r) return null;
    /* del y leche.ayer pueden venir DERIVADOS de la vista v_animales
     * (del_calc desde inicio_lactancia, leche_ultima desde el último ordeño);
     * si no hay vista/derivado, se usa la columna guardada como respaldo. */
    const delDerivado = (r.del_calc != null) ? r.del_calc : r.del;
    const lecheDerivada = (r.leche_ultima != null) ? r.leche_ultima : r.leche_ayer;
    const retiroDerivado = (r.retiro_calc !== undefined) ? r.retiro_calc : r.retiro_leche_hasta;
    /* reproducción derivada de la palpación (con respaldo a la columna guardada) */
    const partoEstDeriv = (r.parto_estimado_calc != null) ? r.parto_estimado_calc : r.parto_estimado;
    const secarDeriv = (r.secar_calc != null) ? r.secar_calc : r.secar_estimado;
    const diasVaciaDeriv = (r.dias_vacia_calc != null) ? r.dias_vacia_calc : r.dias_vacia;
    const mesesDeriv = (r.prenez_meses_actual != null) ? r.prenez_meses_actual : r.prenez_meses;
    return {
      id: r.id, nombre: r.nombre, unidad: r.unidad_id, especie: r.especie,
      raza: r.raza, grupo: r.grupo, sexo: r.sexo,
      edadAnios: (r.edad_calc != null) ? r.edad_calc : r.edad_anios, nacimiento: r.nacimiento, origen: r.origen,
      del: delDerivado, partos: r.partos, inicioLactancia: r.inicio_lactancia,
      leche: { ayer: lecheDerivada, hoy: r.leche_hoy },
      estadoRepro: r.estado_repro,
      prenez: (r.prenez_meses != null || partoEstDeriv)
        ? { meses: mesesDeriv, partoEstimado: partoEstDeriv, ultimaPalpacion: r.ultima_palpacion }
        : null,
      diasVacia: diasVaciaDeriv, ultimaPalpacion: r.ultima_palpacion,
      listaServicio: r.lista_servicio, secarEstimado: secarDeriv,
      retiroLecheHasta: retiroDerivado,
      madreId: r.madre_id, padreId: r.padre_id,
      pesoKg: r.peso_kg, fechaPeso: r.fecha_peso, gananciaDiaG: r.ganancia_dia_g,
      desteteProximo: r.destete_proximo, rolToro: r.rol_toro,
      montaNatural: r.monta_natural, hijasVivas: r.hijas_vivas,
      sanidadAlDia: r.sanidad_al_dia, ventaProgramada: r.venta_programada,
      baja: r.baja_motivo ? { motivo: r.baja_motivo, fecha: r.baja_fecha, valor: r.baja_valor, nota: r.baja_nota } : null,
      procedencia: r.procedencia, valorCompra: r.valor_compra,
    };
  }

  /* --- Mapeo modelo → BD (para insertar/actualizar) ------------------------- */
  function animalToDB(a) {
    /* Solo columnas FUENTE. del, leche_ayer, parto_estimado, dias_vacia,
     * secar_estimado y retiro_leche_hasta se DERIVAN en la vista v_animales
     * (no se guardan, para no tener dos verdades que se contradigan). */
    const o = {
      id: a.id, nombre: a.nombre, raza: a.raza, grupo: a.grupo, sexo: a.sexo,
      edad_anios: a.edadAnios, nacimiento: a.nacimiento || null, origen: a.origen || null,
      partos: a.partos ?? 0,
      leche_hoy: a.leche ? a.leche.hoy : null,
      estado_repro: a.estadoRepro || null,
      prenez_meses: a.prenez ? a.prenez.meses : null,
      ultima_palpacion: a.ultimaPalpacion || (a.prenez ? a.prenez.ultimaPalpacion : null) || null,
      lista_servicio: a.listaServicio ?? null,
      madre_id: a.madreId || null, padre_id: a.padreId || null,
      peso_kg: a.pesoKg ?? null, fecha_peso: a.fechaPeso || null,
      ganancia_dia_g: a.gananciaDiaG ?? null,
      destete_proximo: a.desteteProximo ?? null,
      procedencia: a.procedencia || null, valor_compra: a.valorCompra ?? null,
      inicio_lactancia: a.inicioLactancia || null,
    };
    if (a.unidad) o.unidad_id = a.unidad;
    return o;
  }

  /* normaliza para comparar grupos sin depender de acentos/mayúsculas/espacios
   * (evita que la ñ de "ordeño" rompa el filtro entre la BD y el código). */
  function _normGrupo(s) {
    return (s == null ? '' : String(s)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  /* Caché corto de la tabla de animales: en una carga, varias pantallas piden
   * getAnimales() casi a la vez; con esto se baja la tabla UNA sola vez.
   * Se invalida en cada escritura de animales. */
  let _animCache = null, _animCacheAt = 0;
  function _invalidarAnimales() { _animCache = null; }
  async function _fetchAnimalesRaw() {
    if (_animCache && (Date.now() - _animCacheAt) < 3000) return _animCache;
    let resp = await client().from('v_animales').select('*').order('id');
    if (resp.error) resp = await client().from('animales').select('*').order('id');
    if (resp.error) throw resp.error;
    _animCache = resp.data; _animCacheAt = Date.now();
    return _animCache;
  }

  /* --- API de lectura ------------------------------------------------------- *
   * Lee de la vista v_animales (DEL y leche derivados). Si la vista no existe
   * todavía (migración sin aplicar), cae a la tabla animales.                 */
  async function getAnimales(grupo) {
    const data = await _fetchAnimalesRaw();
    let rows = data.map(animalFromDB);
    if (grupo) { const g = _normGrupo(grupo); rows = rows.filter(a => _normGrupo(a.grupo) === g); }
    return rows;
  }

  async function getAnimal(id) {
    let resp = await client().from('v_animales').select('*').eq('id', id).single();
    if (resp.error) resp = await client().from('animales').select('*').eq('id', id).single();
    const { data, error } = resp;
    if (error) throw error;
    return animalFromDB(data);
  }

  async function getPotreros() {
    const { data, error } = await client().from('potreros').select('*').order('numero');
    if (error) throw error;
    return data;
  }

  /* --- API de escritura ----------------------------------------------------- */
  async function insertAnimal(a) {
    _invalidarAnimales();
    const { data, error } = await client().from('animales').insert(animalToDB(a)).select().single();
    if (error) throw error;
    return animalFromDB(data);
  }

  async function updateAnimal(id, patch) {
    _invalidarAnimales();
    const { data, error } = await client().from('animales').update(animalToDB(patch)).eq('id', id).select().single();
    if (error) throw error;
    return animalFromDB(data);
  }

  /* Update PARCIAL: solo toca las columnas dadas (snake_case). No usar
   * animalToDB aquí porque rellenaría con null y borraría otras columnas.  */
  async function updateAnimalCampos(id, campos) {
    _invalidarAnimales();
    const { data, error } = await client().from('animales').update(campos).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteAnimal(id) {
    _invalidarAnimales();
    const { error } = await client().from('animales').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async function deleteParto(id) {
    const { error } = await client().from('partos').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async function deletePalpacion(id) {
    const { error } = await client().from('palpaciones').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  const MOTIVO_BAJA = { 'Venta': 'venta', 'Muerte': 'muerte', 'Descarte': 'descarte', 'Pérdida': 'perdida' };
  async function darDeBaja(id, baja) {
    return updateAnimalCampos(id, {
      grupo: 'baja',
      baja_motivo: MOTIVO_BAJA[baja.motivo] || baja.motivo,
      baja_fecha: baja.fecha || new Date().toISOString().slice(0, 10),
      baja_valor: baja.valor || null,
      baja_nota: baja.nota || null,
    });
  }

  async function registrarTratamiento(t) {
    const fila = {
      id: t.id || ('T-' + Date.now()), animal_id: t.animalId,
      problema: t.problema, medicamento: t.medicamento || null,
      inicio: t.inicio || new Date().toISOString().slice(0, 10),
      dias_retiro: t.diasRetiro || 0, retiro_leche_hasta: t.retiroLecheHasta || null,
      activo: true,
    };
    const { data, error } = await client().from('tratamientos').insert(fila).select().single();
    if (error) throw error;
    /* el retiro de la vaca se DERIVA del tratamiento (vista v_animales); no se
     * copia a la tabla animales. Se invalida la caché para que se recalcule. */
    _invalidarAnimales();
    return data;
  }

  async function registrarPalpacion(p) {
    const fila = {
      animal_id: p.animalId, fecha: p.fecha || new Date().toISOString().slice(0, 10),
      motivo: p.motivo || null, resultado: p.resultado || null,
      prenez_meses: p.prenezMeses != null ? p.prenezMeses : null,
    };
    const { data, error } = await client().from('palpaciones').insert(fila).select().single();
    if (error) throw error;
    return data;
  }

  async function registrarParto(p) {
    const fila = {
      id: p.id || ('P-' + Date.now()), madre_id: p.madreId, cria_id: p.criaId || null,
      fecha: p.fecha || new Date().toISOString().slice(0, 10),
      sexo_cria: p.sexo, peso_kg: p.pesoKg || null,
      tipo: p.tipo || 'normal', estado_cria: p.estadoCria || 'viva',
    };
    const { data, error } = await client().from('partos').insert(fila).select().single();
    if (error) throw error;
    return data;
  }

  /* --- Registro de ordeño --------------------------------------------------- *
   * turno fijo 'dia' (total del día) para que el UNIQUE(animal,fecha,turno)
   * permita corregir (upsert) sin duplicar. fecha omitida = CURRENT_DATE.     */
  async function registrarOrdeno(animalId, litros, fecha) {
    const fila = { animal_id: animalId, litros: litros, turno: 'dia' };
    if (fecha) fila.fecha = fecha;
    const { data, error } = await client()
      .from('ordenos')
      .upsert(fila, { onConflict: 'animal_id,fecha,turno' })
      .select().single();
    if (error) throw error;
    return data;
  }

  /* Ordeños de una fecha (default: hoy real) → mapa { animalId: litros } */
  async function getOrdenosFecha(fecha) {
    let q = client().from('ordenos').select('animal_id, litros').eq('turno', 'dia');
    q = fecha ? q.eq('fecha', fecha) : q.eq('fecha', new Date().toISOString().slice(0, 10));
    const { data, error } = await q;
    if (error) throw error;
    const map = {};
    (data || []).forEach(r => { map[r.animal_id] = r.litros; });
    return map;
  }

  /* Ordeños históricos (datos reales para el histórico de producción).
   * Devuelve filas planas; la UI las agrupa por día/mes. */
  async function getOrdenos() {
    const { data, error } = await client().from('ordenos')
      .select('animal_id, fecha, litros').eq('turno', 'dia');
    if (error) throw error;
    return data || [];
  }

  /* --- Vacunaciones --------------------------------------------------------- */
  async function registrarVacunacion(v) {
    const fila = {
      tipo: v.tipo, alcance: v.alcance || 'hato',
      animal_id: v.alcance === 'individual' ? (v.animalId || null) : null,
      n_animales: v.alcance === 'hato' ? (v.nAnimales != null ? v.nAnimales : null) : null,
      producto: v.producto || null, lote: v.lote || null,
      fecha: v.fecha || new Date().toISOString().slice(0, 10),
      proxima: v.proxima || null, nota: v.nota || null,
    };
    const { data, error } = await client().from('vacunaciones').insert(fila).select().single();
    if (error) throw error;
    return data;
  }
  async function getVacunaciones() {
    const { data, error } = await client().from('vacunaciones')
      .select('id, tipo, alcance, animal_id, n_animales, producto, lote, fecha, proxima, nota, animales(nombre)')
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  async function deleteVacunacion(id) {
    const { error } = await client().from('vacunaciones').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  /* Histórico mensual DERIVADO de los ordeños (vista v_produccion_mensual). */
  async function getProduccionMensual() {
    const { data, error } = await client().from('v_produccion_mensual')
      .select('animal_id, mes, litros_dia').order('animal_id');
    if (error) throw error;
    return data || [];
  }

  async function getTratamientos(soloActivos) {
    let q = client().from('tratamientos')
      .select('id, animal_id, problema, medicamento, inicio, dias_retiro, retiro_leche_hasta, activo, animales(nombre)')
      .order('inicio', { ascending: false });
    if (soloActivos) q = q.eq('activo', true);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function terminarTratamiento(id) {
    const { error } = await client().from('tratamientos').update({ activo: false }).eq('id', id);
    if (error) throw error;
    _invalidarAnimales();   // el retiro derivado de la vaca se recalcula
    return true;
  }

  async function reactivarTratamiento(id) {
    const { error } = await client().from('tratamientos').update({ activo: true }).eq('id', id);
    if (error) throw error;
    _invalidarAnimales();
    return true;
  }

  async function getPartos() {
    const { data, error } = await client()
      .from('partos')
      .select('id, madre_id, cria_id, fecha, sexo_cria, peso_kg, tipo, estado_cria')
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /* --- Diagnóstico: ping de conexión ---------------------------------------- */
  async function ping() {
    const { count, error } = await client()
      .from('animales').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return { ok: true, animales: count };
  }

  return {
    CONFIG, client,
    animalFromDB, animalToDB,
    getAnimales, getAnimal, getPotreros,
    insertAnimal, updateAnimal,
    registrarOrdeno, getOrdenosFecha, getOrdenos,
    registrarVacunacion, getVacunaciones, deleteVacunacion,
    getProduccionMensual, getPartos, getTratamientos, terminarTratamiento, reactivarTratamiento,
    updateAnimalCampos, darDeBaja, deleteAnimal, deleteParto, deletePalpacion,
    registrarTratamiento, registrarParto, registrarPalpacion,
    ping,
  };
});
