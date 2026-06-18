/* =============================================================================
 * Los Chagualos · MODELO CANÓNICO DE DATOS  (core/model.js)
 * -----------------------------------------------------------------------------
 * Fuente única de verdad con forma de base de datos. NO contiene presentación
 * (nada de HTML, badges, clases CSS ni textos armados): eso se deriva en la UI.
 * NO contiene lógica de negocio: eso vive en core/rules.js y core/actions.js.
 *
 * Diseñado para escalar a otras unidades de negocio (café, miel, maíz) y a
 * módulos transversales (finanzas, potreros, cultivos) sin reestructurar.
 *
 * Compatible con <script> en el navegador (expone window.LCModel) y con Node
 * (module.exports) para el arnés de verificación.
 *
 * --- Reconciliación de divergencias móvil vs escritorio (Fase 0) ------------
 *  - Paloma (033) leche.ayer = 6 L. El escritorio tenía 9 L en milkCows, pero
 *    el hato, la producción mensual y el móvil coinciden en 6 → canónico 6.
 *  - "Muestra de 6/7 vacas" para registrar ordeño era un artefacto de UI, no
 *    un dato: el modelo tiene TODAS las vacas en ordeño (grupo 'ordeño').
 *  - Candidatas a palpar: unión de ambas listas (incluye 038 Mona) = 5.
 *
 * --- Notas para el futuro backend -------------------------------------------
 *  - Los `id` son estables e inmutables (no índices de array, no nombres).
 *  - `edadAnios` es provisional; con backend conviene guardar `nacimiento`
 *    (fecha) y derivar la edad. Se deja el campo `nacimiento` cuando se conoce.
 *  - Fechas en ISO `YYYY-MM-DD` para que mapeen directo a columnas DATE.
 *  - "Hoy" del prototipo = 2026-06-13.
 * ===========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.LCModel = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  /* --- Metadatos de la finca ------------------------------------------------ */
  const finca = {
    id: 'chagualos',
    nombre: 'Los Chagualos',
    hoy: '2026-06-13',
    moneda: 'COP',
  };

  /* --- Registro de unidades de negocio y módulos ---------------------------- *
   * `activa:false` = aparece como "próximamente". Agregar una unidad nueva es
   * solo añadir una entrada aquí; las entidades se asocian con su `unidad`.    */
  const unidades = [
    { id: 'leche', nombre: 'Leche', activa: true },
    { id: 'cafe',  nombre: 'Café',  activa: false },
    { id: 'miel',  nombre: 'Miel',  activa: false },
    { id: 'maiz',  nombre: 'Maíz',  activa: false },
  ];

  /* Módulos transversales (no son una unidad productiva, cruzan varias). */
  const modulos = [
    { id: 'hato',      nombre: 'Hato',        unidad: 'leche', activo: true },
    { id: 'potreros',  nombre: 'Potreros',    unidad: 'leche', activo: true },
    { id: 'sanidad',   nombre: 'Sanidad',     unidad: 'leche', activo: true },
    { id: 'repro',     nombre: 'Reproducción',unidad: 'leche', activo: true },
    { id: 'finanzas',  nombre: 'Finanzas',    unidad: null,    activo: false }, // futuro, transversal
    { id: 'cultivos',  nombre: 'Cultivos',    unidad: null,    activo: false }, // futuro (café/maíz)
  ];

  /* --- Enums / catálogos ---------------------------------------------------- */
  const enums = {
    grupo:       ['ordeño', 'horra', 'novilla', 'levante', 'ternera', 'macho', 'baja'],
    sexo:        ['H', 'M'],
    estadoRepro: ['prenada', 'servida', 'vacia', 'lactando', 'novilla', null],
    origen:      ['nacido_finca', 'comprado'],
    motivoBaja:  ['venta', 'muerte', 'descarte', 'perdida'],
    parto:       { tipo: ['normal', 'asistido'], estadoCria: ['viva', 'muerta'] },
  };

  /* ===========================================================================
   * ANIMALES  (unidad: leche)
   * Forma canónica de cada animal del hato. Campos en null = desconocido.
   *  - edadAnios: número (meses → /12). Provisional; backend usará `nacimiento`.
   *  - leche.ayer / leche.hoy: litros (null si no aplica / sin registrar).
   *  - retiroLecheHasta: fecha ISO o null.
   *  - prenez: { meses, partoEstimado(ISO), ultimaPalpacion(ISO) } o null.
   *  - baja: { motivo, fecha, valor } o null (solo grupo 'baja').
   * Genealogía: madreId / padreId con ids de otros animales (o null).
   * ===========================================================================*/
  const animales = [
    // -------- En ordeño (12) --------
    a('042', 'Lucero',    'Holstein × Gyr', 'ordeño', 'H', 5.2,  { del:152, partos:3, ayer:18, estadoRepro:'prenada',
        prenez:{ meses:6, partoEstimado:'2026-09-12', ultimaPalpacion:'2026-05-02' }, secarEstimado:'2026-07-12',
        madreId:'017', padreId:'T01', origen:'nacido_finca', pesoKg:480, fechaPeso:'2026-04-15' }),
    a('038', 'Mona',      'Gyrolando',      'ordeño', 'H', 4.1,  { del:98,  partos:2, ayer:16, estadoRepro:'servida',
        prenez:null, madreId:'011', padreId:'T01', origen:'nacido_finca', pesoKg:460, fechaPeso:'2026-04-15' }),
    a('051', 'Careta',    'Holstein × Gyr', 'ordeño', 'H', 3.2,  { del:121, partos:1, ayer:14, estadoRepro:'vacia',
        madreId:'033', padreId:'T01', origen:'nacido_finca', pesoKg:420, fechaPeso:'2026-03-15' }),
    a('027', 'Estrella',  'Gyrolando',      'ordeño', 'H', 3.8,  { del:64,  partos:1, ayer:13, estadoRepro:'vacia',
        madreId:'038', padreId:'T01', origen:'nacido_finca', pesoKg:440, fechaPeso:'2026-05-15' }),
    a('017', 'Azucena',   'Holstein',       'ordeño', 'H', 8.0,  { del:201, partos:5, ayer:11, estadoRepro:'prenada',
        prenez:{ meses:4, partoEstimado:null, ultimaPalpacion:'2026-05-01' },
        retiroLecheHasta:'2026-06-14', origen:'nacido_finca', pesoKg:510, fechaPeso:'2026-04-15' }),
    a('033', 'Paloma',    'Normando',       'ordeño', 'H', 6.5,  { del:95,  partos:4, ayer:6,  estadoRepro:'vacia',
        diasVacia:132, ultimaPalpacion:'2026-02-03', origen:'nacido_finca', pesoKg:490, fechaPeso:'2026-05-15' }),
    a('029', 'Pinta',     'Holstein × Gyr', 'ordeño', 'H', 7.0,  { del:412, partos:5, ayer:5,  estadoRepro:'vacia',
        diasVacia:150, ultimaPalpacion:'2026-01-18', origen:'comprado', pesoKg:470, fechaPeso:'2026-05-15' }),
    a('015', 'Mariposa',  'Gyrolando',      'ordeño', 'H', 5.0,  { del:180, partos:3, ayer:10, estadoRepro:'prenada',
        prenez:{ meses:4, partoEstimado:null, ultimaPalpacion:null } }),
    a('023', 'Candelaria','Holstein',       'ordeño', 'H', 6.0,  { del:142, partos:4, ayer:12, estadoRepro:'prenada',
        prenez:{ meses:3, partoEstimado:null, ultimaPalpacion:null } }),
    a('035', 'Rocío',     'Normando',       'ordeño', 'H', 4.5,  { del:110, partos:2, ayer:14, estadoRepro:'prenada',
        prenez:{ meses:5, partoEstimado:null, ultimaPalpacion:null } }),
    a('040', 'Nieve',     'Holstein × Gyr', 'ordeño', 'H', 3.5,  { del:88,  partos:1, ayer:15, estadoRepro:'prenada',
        prenez:{ meses:2, partoEstimado:null, ultimaPalpacion:null } }),
    a('046', 'Esperanza', 'Gyrolando',      'ordeño', 'H', 5.8,  { del:195, partos:3, ayer:9,  estadoRepro:'prenada',
        prenez:{ meses:7, partoEstimado:null, ultimaPalpacion:null }, secarEstimado:'2026-07-31' }),

    // -------- Horras / secas (9) — preñadas próximas a parir --------
    a('011', 'Violeta',   'Gyrolando',      'horra', 'H', 7.0,   { estadoRepro:'prenada', prenez:{ meses:8.5, partoEstimado:'2026-07-03', ultimaPalpacion:null } }),
    a('019', 'Canela',    'Holstein × Gyr', 'horra', 'H', 6.0,   { estadoRepro:'prenada', prenez:{ meses:8,   partoEstimado:'2026-07-18', ultimaPalpacion:null } }),
    a('045', 'Morena',    'Normando',       'horra', 'H', 5.5,   { estadoRepro:'prenada', prenez:{ meses:7.5, partoEstimado:'2026-08-02', ultimaPalpacion:null } }),
    a('008', 'Golondrina','Holstein',       'horra', 'H', 9.0,   { estadoRepro:'prenada', prenez:{ meses:7,   partoEstimado:'2026-09-12', ultimaPalpacion:null } }),
    a('036', 'Cereza',    'Gyrolando',      'horra', 'H', 4.0,   { estadoRepro:'prenada', prenez:{ meses:7,   partoEstimado:'2026-09-15', ultimaPalpacion:null } }),
    a('041', 'Garza',     'Holstein × Gyr', 'horra', 'H', 5.2,   { estadoRepro:'prenada', prenez:{ meses:6.5, partoEstimado:'2026-09-28', ultimaPalpacion:null } }),
    a('014', 'Nube',      'Gyrolando',      'horra', 'H', 6.8,   { estadoRepro:'prenada', prenez:{ meses:6,   partoEstimado:'2026-10-10', ultimaPalpacion:null } }),
    a('048', 'Flor',      'Normando',       'horra', 'H', 3.8,   { estadoRepro:'prenada', prenez:{ meses:5.5, partoEstimado:'2026-10-25', ultimaPalpacion:null } }),
    a('022', 'Luna',      'Holstein',       'horra', 'H', 7.5,   { estadoRepro:'prenada', prenez:{ meses:5,   partoEstimado:'2026-11-08', ultimaPalpacion:null } }),

    // -------- Novillas de vientre (muestra de 14) --------
    a('055', 'Princesa',  'Gyrolando',      'novilla', 'H', 2.1, { estadoRepro:'novilla', listaServicio:true, padreId:'T01', pesoKg:342 }),
    a('058', 'Alondra',   'Holstein × Gyr', 'novilla', 'H', 2.0, { estadoRepro:'novilla', listaServicio:true, pesoKg:335 }),
    a('061', 'Café',      'Normando',       'novilla', 'H', 1.9, { estadoRepro:'novilla', listaServicio:false, pesoKg:318 }),
    a('063', 'Dalia',     'Gyrolando',      'novilla', 'H', 1.7, { estadoRepro:'novilla', listaServicio:false, pesoKg:295 }),
    a('067', 'Sirena',    'Holstein',       'novilla', 'H', 1.5, { estadoRepro:'novilla', listaServicio:false, pesoKg:275 }),

    // -------- Hembras de levante (muestra de 18) --------
    a('066', 'Esmeralda', 'Gyrolando',      'levante', 'H', 1.17, { pesoKg:218, gananciaDiaG:480 }),
    a('068', 'Perla',     'Holstein × Gyr', 'levante', 'H', 1.08, { pesoKg:201, gananciaDiaG:470 }),
    a('070', 'Coral',     'Normando',       'levante', 'H', 0.92, { pesoKg:178, gananciaDiaG:490 }),

    // -------- Terneras (muestra de 11) --------
    a('064', 'Cría de Lucero', 'Holstein × Gyr', 'ternera', 'H', 0.42, { madreId:'042', padreId:'T01', desteteProximo:true }),
    a('069', 'Cría de Estrella','Gyrolando',      'ternera', 'H', 0.29, { madreId:'027', padreId:'T01' }),
    a('071', 'Cría de Canela', 'Holstein × Gyr', 'ternera', 'H', 0.38, { madreId:'019', padreId:'T01', desteteProximo:true }),
    a('073', 'Cría de Morena', 'Normando',       'ternera', 'H', 0.25, { madreId:'045', padreId:'T01' }),

    // -------- Machos / toros (2) --------
    a('T01', 'Sansón', 'Gyr', 'macho', 'M', 6.0,  { rolToro:true, montaNatural:true, hijasVivas:23, sanidadAlDia:true }),
    a('T02', 'Torete', 'Gyr', 'macho', 'M', 0.92, { ventaProgramada:'2026-08-01' }),

    // -------- Bajas · histórico 2026 (7) --------
    a('021', 'Lucía',          'Holstein × Gyr', 'baja', 'H', 8.0,  { baja:{ motivo:'venta',    fecha:'2026-05-04', valor:2100000, nota:'descarte por baja producción' } }),
    a('009', 'Manzana',        'Gyrolando',      'baja', 'H', 7.0,  { baja:{ motivo:'muerte',   fecha:'2026-04-18', valor:0,       nota:'timpanismo' } }),
    a('044', 'Estrella vieja', 'Holstein',       'baja', 'H', 11.0, { baja:{ motivo:'muerte',   fecha:'2026-03-11', valor:0,       nota:'parto complicado' } }),
    a('016', 'Perla',          'Normando',       'baja', 'H', 12.0, { baja:{ motivo:'venta',    fecha:'2026-02-20', valor:1800000, nota:'descarte por edad' } }),
    a('052', 'Nube',           'Gyrolando',      'baja', 'H', 6.0,  { baja:{ motivo:'perdida',  fecha:'2026-01-06', valor:0,       nota:'no apareció tras tormenta' } }),
    a('B-074M','Cría macho 058','Holstein × Gyr','baja', 'M', 0.1,  { madreId:'058', baja:{ motivo:'venta',  fecha:'2026-04-02', valor:900000, nota:'ternero macho' } }),
    a('B-075', 'Cría de Paloma','Normando',      'baja', 'H', 0,    { madreId:'033', baja:{ motivo:'muerte', fecha:'2026-04-20', valor:0,       nota:'mortinato' } }),
  ];

  /* ===========================================================================
   * PRODUCCIÓN DE LECHE
   *  - mensual: promedio de L/día por vaca y mes (null = sin ordeño ese mes).
   *    El detalle día por día se DERIVA en rules.js (no se almacena).
   *  - El total/promedio del hato se derivan; no se guardan.
   * ===========================================================================*/
  const MESES = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
  const DIAS_MES = [31, 28, 31, 30, 31, 12]; // junio truncado al "hoy"
  const produccionMensual = [
    { animalId:'042', litrosDia:[null,null,12.5,14.8,17.2,18.0] },
    { animalId:'038', litrosDia:[14.2,14.0,15.1,14.8,15.5,16.0] },
    { animalId:'051', litrosDia:[null,null,10.2,12.0,13.6,14.0] },
    { animalId:'027', litrosDia:[null,null,null,null,11.8,13.0] },
    { animalId:'017', litrosDia:[14.0,13.5,9.0,10.5,11.0,11.0] },
    { animalId:'033', litrosDia:[11.0,10.2,9.8,8.5,7.0,6.0] },
    { animalId:'029', litrosDia:[8.0,7.5,7.0,6.2,5.5,5.0] },
  ];

  /* ===========================================================================
   * LECHEROS Y ENTREGAS  (unidad: leche)
   *  - diasSemana: 0=domingo … 6=sábado.
   *  - precioLitro vigente. El histórico diario de entregas se DERIVA en rules.
   * ===========================================================================*/
  const tarifa = { precioLitro: 1950, moneda: 'COP' };
  const lecheros = [
    { id:'jose',  nombre:'Don José',           frecuencia:'diario',    diasSemana:[0,1,2,3,4,5,6], baseLitros:120, entregaAyer:120 },
    { id:'maria', nombre:'Quesería La María',  frecuencia:'lmv',       diasSemana:[1,3,5],         baseLitros:50,  entregaAyer:50  },
  ];
  /* Consumo interno que cierra el balance del día (terneras). */
  const consumoInterno = { terneras: 12 };

  /* ===========================================================================
   * REPRODUCCIÓN
   *  - palpacionesPendientes: animales en la lista para palpar (la lista se
   *    arma sola). `motivo` es el porqué entró.
   *  - Los "próximos partos" y "vacías que requieren decisión" se DERIVAN del
   *    estado reproductivo de los animales (estadoRepro + prenez/diasVacia),
   *    por eso no se guardan como listas aparte.
   * ===========================================================================*/
  const toro = { id:'T01', activo:true };
  const palpacionesPendientes = [
    { animalId:'027', motivo:'celo sin repetir — ¿preñada?' },
    { animalId:'051', motivo:'parida hace 121 días, sin celo visto' },
    { animalId:'038', motivo:'servida 3 jun, por confirmar' },
    { animalId:'033', motivo:'vacía hace 132 días' },
    { animalId:'029', motivo:'vacía hace 150 días' },
  ];

  /* ===========================================================================
   * PARTOS  (eventos · unidad: leche)
   *  - estadoCria: 'viva' | 'muerta'. criaId apunta al animal creado (o null).
   * ===========================================================================*/
  const partos = [
    { id:'P-2026-01', madreId:'042', criaId:'064',  fecha:'2026-01-12', sexo:'H', pesoKg:36, tipo:'normal',   estadoCria:'viva'  },
    { id:'P-2026-02', madreId:'027', criaId:'069',  fecha:'2026-02-28', sexo:'H', pesoKg:34, tipo:'normal',   estadoCria:'viva'  },
    { id:'P-2026-03', madreId:'033', criaId:'B-075',fecha:'2026-04-20', sexo:'H', pesoKg:41, tipo:'asistido', estadoCria:'muerta'},
  ];

  /* ===========================================================================
   * SANIDAD  (unidad: leche)
   *  - tratamientos activos. `retiroLecheHasta` también vive en el animal.
   * ===========================================================================*/
  const tratamientos = [
    { id:'T-017-01', animalId:'017', problema:'Mastitis', medicamento:'Antibiótico',
      inicio:'2026-06-10', diasRetiro:4, retiroLecheHasta:'2026-06-14', activo:true },
  ];

  /* ===========================================================================
   * POTREROS  (módulo: potreros · unidad: leche)
   *  - diasDescanso: días desde el último pastoreo. <0 = ocupado por el hato.
   *  - El estado (listo/recuperando/recién/ocupado) se DERIVA en rules.
   * ===========================================================================*/
  const potreros = (function () {
    const arr = [];
    for (let i = 1; i <= 32; i++) {
      let d;
      if (i === 7) d = -2;            // el hato está aquí (día 2)
      else if (i === 8) d = 1; else if (i === 9) d = 3;
      else if (i === 14) d = 2; else if (i === 21) d = 4;
      else d = 5 + ((i * 7) % 31);
      arr.push({ id:'P' + i, numero:i, diasDescanso:d,
        hatoActual:(i === 7), sugeridoSiguiente:(i === 4) });
    }
    return arr;
  })();

  /* ===========================================================================
   * Helper de construcción de animal — normaliza a la forma canónica.
   * ===========================================================================*/
  function a(id, nombre, raza, grupo, sexo, edadAnios, extra) {
    return Object.assign({
      id, nombre, unidad:'leche', especie:'bovino', raza, grupo, sexo,
      edadAnios, nacimiento:null, origen:null,
      // lactancia
      del:null, partos:0, leche:{ ayer:null, hoy:null },
      // reproducción
      estadoRepro:null, prenez:null, diasVacia:null, ultimaPalpacion:null,
      listaServicio:null, secarEstimado:null,
      // sanidad
      retiroLecheHasta:null,
      // genealogía
      madreId:null, padreId:null,
      // peso / levante
      pesoKg:null, fechaPeso:null, gananciaDiaG:null,
      // ternera / macho / baja
      desteteProximo:null, rolToro:null, montaNatural:null, hijasVivas:null,
      sanidadAlDia:null, ventaProgramada:null, baja:null,
    }, normalizaLeche(extra));
  }
  /* permite pasar `ayer` plano en extra → leche.ayer */
  function normalizaLeche(extra) {
    if (!extra) return {};
    const e = Object.assign({}, extra);
    if ('ayer' in e || 'hoy' in e) {
      e.leche = Object.assign({ ayer:null, hoy:null },
        { ayer:('ayer' in e ? e.ayer : null), hoy:('hoy' in e ? e.hoy : null) });
      delete e.ayer; delete e.hoy;
    }
    return e;
  }

  /* --- API del modelo: estado canónico + catálogos -------------------------- */
  return {
    finca, unidades, modulos, enums,
    animales, produccionMensual, MESES, DIAS_MES,
    lecheros, tarifa, consumoInterno,
    toro, palpacionesPendientes, partos, tratamientos,
    potreros,
  };
});
