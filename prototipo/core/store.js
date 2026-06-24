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
    return {
      id: r.id, nombre: r.nombre, unidad: r.unidad_id, especie: r.especie,
      raza: r.raza, grupo: r.grupo, sexo: r.sexo,
      edadAnios: r.edad_anios, nacimiento: r.nacimiento, origen: r.origen,
      del: r.del, partos: r.partos,
      leche: { ayer: r.leche_ayer, hoy: r.leche_hoy },
      estadoRepro: r.estado_repro,
      prenez: (r.prenez_meses != null || r.parto_estimado)
        ? { meses: r.prenez_meses, partoEstimado: r.parto_estimado, ultimaPalpacion: r.ultima_palpacion }
        : null,
      diasVacia: r.dias_vacia, ultimaPalpacion: r.ultima_palpacion,
      listaServicio: r.lista_servicio, secarEstimado: r.secar_estimado,
      retiroLecheHasta: r.retiro_leche_hasta,
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
    const o = {
      id: a.id, nombre: a.nombre, raza: a.raza, grupo: a.grupo, sexo: a.sexo,
      edad_anios: a.edadAnios, nacimiento: a.nacimiento || null, origen: a.origen || null,
      del: a.del ?? null, partos: a.partos ?? 0,
      leche_ayer: a.leche ? a.leche.ayer : null,
      leche_hoy: a.leche ? a.leche.hoy : null,
      estado_repro: a.estadoRepro || null,
      prenez_meses: a.prenez ? a.prenez.meses : null,
      parto_estimado: a.prenez ? (a.prenez.partoEstimado || null) : null,
      ultima_palpacion: a.ultimaPalpacion || (a.prenez ? a.prenez.ultimaPalpacion : null) || null,
      dias_vacia: a.diasVacia ?? null,
      lista_servicio: a.listaServicio ?? null,
      secar_estimado: a.secarEstimado || null,
      retiro_leche_hasta: a.retiroLecheHasta || null,
      madre_id: a.madreId || null, padre_id: a.padreId || null,
      peso_kg: a.pesoKg ?? null, fecha_peso: a.fechaPeso || null,
      ganancia_dia_g: a.gananciaDiaG ?? null,
      destete_proximo: a.desteteProximo ?? null,
      procedencia: a.procedencia || null, valor_compra: a.valorCompra ?? null,
    };
    if (a.unidad) o.unidad_id = a.unidad;
    return o;
  }

  /* --- API de lectura ------------------------------------------------------- */
  async function getAnimales(grupo) {
    let q = client().from('animales').select('*').order('id');
    if (grupo) q = q.eq('grupo', grupo);
    const { data, error } = await q;
    if (error) throw error;
    return data.map(animalFromDB);
  }

  async function getAnimal(id) {
    const { data, error } = await client().from('animales').select('*').eq('id', id).single();
    if (error) throw error;
    return animalFromDB(data);
  }

  async function getLecheros() {
    const { data, error } = await client().from('lecheros').select('*').order('id');
    if (error) throw error;
    return data;
  }

  async function getPotreros() {
    const { data, error } = await client().from('potreros').select('*').order('numero');
    if (error) throw error;
    return data;
  }

  /* --- API de escritura ----------------------------------------------------- */
  async function insertAnimal(a) {
    const { data, error } = await client().from('animales').insert(animalToDB(a)).select().single();
    if (error) throw error;
    return animalFromDB(data);
  }

  async function updateAnimal(id, patch) {
    const { data, error } = await client().from('animales').update(animalToDB(patch)).eq('id', id).select().single();
    if (error) throw error;
    return animalFromDB(data);
  }

  /* Update PARCIAL: solo toca las columnas dadas (snake_case). No usar
   * animalToDB aquí porque rellenaría con null y borraría otras columnas.  */
  async function updateAnimalCampos(id, campos) {
    const { data, error } = await client().from('animales').update(campos).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteAnimal(id) {
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
    if (t.retiroLecheHasta) {
      await updateAnimalCampos(t.animalId, { retiro_leche_hasta: t.retiroLecheHasta }).catch(() => {});
    }
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

  async function getTarifa() {
    const { data, error } = await client()
      .from('tarifa').select('precio_litro, moneda')
      .order('vigente_desde', { ascending: false }).limit(1);
    if (error) throw error;
    return (data && data[0]) || { precio_litro: 1950, moneda: 'COP' };
  }

  /* --- Registro de entrega a lechero --------------------------------------- *
   * UNIQUE(lechero_id, fecha) permite corregir (upsert) sin duplicar.        */
  async function registrarEntrega(lecheroId, litros, precioLitro, fecha) {
    const fila = {
      lechero_id: lecheroId, litros: litros,
      precio_litro: precioLitro, total: litros * precioLitro,
    };
    if (fecha) fila.fecha = fecha;
    const { data, error } = await client()
      .from('entregas')
      .upsert(fila, { onConflict: 'lechero_id,fecha' })
      .select().single();
    if (error) throw error;
    return data;
  }

  async function getEntregasFecha(fecha) {
    let q = client().from('entregas').select('lechero_id, litros');
    q = q.eq('fecha', fecha || new Date().toISOString().slice(0, 10));
    const { data, error } = await q;
    if (error) throw error;
    const map = {};
    (data || []).forEach(r => { map[r.lechero_id] = r.litros; });
    return map;
  }

  async function getProduccionMensual() {
    const { data, error } = await client()
      .from('produccion_mensual')
      .select('animal_id, mes, litros_dia, animales(nombre)')
      .order('animal_id');
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
    return true;
  }

  async function reactivarTratamiento(id) {
    const { error } = await client().from('tratamientos').update({ activo: true }).eq('id', id);
    if (error) throw error;
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
    getAnimales, getAnimal, getLecheros, getPotreros,
    insertAnimal, updateAnimal,
    registrarOrdeno, getOrdenosFecha,
    getTarifa, registrarEntrega, getEntregasFecha,
    getProduccionMensual, getPartos, getTratamientos, terminarTratamiento, reactivarTratamiento,
    updateAnimalCampos, darDeBaja, deleteAnimal, deleteParto, deletePalpacion,
    registrarTratamiento, registrarParto, registrarPalpacion,
    ping,
  };
});
