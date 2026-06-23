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
    ping,
  };
});
