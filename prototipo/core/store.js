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

  /* ID único para PKs de texto: tiempo (base36) + sufijo aleatorio, para que dos
   * dispositivos en el mismo milisegundo NO choquen la PK. Local al store (la capa
   * de datos no depende de LCRules). Espeja LCRules.idUnico. */
  function _idUnico(prefijo) {
    const t = Date.now().toString(36);
    const r = Math.floor(Math.random() * 2176782336).toString(36).padStart(6, '0');
    return (prefijo || '') + t + '-' + r;
  }
  function client() {
    if (_client) return _client;
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      throw new Error('Cliente de Supabase no cargado. Incluye supabase-js antes de store.js.');
    }
    _client = supabase.createClient(CONFIG.url, CONFIG.anonKey);
    return _client;
  }

  /* --- "Hoy" en la zona de la finca (Colombia) ------------------------------ *
   * NUNCA usar new Date().toISOString() para la fecha de un registro: eso da
   * UTC y en Colombia (UTC−5), entre las 7pm y medianoche, ya marca el día
   * SIGUIENTE — un ordeño o parto de la tarde-noche quedaría mal fechado.
   * Intl con timeZone funciona igual en el navegador y en Node.               */
  const TZ_FINCA = 'America/Bogota';
  function hoyFinca() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ_FINCA, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());   // 'en-CA' → 'YYYY-MM-DD'
  }

  /* --- Mapeo BD → modelo canónico ------------------------------------------- */
  function animalFromDB(r) {
    if (!r) return null;
    /* del y leche.ayer pueden venir DERIVADOS de la vista v_animales
     * (del_calc desde inicio_lactancia, leche_ultima desde el último ordeño);
     * si no hay vista/derivado, se usa la columna guardada como respaldo. */
    /* *_calc vienen de la vista v_animales; al leer la tabla base (solo si la
     * vista no existe) simplemente quedan null. Las columnas viejas del/leche_
     * ayer/retiro_leche_hasta/parto_estimado/… ya NO existen en la BD. */
    const delDerivado = r.del_calc != null ? r.del_calc : null;
    const lecheDerivada = r.leche_ultima != null ? r.leche_ultima : null;
    const retiroDerivado = r.retiro_calc !== undefined ? r.retiro_calc : null;
    const partoEstDeriv = r.parto_estimado_calc != null ? r.parto_estimado_calc : null;
    const secarDeriv = r.secar_calc != null ? r.secar_calc : null;
    const diasVaciaDeriv = r.dias_vacia_calc != null ? r.dias_vacia_calc : null;
    const mesesDeriv = (r.prenez_meses_actual != null) ? r.prenez_meses_actual : r.prenez_meses;
    const edadDeriv = (r.edad_calc != null) ? r.edad_calc : r.edad_anios;
    return {
      id: r.id, nombre: r.nombre, unidad: r.unidad_id, especie: r.especie,
      raza: r.raza, color: r.color, nota: r.nota, grupo: r.grupo, sexo: r.sexo,
      edadAnios: edadDeriv, nacimiento: r.nacimiento, origen: r.origen,
      del: delDerivado, partos: r.partos, inicioLactancia: r.inicio_lactancia,
      leche: { ayer: lecheDerivada },
      estadoRepro: r.estado_repro,
      prenez: (r.prenez_meses != null || partoEstDeriv)
        ? { meses: mesesDeriv, partoEstimado: partoEstDeriv, ultimaPalpacion: r.ultima_palpacion }
        : null,
      diasVacia: diasVaciaDeriv, ultimaPalpacion: r.ultima_palpacion,
      secarEstimado: secarDeriv,
      retiroLecheHasta: retiroDerivado,
      madreId: r.madre_id, padreId: r.padre_id,
      pesoKg: r.peso_kg, fechaPeso: r.fecha_peso, pesoNacer: r.peso_nacer, gananciaDiaG: r.ganancia_dia_g,
      rolToro: r.rol_toro,
      /* DERIVADOS (antes columnas): lista para servicio y destete próximo */
      /* señales de transición de etapa (patrón "aviso + confirmar": el grupo NO
       * cambia solo — estos flags disparan un aviso y la dueña confirma el paso):
       *   cría → levante  a los ~8 meses (ambos sexos)
       *   levante → novilla  a los ~3 años (hembras)
       *   levante → machos   a los ~3 años (machos)
       * "lista para servicio" sigue siendo por peso: novilla que alcanza 330 kg. */
      listaServicio: (r.grupo === 'novilla' && r.peso_kg != null && Number(r.peso_kg) >= 330),
      listoLevante: (r.grupo === 'cria' && edadDeriv != null && edadDeriv >= 8 / 12),
      listoNovilla: (r.grupo === 'levante' && r.sexo === 'H' && edadDeriv != null && edadDeriv >= 3),
      listoMachos: (r.grupo === 'levante' && r.sexo === 'M' && edadDeriv != null && edadDeriv >= 3),
      baja: r.baja_motivo ? { motivo: r.baja_motivo, fecha: r.baja_fecha, valor: r.baja_valor, nota: r.baja_nota } : null,
      procedencia: r.procedencia, valorCompra: r.valor_compra,
      creadoEn: r.created_at,    // cuándo entró a la base (regla de vacunas legado: ver LCRules.vacunaAplicaA)
      updatedAt: r.updated_at,   // para detectar edición concurrente (last-write-wins)
    };
  }

  /* --- Mapeo modelo → BD (para insertar/actualizar) ------------------------- */
  function animalToDB(a) {
    /* Solo columnas FUENTE. del, leche_ayer, parto_estimado, dias_vacia,
     * secar_estimado y retiro_leche_hasta se DERIVAN en la vista v_animales
     * (no se guardan, para no tener dos verdades que se contradigan). */
    const o = {
      id: a.id, nombre: a.nombre, raza: a.raza, color: a.color || null, nota: a.nota || null, grupo: a.grupo, sexo: a.sexo,
      edad_anios: a.edadAnios, nacimiento: a.nacimiento || null, origen: a.origen || null,
      estado_repro: a.estadoRepro || null,
      prenez_meses: a.prenez ? a.prenez.meses : null,
      ultima_palpacion: a.ultimaPalpacion || (a.prenez ? a.prenez.ultimaPalpacion : null) || null,
      madre_id: a.madreId || null, padre_id: a.padreId || null,
      peso_kg: a.pesoKg ?? null, fecha_peso: a.fechaPeso || null,
      /* ganancia_dia_g NO se escribe: se DERIVA en v_animales (g/día desde el
       * nacimiento). Ver migracion-ganancia.sql. */
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

  /* Caché de la tabla de animales. La invalidación REAL es por evento: cada
   * escritura llama _invalidarAnimales(), así que el TTL solo acota cuánto tarda
   * en verse un cambio de OTRO dispositivo. Con 200+ animales, 3 s hacía
   * re-descargar toda la tabla en cada navegación; 30 s la baja una vez por
   * ráfaga de pantallas sin quedarse peligrosamente vieja (y la edición
   * concurrente ya avisa por su cuenta). */
  const ANIM_CACHE_TTL = 30000;
  let _animCache = null, _animCacheAt = 0, _animGen = 0;
  function _invalidarAnimales() { _animCache = null; _animGen++; }
  async function _fetchAnimalesRaw() {
    if (_animCache && (Date.now() - _animCacheAt) < ANIM_CACHE_TTL) return _animCache;
    const gen = _animGen;
    let resp = await client().from('v_animales').select('*').order('id');
    /* caer a la tabla base SOLO si la vista no existe (migración sin aplicar);
     * cualquier otro error (red, permisos) debe verse, no esconderse. */
    if (resp.error && resp.error.code === '42P01') resp = await client().from('animales').select('*').order('id');
    if (resp.error) throw resp.error;
    /* si hubo una escritura mientras bajábamos, no tapar el estado nuevo */
    if (gen === _animGen) { _animCache = resp.data; _animCacheAt = Date.now(); }
    return resp.data;
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
    const o = animalToDB(a);
    /* sin nacimiento la edad quedaría CONGELADA en edad_anios (la vista solo
     * deriva edad desde nacimiento): se estima desde la edad dada. */
    if (!o.nacimiento && o.edad_anios != null && !isNaN(Number(o.edad_anios))) {
      const d = new Date(hoyFinca() + 'T00:00:00');
      d.setDate(d.getDate() - Math.round(Number(o.edad_anios) * 365.25));
      o.nacimiento = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    const { data, error } = await client().from('animales').insert(o).select().single();
    if (error) {
      /* violación de unicidad de la PK (id) → el número ya existe (p.ej. otro
       * dispositivo lo tomó en paralelo). Se marca para que la UI lo diga claro
       * y ofrezca otro número, en vez de un genérico "no se guardó". */
      if (error.code === '23505') { error.code = 'ID_DUPLICADO'; error.idDuplicado = o.id; }
      throw error;
    }
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
  async function updateAnimalCampos(id, campos, expectedUpdatedAt) {
    _invalidarAnimales();
    /* sin guard de concurrencia: comportamiento de siempre (.single()). */
    if (!expectedUpdatedAt) {
      const { data, error } = await client().from('animales').update(campos).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    /* concurrencia (last-write-wins): la actualización solo entra si la fila NO
     * cambió mientras tanto. 0 filas → otro dispositivo la editó: CONFLICTO. */
    const { data, error } = await client().from('animales').update(campos)
      .eq('id', id).eq('updated_at', expectedUpdatedAt).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      const err = new Error('Otro dispositivo cambió esta ficha antes que tú');
      err.code = 'CONFLICTO';
      throw err;
    }
    return data[0];
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
    _invalidarAnimales();   // el conteo de partos derivado cambia
    return true;
  }

  /* Corrige campos de un parto ya registrado (fecha, peso_kg, nota — en
   * snake_case, como updateAnimalCampos). Solo toca lo que se le pasa. */
  async function updateParto(id, campos) {
    const { data, error } = await client().from('partos').update(campos).eq('id', id).select().single();
    if (error) throw error;
    _invalidarAnimales();   // el último parto derivado puede cambiar
    return data;
  }

  /* borra el ordeño de una vaca en una fecha (default: hoy de la finca).
   * Lo usan el "Deshacer" del registro y el vaciado de celdas de la semana. */
  async function deleteOrdeno(animalId, fecha) {
    const { error } = await client().from('ordenos').delete()
      .eq('animal_id', animalId).eq('fecha', fecha || hoyFinca()).eq('turno', 'dia');
    if (error) throw error;
    _invalidarAnimales();   // leche_ultima derivada puede cambiar
    return true;
  }

  async function deleteTratamiento(id) {
    const { error } = await client().from('tratamientos').delete().eq('id', id);
    if (error) throw error;
    _invalidarAnimales();   // el retiro derivado de la vaca se recalcula
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
      baja_fecha: baja.fecha || hoyFinca(),
      baja_valor: baja.valor || null,
      baja_nota: baja.nota || null,
    });
  }

  /* Mueve un animal de grupo Y registra el paso con su fecha, en UNA
   * transacción (RPC mover_grupo). Devuelve { grupo, movimientoId } para que el
   * "Deshacer" pueda revertir el grupo y borrar la fila del historial. Si el RPC
   * no está instalado (migración pendiente), cae a dos escrituras sueltas. */
  async function moverGrupo(animalId, aGrupo, opts) {
    opts = opts || {};
    _invalidarAnimales();
    const fecha = opts.fecha || hoyFinca();
    const rpc = await client().rpc('mover_grupo', {
      p_animal_id: animalId, p_a_grupo: aGrupo,
      p_de_grupo: opts.deGrupo || null, p_fecha: fecha, p_motivo: opts.motivo || 'transicion',
    });
    if (!rpc.error) return { grupo: aGrupo, movimientoId: rpc.data };
    /* función no instalada → dos escrituras sueltas (no transaccional) */
    if (rpc.error.code !== 'PGRST202' && rpc.error.code !== '42883') throw rpc.error;
    await updateAnimalCampos(animalId, { grupo: aGrupo });
    const { data, error } = await client().from('movimientos_grupo').insert({
      animal_id: animalId, de_grupo: opts.deGrupo || null, a_grupo: aGrupo,
      fecha: fecha, motivo: opts.motivo || 'transicion',
    }).select('id').single();
    if (error) throw error;
    return { grupo: aGrupo, movimientoId: data && data.id };
  }
  async function deleteMovimientoGrupo(id) {
    if (!id) return true;
    const { error } = await client().from('movimientos_grupo').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  /* Historial de movimientos de grupo de un animal (para la línea de tiempo de
   * la ficha), más reciente primero. Vacío si la tabla aún no existe. */
  async function getMovimientosGrupo(animalId) {
    const resp = await client().from('movimientos_grupo')
      .select('id, de_grupo, a_grupo, fecha, motivo')
      .eq('animal_id', animalId).order('fecha', { ascending: false }).order('id', { ascending: false });
    if (resp.error) { if (resp.error.code === '42P01') return []; throw resp.error; }
    return resp.data || [];
  }

  async function registrarTratamiento(t) {
    const fila = {
      id: t.id || _idUnico('T-'), animal_id: t.animalId,
      /* el campo principal es el TRATAMIENTO (medicamento); la enfermedad
       * (problema) es opcional — hoy no se captura en los formularios. */
      problema: t.problema || null, medicamento: t.medicamento,
      inicio: t.inicio || hoyFinca(),
      dias_retiro: t.diasRetiro || 0,   // el retiro va hasta inicio + dias_retiro (derivado)
      nota: t.nota || null,
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
      animal_id: p.animalId, fecha: p.fecha || hoyFinca(),
      motivo: p.motivo || null, resultado: p.resultado || null,
      prenez_meses: p.prenezMeses != null ? p.prenezMeses : null,
    };
    const { data, error } = await client().from('palpaciones').insert(fila).select().single();
    if (error) throw error;
    return data;
  }

  async function registrarParto(p) {
    const fila = {
      id: p.id || _idUnico('P-'), madre_id: p.madreId, cria_id: p.criaId || null,
      fecha: p.fecha || hoyFinca(),
      sexo_cria: p.sexo, peso_kg: p.pesoKg || null,
      tipo: p.tipo || 'normal', estado_cria: p.estadoCria || 'viva',
    };
    const { data, error } = await client().from('partos').insert(fila).select().single();
    if (error) throw error;
    _invalidarAnimales();
    return data;
  }

  /* Enlaza un animal YA existente como la cría de un parto sin cría: marca
   * partos.cria_id y, si se da, la madre en el animal (genealogía consistente).
   * La BD tiene un índice único en cria_id: si el animal ya es cría de otro
   * parto, el UPDATE falla (23505) y se traduce a un error claro. Para revertir
   * (Deshacer), llamar con criaId=null (desvincula) sin tocar la madre. */
  async function vincularCriaParto(partoId, criaId, madreId) {
    const up = await client().from('partos').update({ cria_id: criaId }).eq('id', partoId).select().single();
    if (up.error) {
      if (up.error.code === '23505') { up.error.code = 'CRIA_YA_VINCULADA'; }
      throw up.error;
    }
    if (criaId && madreId) {
      const upm = await client().from('animales')
        .update({ madre_id: madreId, origen: 'nacido_finca' }).eq('id', criaId);
      if (upm.error) throw upm.error;
    }
    _invalidarAnimales();   // el conteo de partos derivado cambia
    return up.data;
  }

  /* --- Parto completo (cría + parto + madre) en UNA transacción -------------- *
   * Usa la función registrar_parto_completo() de Postgres: o se guarda todo o
   * no se guarda nada (antes eran 3 escrituras sueltas y un fallo a mitad
   * dejaba la cría sin parto o la madre sin actualizar). Si la función aún no
   * está instalada en la base, cae a la secuencia clásica.                    */
  async function registrarPartoCompleto(p) {
    _invalidarAnimales();
    const partoId = p.id || _idUnico('P-');
    const fecha = p.fecha || hoyFinca();
    const { error } = await client().rpc('registrar_parto_completo', {
      p_madre_id: p.madreId, p_fecha: fecha, p_sexo: p.sexo,
      p_peso_kg: p.pesoKg || null, p_tipo: p.tipo || 'normal',
      p_estado: p.estadoCria || 'viva', p_parto_id: partoId,
      p_cria_id: p.criaId || null, p_cria_nombre: p.criaNombre || null,
      p_cria_raza: p.criaRaza || null,
    });
    if (!error) return partoId;
    /* función no instalada (migración pendiente) → secuencia clásica */
    if (error.code !== 'PGRST202' && error.code !== '42883') throw error;
    if (p.criaId) await insertAnimal({
      id: p.criaId, nombre: p.criaNombre || '(cría)', raza: p.criaRaza || null,
      grupo: 'cria', sexo: p.sexo,   // ambos sexos nacen como cría
      edadAnios: 0, nacimiento: fecha, origen: 'nacido_finca',
      madreId: p.madreId, pesoKg: p.pesoKg,
    });
    await registrarParto({ id: partoId, madreId: p.madreId, criaId: p.criaId || null,
      fecha: fecha, sexo: p.sexo, pesoKg: p.pesoKg, tipo: p.tipo, estadoCria: p.estadoCria });
    await updateAnimalCampos(p.madreId, { grupo: 'ordeño', inicio_lactancia: fecha,
      estado_repro: null, prenez_meses: null, ultima_palpacion: null });
    return partoId;
  }

  /* --- Registro de ordeño --------------------------------------------------- *
   * turno fijo 'dia' (total del día) para que el UNIQUE(animal,fecha,turno)
   * permita corregir (upsert) sin duplicar. fecha omitida = CURRENT_DATE.     */
  async function registrarOrdeno(animalId, litros, fecha) {
    /* fecha en la zona de la finca (no UTC): el UNIQUE(animal,fecha,turno) y el
     * histórico dependen de que "hoy" sea el día real en Colombia. */
    const L = Number(litros);
    if (isNaN(L) || L < 0) throw new Error('Litros inválidos: ' + litros);
    const f = fecha || hoyFinca();
    /* detectar "pisado": si YA había un valor distinto para ese día (otro
     * dispositivo o un registro previo), el upsert lo reemplaza en silencio.
     * Se lee antes para poder AVISARLO en vez de callarlo. */
    let previo = null;
    try {
      const { data: pre } = await client().from('ordenos')
        .select('litros').eq('animal_id', animalId).eq('fecha', f).eq('turno', 'dia').maybeSingle();
      if (pre) previo = Number(pre.litros);
    } catch (e) { /* si la lectura falla, seguimos: no bloquear el registro */ }
    const fila = { animal_id: animalId, litros: L, turno: 'dia', fecha: f };
    const { data, error } = await client()
      .from('ordenos')
      .upsert(fila, { onConflict: 'animal_id,fecha,turno' })
      .select().single();
    if (error) throw error;
    /* si se pisó un valor DISTINTO, se marca y se registra (no se calla) */
    if (previo != null && previo !== L) {
      data._pisado = { previo, nuevo: L, fecha: f };
      console.warn('Ordeño pisado: ' + animalId + ' ' + f + ' ' + previo + 'L → ' + L + 'L');
    }
    return data;
  }

  /* Ordeños de una fecha (default: hoy real) → mapa { animalId: litros } */
  async function getOrdenosFecha(fecha) {
    let q = client().from('ordenos').select('animal_id, litros').eq('turno', 'dia');
    q = fecha ? q.eq('fecha', fecha) : q.eq('fecha', hoyFinca());
    const { data, error } = await q;
    if (error) throw error;
    const map = {};
    (data || []).forEach(r => { map[r.animal_id] = r.litros; });
    return map;
  }

  /* Pagina una consulta completa de a 1000 (PostgREST corta en 1000 por
   * defecto: sin esto los históricos se truncaban en silencio con el tiempo).
   * mkQuery debe devolver una consulta NUEVA con orden determinista. */
  async function _paginado(mkQuery) {
    const filas = [];
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await mkQuery().range(desde, desde + 999);
      if (error) throw error;
      filas.push(...(data || []));
      if (!data || data.length < 1000) return filas;
    }
  }

  /* Ordeños históricos (datos reales para el histórico de producción).
   * Devuelve filas planas; la UI las agrupa por día/mes. */
  /* ordeños diarios; con `anio` filtra a ese año (una finca con 200+ animales y
   * años de historia no puede bajar TODO en cada carga). Sin anio, baja todo. */
  async function getOrdenos(anio) {
    return _paginado(() => {
      let q = client().from('ordenos')
        .select('animal_id, fecha, litros').eq('turno', 'dia');
      if (anio) q = q.gte('fecha', anio + '-01-01').lte('fecha', anio + '-12-31');
      return q.order('fecha', { ascending: true }).order('id', { ascending: true });
    });
  }

  /* --- Vacunaciones --------------------------------------------------------- */
  /* v.animalIds (lista de chapetas) es la forma NUEVA: guarda el evento + a
   * QUIÉNES se aplicó (vacunaciones_animales) en una transacción (RPC
   * registrar_vacunacion_completa). Sin animalIds, cae al comportamiento viejo
   * (solo el evento con conteo) — únicamente para compatibilidad. */
  async function registrarVacunacion(v) {
    const ids = (v.animalIds || []).map(String).filter(Boolean);
    if (ids.length) {
      const rpc = await client().rpc('registrar_vacunacion_completa', {
        p_tipo: v.tipo, p_animal_ids: ids,
        p_producto: v.producto || null, p_lote: v.lote || null,
        p_fecha: v.fecha || hoyFinca(), p_proxima: v.proxima || null, p_nota: v.nota || null,
      });
      if (!rpc.error) return { id: rpc.data, n_animales: ids.length };
      /* función no instalada (migración pendiente) → evento + lista en dos pasos */
      if (rpc.error.code !== 'PGRST202' && rpc.error.code !== '42883') throw rpc.error;
      const ev = await client().from('vacunaciones').insert({
        tipo: v.tipo, alcance: ids.length === 1 ? 'individual' : 'hato',
        animal_id: ids.length === 1 ? ids[0] : null, n_animales: ids.length,
        producto: v.producto || null, lote: v.lote || null,
        fecha: v.fecha || hoyFinca(), proxima: v.proxima || null, nota: v.nota || null,
      }).select().single();
      if (ev.error) throw ev.error;
      const det = await client().from('vacunaciones_animales')
        .insert(ids.map(id => ({ vacunacion_id: ev.data.id, animal_id: id })));
      if (det.error && det.error.code !== '42P01') throw det.error;   // sin tabla: queda solo el evento (legado)
      return ev.data;
    }
    const fila = {
      tipo: v.tipo, alcance: v.alcance || 'hato',
      animal_id: v.alcance === 'individual' ? (v.animalId || null) : null,
      n_animales: v.alcance === 'hato' ? (v.nAnimales != null ? v.nAnimales : null) : null,
      producto: v.producto || null, lote: v.lote || null,
      fecha: v.fecha || hoyFinca(),
      proxima: v.proxima || null, nota: v.nota || null,
    };
    const { data, error } = await client().from('vacunaciones').insert(fila).select().single();
    if (error) throw error;
    return data;
  }
  /* Lee las vacunaciones CON su lista de animales (v.animales_ids). Si la tabla
   * de la lista aún no existe (migración pendiente), cae a la lectura clásica
   * y animales_ids queda []. */
  async function getVacunaciones() {
    let filas;
    try {
      filas = await _paginado(() => client().from('vacunaciones')
        .select('id, tipo, alcance, animal_id, n_animales, producto, lote, fecha, proxima, nota, animales(nombre), vacunaciones_animales(animal_id)')
        .order('fecha', { ascending: false }).order('id', { ascending: true }));
    } catch (e) {
      filas = await _paginado(() => client().from('vacunaciones')
        .select('id, tipo, alcance, animal_id, n_animales, producto, lote, fecha, proxima, nota, animales(nombre)')
        .order('fecha', { ascending: false }).order('id', { ascending: true }));
    }
    return (filas || []).map(v => {
      v.animales_ids = (v.vacunaciones_animales || []).map(x => String(x.animal_id));
      delete v.vacunaciones_animales;
      return v;
    });
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
    const data = await _paginado(() => {
      let q = client().from('tratamientos')
        .select('id, animal_id, problema, medicamento, inicio, dias_retiro, activo, nota, animales(nombre)')
        .order('inicio', { ascending: false }).order('id', { ascending: true });
      if (soloActivos) q = q.eq('activo', true);
      return q;
    });
    /* retiro_leche_hasta se DERIVA (inicio + dias_retiro); se agrega al vuelo
     * para que la UI siga leyendo el mismo campo de siempre. */
    return (data || []).map(t => {
      if (t.inicio && t.dias_retiro > 0) {
        const d = new Date(t.inicio + 'T00:00:00');
        d.setDate(d.getDate() + t.dias_retiro);
        t.retiro_leche_hasta = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      } else t.retiro_leche_hasta = null;
      return t;
    });
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
    return _paginado(() => client().from('partos')
      .select('id, madre_id, cria_id, fecha, sexo_cria, peso_kg, tipo, estado_cria')
      .order('fecha', { ascending: false }).order('id', { ascending: true }));
  }

  async function getPalpaciones() {
    return _paginado(() => client().from('palpaciones')
      .select('id, animal_id, fecha, motivo, resultado, prenez_meses, animales(nombre)')
      .order('fecha', { ascending: false }).order('id', { ascending: true }));
  }

  /* --- Pesajes (historial de peso con fecha) --------------------------------
   * Cada pesaje se INSERTA (no pisa); animales.peso_kg/fecha_peso guardan el
   * más reciente como copia rápida y solo se actualizan si el pesaje nuevo es
   * de fecha igual o posterior (registrar uno viejo no retrocede la copia). */
  async function registrarPesaje(animalId, pesoKg, fecha) {
    const ins = await client().from('pesajes')
      .insert({ animal_id: animalId, peso_kg: pesoKg, fecha: fecha || hoyFinca() })
      .select().single();
    if (ins.error) throw ins.error;
    const f = ins.data.fecha;
    const act = await client().from('animales').select('fecha_peso').eq('id', animalId).single();
    if (!act.error && (!act.data.fecha_peso || f >= act.data.fecha_peso)) {
      const up = await client().from('animales')
        .update({ peso_kg: pesoKg, fecha_peso: f }).eq('id', animalId);
      if (up.error) throw up.error;
    }
    _invalidarAnimales();
    return ins.data;
  }

  async function getPesajes(animalId) {
    return _paginado(() => client().from('pesajes')
      .select('id, animal_id, fecha, peso_kg')
      .eq('animal_id', animalId)
      .order('fecha', { ascending: false }).order('id', { ascending: true }));
  }

  /* borra un pesaje (Deshacer). La copia rápida del animal la restaura quien
   * llama (conoce el valor previo); aquí solo se borra la fila. */
  async function deletePesaje(id) {
    const { error } = await client().from('pesajes').delete().eq('id', id);
    if (error) throw error;
    _invalidarAnimales();
    return true;
  }

  /* --- Respaldo y restauración --------------------------------------------- *
   * exportarTodo(): baja TODAS las tablas de datos a un objeto (para guardar
   *   como archivo .json). restaurarTodo(): vuelve a cargar ese archivo.       */
  const TABLAS_RESPALDO = [
    'potreros', 'animales', 'ordenos', 'palpaciones',
    'tratamientos', 'vacunaciones', 'vacunaciones_animales', 'partos', 'pesajes', 'movimientos_potrero', 'movimientos_grupo',
  ];
  /* columnas vigentes por tabla (espejo de schema.sql): la restauración filtra
   * cualquier columna desconocida (p.ej. de un respaldo de un esquema viejo)
   * para no reventar a mitad de carga. */
  const COLUMNAS_RESPALDO = {
    potreros: ['id', 'numero', 'dias_descanso', 'hato_actual', 'sugerido_siguiente', 'nota', 'created_at', 'updated_at'],
    animales: ['id', 'nombre', 'unidad_id', 'especie', 'raza', 'color', 'nota', 'grupo', 'sexo',
      'edad_anios', 'nacimiento', 'origen', 'inicio_lactancia', 'estado_repro', 'prenez_meses',
      'ultima_palpacion', 'madre_id', 'padre_id', 'peso_kg', 'fecha_peso', 'peso_nacer',
      'rol_toro', 'baja_motivo', 'baja_fecha', 'baja_valor', 'baja_nota', 'procedencia',
      'valor_compra', 'created_at', 'updated_at'],
    ordenos: ['id', 'animal_id', 'fecha', 'litros', 'turno', 'registrado_por', 'created_at'],
    palpaciones: ['id', 'animal_id', 'fecha', 'motivo', 'resultado', 'prenez_meses', 'registrado_por', 'created_at'],
    tratamientos: ['id', 'animal_id', 'problema', 'medicamento', 'inicio', 'dias_retiro', 'activo', 'nota', 'registrado_por', 'created_at'],
    vacunaciones: ['id', 'tipo', 'alcance', 'animal_id', 'n_animales', 'producto', 'lote', 'fecha', 'proxima', 'nota', 'registrado_por', 'created_at'],
    vacunaciones_animales: ['id', 'vacunacion_id', 'animal_id', 'created_at'],
    partos: ['id', 'madre_id', 'cria_id', 'fecha', 'sexo_cria', 'peso_kg', 'tipo', 'estado_cria', 'nota', 'registrado_por', 'created_at'],
    pesajes: ['id', 'animal_id', 'fecha', 'peso_kg', 'registrado_por', 'created_at'],
    movimientos_potrero: ['id', 'potrero_id', 'fecha', 'tipo', 'registrado_por', 'created_at'],
    movimientos_grupo: ['id', 'animal_id', 'de_grupo', 'a_grupo', 'fecha', 'motivo', 'registrado_por', 'created_at'],
  };
  /* baja una tabla COMPLETA paginando de a 1000 (PostgREST corta en 1000 por
   * defecto: sin esto el respaldo truncaba el histórico en silencio). */
  async function _bajarTablaCompleta(t) {
    const filas = [];
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await client().from(t).select('*')
        .order('created_at', { ascending: true }).order('id', { ascending: true }).range(desde, desde + 999);
      if (error) {
        if (error.code === '42P01') return filas;   // tabla aún no creada → vacía
        throw new Error(t + ': ' + error.message);  // error real: el respaldo ABORTA, no calla
      }
      filas.push(...(data || []));
      if (!data || data.length < 1000) return filas;
    }
  }
  async function exportarTodo() {
    const out = { app: 'Los Chagualos', version: 2, fecha: new Date().toISOString(), tablas: {} };
    for (const t of TABLAS_RESPALDO) out.tablas[t] = await _bajarTablaCompleta(t);
    return out;
  }
  /* tope de seguridad: un .json manipulado gigante congela la pestaña */
  const MAX_FILAS_RESTAURA = 200000;
  /* Restaura un respaldo REEMPLAZANDO todos los datos por los del archivo.
   * Ruta principal: RPC transaccional restaurar_respaldo() — o entra todo o no
   * cambia nada. Si esa función no está instalada, cae a un MERGE por upsert
   * (no transaccional, no borra filas nuevas). Valida y limpia ANTES de tocar
   * la base. NO toca `unidades` (config). */
  async function restaurarTodo(data) {
    if (!data || typeof data !== 'object' || !data.tablas || typeof data.tablas !== 'object')
      throw new Error('El archivo de respaldo no es válido (falta "tablas").');
    /* validación previa: tablas conocidas, arrays, filtrado de columnas viejas y tope de tamaño */
    const T = {}; let total = 0;
    for (const t of TABLAS_RESPALDO) {
      const filas = data.tablas[t];
      if (filas == null) { T[t] = []; continue; }
      if (!Array.isArray(filas)) throw new Error('Respaldo inválido: "' + t + '" no es una lista.');
      const cols = COLUMNAS_RESPALDO[t];
      T[t] = filas.map(f => {
        const limpia = {};
        for (const k of cols) if (f[k] !== undefined) limpia[k] = f[k];
        return limpia;
      });
      if (T[t].some(f => f.id == null))
        throw new Error('Respaldo inválido: hay filas de "' + t + '" sin id.');
      total += T[t].length;
    }
    if (total > MAX_FILAS_RESTAURA)
      throw new Error('El respaldo tiene ' + total + ' filas (tope ' + MAX_FILAS_RESTAURA + '); parece corrupto.');

    /* ruta principal: restauración transaccional en la base */
    const rpc = await client().rpc('restaurar_respaldo', { p: { tablas: T } });
    if (!rpc.error) { _invalidarAnimales(); return true; }
    /* función no instalada (migración pendiente) → merge clásico como respaldo */
    if (rpc.error.code !== 'PGRST202' && rpc.error.code !== '42883') throw rpc.error;

    const upsert = async (tabla, filas, opts) => {
      if (!filas || !filas.length) return;
      const { error } = await client().from(tabla).upsert(filas, opts);
      if (error) throw new Error('Restauración interrumpida en "' + tabla + '": ' + error.message +
        ' — las tablas anteriores ya se cargaron; corrige y vuelve a restaurar el mismo archivo.');
    };
    /* potreros primero (sin dependencias) */
    await upsert('potreros', T.potreros, { onConflict: 'id' });
    /* animales en dos fases: las FK madre/padre se referencian entre sí, así que
     * primero se cargan sin esas referencias y luego se completan. */
    if (T.animales.length) {
      await upsert('animales', T.animales.map(a => ({ ...a, madre_id: null, padre_id: null })), { onConflict: 'id' });
      const conRefs = T.animales.filter(a => a.madre_id || a.padre_id)
        .map(a => ({ id: a.id, madre_id: a.madre_id || null, padre_id: a.padre_id || null }));
      await upsert('animales', conRefs, { onConflict: 'id' });
    }
    /* tablas hijas (ya existen animales y potreros que referencian) */
    /* orden: vacunaciones antes que vacunaciones_animales (FK) */
    for (const t of ['ordenos', 'palpaciones', 'tratamientos', 'vacunaciones', 'vacunaciones_animales', 'partos', 'movimientos_potrero', 'movimientos_grupo']) {
      await upsert(t, T[t]);
    }
    _invalidarAnimales();
    return true;
  }

  /* --- Diagnóstico: ping de conexión ---------------------------------------- */
  async function ping() {
    const { count, error } = await client()
      .from('animales').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return { ok: true, animales: count };
  }

  return {
    CONFIG, client, hoyFinca,
    animalFromDB, animalToDB,
    getAnimales, getAnimal, getPotreros,
    insertAnimal,
    /* OJO: updateAnimal (update completo vía animalToDB) se retiró del API:
     * rellenaba con null todo campo ausente y podía vaciar la ficha. Para
     * updates usar SIEMPRE updateAnimalCampos (parcial). */
    registrarOrdeno, getOrdenosFecha, getOrdenos, deleteOrdeno,
    registrarVacunacion, getVacunaciones, deleteVacunacion,
    getProduccionMensual, getPartos, getPalpaciones, getTratamientos, terminarTratamiento, reactivarTratamiento,
    updateAnimalCampos, darDeBaja, deleteAnimal, deleteParto, deletePalpacion, deleteTratamiento,
    moverGrupo, deleteMovimientoGrupo, getMovimientosGrupo, vincularCriaParto, updateParto,
    registrarPesaje, getPesajes, deletePesaje,
    registrarTratamiento, registrarParto, registrarPartoCompleto, registrarPalpacion,
    exportarTodo, restaurarTodo,
    /* expuestos para las pruebas de contrato (schema ↔ store ↔ respaldo): NO
     * mutar en runtime; son la referencia de columnas/tablas del respaldo. */
    TABLAS_RESPALDO, COLUMNAS_RESPALDO,
    ping,
  };
});
