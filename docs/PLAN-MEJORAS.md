# Plan de mejoras — resolver todos los problemas abiertos

> Consolida lo pendiente de `GAPS.md` (debilidades), `docs/AUDITORIA.md`
> (hallazgos técnicos A/M/B) y `docs/AUDITORIA-FLUJOS.md` (huecos de UX/flujos
> P1–P8). Ordenado por prioridad: primero lo que protege datos y usuarios,
> después lo que completa producto, al final la deuda estructural.
>
> **Regla de oro en cada tarea:** validar SQL en Postgres 16 local (schema +
> migración ×2) antes de entregar; `node prototipo/test/smoke.js` + navegador
> en ambas superficies antes de commitear; un commit por bloque, revertible.

## Leyenda de esfuerzo
🟢 pequeño (horas) · 🟡 medio (1–2 días) · 🔴 grande (proyecto aparte)
`[ ]` pendiente · `[~]` en progreso (parcial, ver sub-lista) · `[x]` hecho

---

## FASE 0 — Ya (0 código, protege datos hoy)
- [ ] 🟢 **Disparar `respaldo.yml` a mano** (Actions → Run workflow) y verificar
  que el artefacto `.json` se genera. El botón "Respaldo" del escritorio SÍ se
  probó y funciona (jul 2026) — falta confirmar el workflow automático de
  GitHub Actions específicamente.
- [~] 🟢 **Repo de GitHub público (DECISIÓN TOMADA, no pendiente).** Se decidió
  mantenerlo público por ahora (pasarlo a privado arriesgaba tumbar el sitio de
  GitHub Pages en el plan gratuito). Mitigación: no difundir la URL del repo;
  revisar si Pages en plan pago o un dominio propio resuelve esto sin exponer
  el código.
- [x] 🟢 **Correr las migraciones pendientes.** ✅ Confirmado en esta sesión:
  las 6 migraciones corrieron en la base real (incluida `migracion-vacunaciones.sql`,
  que faltaba y hacía fallar el respaldo — ver `supabase/README.md`). Probado
  en producción: el respaldo funciona.

## FASE 1 — Seguridad (lo CRÍTICO primero)
- [ ] 🔴 **A1 · Login + RLS.** Supabase Auth (email/clave o el login por PIN ya
  esbozado) + políticas RLS por rol (admin/operario). Al reactivar, revisar la
  edge function archivada `login-pin` (GAPS B8: JWT con service_role, rate-limit
  burlable, enumeración de usuarios) o reemplazarla por Supabase Auth nativo.
  Mientras tanto: no difundir la URL. **Es el problema #1; todo lo demás es
  secundario frente a esto.**
- [ ] 🟡 **A8 · Cerrar el XSS del todo.** `esc()` ya cubre listas/fichas/tablas;
  faltan los `innerHTML` de `snack()` que interpolan nombres, los headers de
  grupos, y sobre todo los `onclick` en strings que meten ids sin sanear.
  Meta: 0 `innerHTML` con dato de BD sin `esc()`; a mediano plazo, migrar
  `onclick="..."` a listeners con closures (habilita una CSP estricta).
- [ ] 🟢 **B9 (hecho en schema, verificar en la BD viva)** `REVOKE` sobre
  `profiles`/`login_attempts`/`outbox` — confirmar que corrió.

## FASE 2 — No perder registros (integridad de captura)
- [x] 🟢 **P1 (BUG) · Vaca nueva "en ordeño" no entra a la lista de leche.**
  ✅ `saveCompra`/`saveAlta` la añaden a `milkCows`/`cows` al crear y la quitan
  en el "Deshacer". Verificado en navegador.
- [x] 🟢 **P6/P7 · Honestidad y hora de la finca.** ✅ Copys honestos en todos
  los guardados; `isoAyerReal`/`diasDesdeReal`/edad-DEL de `saveCompra` y el
  "ordeño de ayer" móvil usan la hora de la finca.
- [x] 🟡 **A3 · Restauración segura.** ✅ Función Postgres transaccional
  `restaurar_respaldo()` (reemplazo total en una transacción) + tope de tamaño;
  fallback a merge si no está instalada. Validado en Postgres 16.
- [ ] 🟡 **A7 · Outbox real (offline). DIFERIDO a sesión dedicada.** Requiere
  convertir cada escritura en un comando serializable + despachador con
  reintento (online / al abrir), y **pruebas contra Supabase real** que este
  entorno no permite. El daño de UX que buscaba (copy que prometía sync
  inexistente) YA está corregido en P6; falta la *capacidad* offline. Hacerlo a
  medias es peor. Cola en `localStorage` con reintento en
  copy honesto — ya está.)

## FASE 3 — Completar los flujos (huecos de producto)
- [x] 🟡 **P2 · Alta móvil a la par del escritorio.** ✅ El alta móvil pide
  origen, número (chapeta), nombre y fecha de nacimiento (opcionales, con el
  siguiente número libre sugerido); valida chapeta duplicada; y **re-siembra
  `toroSeq`** del mayor toro real (`T0…`) para que el 2º toro comprado no choque
  la PK. Verificado con `node --check` + smoke.
- [x] 🟢 **P4 · Sexo y rol de toro editables.** ✅ El editor del escritorio
  expone `sexo` (♀/♂) y, para machos, "🐂 Toro reproductor" (`rol_toro`);
  ambos se persisten y actualizan la caché. Verificado.
- [x] 🟡 **P3 · Baja completa y visible.** ✅ Los formularios de baja (móvil y
  escritorio) capturan fecha (editable, máx. hoy), valor de venta y nota; ambas
  fichas muestran un banner "↧ Baja" (motivo · fecha · valor · nota) cuando el
  animal está de baja, con botón **"Revertir baja"** que lo devuelve al hato
  (más allá del Deshacer de 5 s). El store ya persistía los 4 campos. Verificado.
- [x] 🟢 **P5 · Parto sin fricción.** ✅ La madre puede ser de cualquier grupo
  adulto (horra, en ordeño o novilla; se prefieren horras y avisa si no es
  horra) en móvil y escritorio; número (chapeta) y nombre de la cría opcionales
  (valida chapeta duplicada antes de mutar). La madre no-horra se mueve bien a
  ordeño (grupo + lista de leche) con su reversa. Verificado en navegador.
- [x] 🟢 **Paridad de captura móvil:** ✅ fecha editable (máx. hoy) en palpación
  y vacunación del móvil; `proxima` y `nota` en la vacunación móvil; el
  tratamiento del escritorio cubre **todo el hato** (el móvil ya lo hacía).
  Verificado en navegador.
- [x] 🟢 **Ordeño:** ✅ selector de fecha (máx. hoy) en el modal de leche del
  móvil (corrige un día olvidado sin el truco de "leche de ayer"; no toca el
  tablero de hoy si es fecha pasada); tope de litros unificado en
  `LCRules.LITROS_MAX = 99.9` (CHECK de la BD) para móvil, modal de escritorio
  y parrilla semanal, con `clampLitros()` compartido. Verificado.
- [x] 🟡 **P8 · Ficha móvil rica.** ✅ La ficha del móvil ahora muestra días
  abiertos (desde el último parto si no está preñada) y ganancia g/día como KPIs,
  peso con su fecha y días vacía en la genealogía, y una historia detallada real
  ordenada por fecha (partos con cría/peso, palpaciones, tratamientos con retiro,
  vacunas) en vez de 3 eventos genéricos. Carga partos/tratamientos/palpaciones
  una vez y re-pinta la ficha abierta al llegar. Verificado en navegador.
- [x] 🟢 **`ganancia_dia_g`:** ✅ resuelto por "derivar, no guardar": se elimina
  la columna persistida (era muerta, nunca se calculaba) y pasa a DERIVARSE en
  `v_animales` como ganancia media diaria desde el nacimiento (g/día). Migración
  `migracion-ganancia.sql` (idempotente) + `schema.sql` + store (no la escribe,
  fuera de `COLUMNAS_RESPALDO`) + seed/guía de importación. Validado en Postgres
  16 local (fresh install, migración ×2, compatibilidad con `restaurar_respaldo`).

## FASE 4 — Integridad y escala (backend)
- [x] 🟢 **Agregar un parto histórico desde la ficha.** ✅ Botón "＋ Agregar
  parto" junto a la tabla de partos de la ficha del escritorio: registra un parto
  pasado (fecha, sexo/tipo/resultado opcionales, vincula una cría existente por
  número) que suma al conteo, al intervalo y a las lactancias SIN tocar el grupo
  ni el DEL actuales de la madre. Con "Deshacer" y reversa en la base. Verificado.
- [x] 🟡 **Concurrencia (last-write-wins).** ✅ `updateAnimalCampos(id,campos,
  expectedUpdatedAt)` hace la actualización condicionada al `updated_at` leído
  (trigger `set_updated_at`): si otro dispositivo cambió la fila, 0 filas →
  error `CONFLICTO` y las fichas (móvil + escritorio) avisan "otro dispositivo
  cambió esta ficha — recarga". `registrarOrdeno` lee el valor previo y, si se
  pisó un valor DISTINTO al que la pantalla mostraba, lo avisa y lo loguea en
  vez de callarlo. Semántica OCC validada en Postgres 16 (update condicionado
  con `updated_at` viejo → 0 filas; actual → 1).
- [x] 🟢 **B1 · IDs con sufijo aleatorio.** ✅ `LCRules.idUnico(prefijo)` (y su
  espejo `_idUnico` en el store) generan `prefijo + tiempo(base36) + '-' + 6
  chars aleatorios`; reemplaza los `'P-'/'T-'+Date.now()` de parto y tratamiento
  (móvil, escritorio y fallbacks del store). Dos dispositivos en el mismo
  milisegundo ya no chocan la PK (100k ids en un bucle apretado → 99999 únicos).
- [x] 🟢 **Secuencias de chapeta seguras:** ✅ además de validar contra el caché
  local antes de insertar (P2/P5), `insertAnimal` detecta la violación de
  unicidad de la PK (`23505` → `ID_DUPLICADO`) y las altas (móvil + escritorio)
  avisan claro "el número X ya existe (¿otro dispositivo?) — usa otro número" en
  vez de un genérico "no se guardó". Dos teléfonos que elijan el mismo número ya
  no producen un duplicado silencioso: gana el primero y el segundo lo sabe.
- [x] 🟡 **Escala de lecturas:** ✅ `getOrdenos(anio)` filtra los ordeños al año
  seleccionado (antes bajaba TODA la historia diaria en cada carga); el
  escritorio carga solo `ANIO_SEL` y re-descarga al cambiar de año, y la lista de
  años sale del resumen mensual (`v_produccion_mensual`, liviano) + partos, no de
  los ordeños. La caché de animales sube de 3 s a 30 s (`ANIM_CACHE_TTL`): la
  invalidación real ya es por evento (cada escritura), el TTL solo acota ver
  cambios de otro dispositivo; con 200+ animales ya no re-descarga toda la tabla
  en cada navegación.

## FASE 5 — Calidad y deuda estructural (para poder cambiar sin miedo)
- [x] 🟡 **Tests de integración** (GAPS §2). ✅ `prototipo/test/integracion.js`:
  (A) núcleo en JS puro — paginación de `_paginado` en el borde 1000/1001 (0/999/
  1000/1001/2000/2001) con un cliente Supabase falso, `idUnico` y `clampLitros`;
  (B) SQL contra Postgres real (si hay uno, si no se SALTA) — `schema.sql` instala
  limpio, `registrar_parto_completo` (cría+parto+madre, mortinato, transaccional),
  `restaurar_respaldo` (reemplazo total, rollback ante FK inválida y payload
  inválido), derivaciones de `v_animales` (edad/DEL/leche/retiro/ganancia/parto),
  e idempotencia ×2 de las migraciones re-ejecutables. Aserciones en SQL con
  `RAISE EXCEPTION`. **Prerequisito de la Fase 6.**
- [x] 🟢 **CI más estricto:** ✅ `ci.yml` levanta un servicio `postgres:16`,
  instala `psql`, corre `node --check` de todo (incluido el nuevo test), la
  prueba de humo y las pruebas de integración con el Postgres de servicio.
- [x] 🟢 **Una sola fuente del esquema:** ✅ en vez de derivar de un módulo, el
  trío schema ↔ store ↔ respaldo quedó **auto-verificado** en `integracion.js`:
  (a) `COLUMNAS_RESPALDO` (store) se compara contra las columnas REALES de cada
  tabla (`information_schema`) — una columna nueva sin agregar falla el test;
  (b) `TABLAS_RESPALDO` ↔ claves de `COLUMNAS_RESPALDO`; (c) `TABLAS`
  (respaldo.js) ↔ store. Se exponen `TABLAS_RESPALDO`/`COLUMNAS_RESPALDO` desde
  el store (solo lectura) y rule 8 de CLAUDE.md ahora apunta al test.
- [x] 🟢 **Limpiar código muerto** (GAPS §1): ✅ eliminados `fichas={}` (siempre
  vacío; todos sus accesos caían al fallback o a guardas `if(fi)` estáticamente
  falsas), `diaOverrides`/`editDiaCell`/`diaKey` (descableados; `diaVal` ahora lee
  directo `ordenosDiaMap`) y `partoInfo={}` (nunca se escribía). Verificado en
  navegador (goVaca, saveTrata, openParto, diaVal) sin cambios de comportamiento.
  **`estadoBase()` NO se movió a rules.js a propósito:** manipula el DOM y
  `rules.js` debe seguir siendo puro/cargable en Node (lo requieren smoke.js e
  integracion.js); moverlo rompería los tests. La duplicación (≈8 líneas por
  página) no justifica crear un módulo UI-solo-navegador nuevo.
- [x] 🟢 **Cache-busting automático.** ✅ El repo deja el placeholder `?v=dev` en
  los 3 HTML; `pages.yml` inyecta el SHA corto del commit al publicar (paso sed
  antes de subir el artefacto), así cada despliegue invalida la caché sin bump
  manual. CLAUDE.md rule 5 actualizado.
- [ ] 🟢 **Deploy con revisión (DECISIÓN DE LA DUEÑA).** Hoy Pages publica en
  cada push a la rama de trabajo (`pages.yml` dispara en `claude/youthful-cannon-
  l903re`, path `prototipo/**`) — push = producción, sin staging. Pasar a "Pages
  desde `main` + PRs" implica: (1) designar/crear la rama `main` como default
  (hoy el default es una rama `claude/*`, no hay `main`); (2) cambiar el trigger
  de `pages.yml` a esa rama; (3) trabajar por PRs hacia ella. Cambia el flujo de
  trabajo de la dueña, así que **no se ejecuta unilateralmente**: queda como
  recomendación con los pasos listos.
- [x] 🟢 **Actualizar/archivar `PLAN-arquitectura.md` y `PLAN-backend.md`.** ✅
  Banner "ARCHIVADO / DESACTUALIZADO" al inicio de ambos, apuntando a la realidad
  vigente (`PROJECT.md`, `GAPS.md`, `supabase/README.md`, `PLAN-MEJORAS.md`). Se
  dejan en su sitio (varios docs los referencian) en vez de mover archivos.

## FASE 6 — Refactor de raíz (opcional, alto valor a largo plazo)
- [x] 🔴 **M14 · Unificar los flujos `save*`.** ✅ Los 6 flujos migrados.
  Se creó `core/acciones.js` con `ejecutarConDeshacer()`: la coreografía
  compartida (aplicar local → escribir BD → si falla, snack honesto → el snack
  de éxito ofrece "Deshacer" que revierte local y compensa BD, esperando SIEMPRE
  a que la escritura original termine antes de compensar). Las páginas siguen
  dando el `aplicar`/`revertir` (pintado y cachés — eso sigue siendo específico
  de cada superficie hasta que exista Estado único) por closures; lo compartido
  es el control de flujo async + el manejo de errores/undo.
  - [x] **Secado** (piloto) — migrado en escritorio y móvil. De paso corrige una
    inconsistencia real: escritorio NO esperaba a que la escritura original
    terminara antes de compensar en el "Deshacer" (riesgo de carrera: la reversa
    podía llegar a la BD antes que el cambio original y quedar pisada); móvil sí
    lo hacía bien. Con la coreografía compartida, las dos superficies ahora
    esperan siempre. Verificado en Chromium: camino feliz, deshacer, y error de
    BD (ambas superficies, sin cambios de comportamiento salvo la corrección
    de la carrera).
  - [x] **Tratamiento** — migrado en escritorio y móvil. Aquí las dos
    superficies YA esperaban la escritura original antes de compensar (sin la
    carrera del secado); el cambio es puramente de duplicación. Preserva el
    encadenado propio del móvil (escribir → desencolar+recargar lista;
    deshacer → borrar→recargar lista, en ese orden). Verificado en Chromium:
    camino feliz, deshacer, y error de BD (ambas superficies).
  - [x] **Baja** — migrado en escritorio y móvil (incluye fecha/valor/nota de
    Fase 3). Igual que secado: NINGUNA de las dos superficies esperaba la
    escritura original antes de compensar en el "Deshacer" — la coreografía
    compartida corrige la carrera en ambas. `revertirBaja`/`revertirBajaM`
    (la acción "más allá del Deshacer de 5 s") quedan FUERA de este piloto a
    propósito: no tienen forma de "deshacer" (no es de los 6 flujos con
    coreografía optimista-con-undo), así que no encajan en
    `ejecutarConDeshacer`. Verificado en Chromium: camino feliz, deshacer
    (incluye el conteo `nBajas`, el drill-down por grupo y la reaparición en
    la lista de leche), y error de BD (ambas superficies).
  - [x] **Palpación** — migrado en escritorio y móvil; el más ramificado hasta
    ahora (escritorio: 3 caminos — prenada/vacía/anotación libre; móvil: 2 —
    prenada/vacía). La rama "anotación libre" (escritorio) y "vacía" (móvil) NO
    tienen "Deshacer" en el original (son notificación simple, sin forma clara
    de revertir el estado reproductivo). Esto obligó a generalizar
    `ejecutarConDeshacer`: **`revertir` ahora es opcional** — sin él, muestra un
    snack simple sin botón (antes siempre exigía un "Deshacer"). Probado también
    a nivel Node (3 casos: con undo, sin undo, error de BD) antes de tocar el
    navegador. Verificado en Chromium las 5 combinaciones (3 en escritorio, 2 en
    móvil): camino feliz, deshacer donde aplica, y que las ramas sin undo
    correctamente NO muestran el botón.
  - [x] **Leche** — migrado en escritorio y móvil (móvil: 2 ramas — fecha de
    hoy / fecha pasada de Fase 3). Aquí las superficies YA diferían a propósito:
    escritorio ofrece "Deshacer" en `saveMilk`, el móvil NUNCA lo ofreció en
    ninguna de sus dos ramas (se corrige tocando el tile de nuevo, no con un
    botón). Se preservó esa asimetría real (no se agregó undo donde no había).
    También se preservó el aviso de "pisado" (last-write-wins: otro dispositivo
    tenía un valor de hoy distinto) dentro de `escribir`. Verificado en
    Chromium: camino feliz + deshacer + pisado simulado + error de BD
    (escritorio), y las 2 ramas sin undo del móvil (incluye que la fecha pasada
    NO toca el tile de hoy).
  - [x] **Parto** — migrado en escritorio y móvil, el más complejo de los 6
    (cría + parto + madre, transacción RPC `registrar_parto_completo`,
    validación de chapeta duplicada). **De paso corrige un BUG REAL en ambas
    superficies**, presente desde antes de este piloto: la compensación en BD
    del "Deshacer" (`madreAntes`) se calculaba DESPUÉS de mutar la madre local
    (grupo→ordeño, DEL→0…), así que al deshacer un parto la pantalla volvía
    bien a "horra/preñada" pero la BASE DE DATOS quedaba con la madre en
    "ordeño" con un `inicio_lactancia` falso — la compensación re-escribía el
    mismo estado post-parto en vez del previo. Confirmado antes de tocar código
    con `LCRules.snapshotReproDB` en un objeto mutado en el orden real, y
    verificado después en Chromium que la compensación real ahora manda
    `{grupo:'horra', estado_repro:'prenada', prenez_meses:9, ...}` (antes:
    `{grupo:'ordeño', estado_repro:null, ...}`) en las dos superficies. También
    verificado: camino feliz (cría creada, madre a ordeño DEL 0), deshacer,
    chapeta duplicada rechazada sin escrituras, y mortinato (sin cría).
  - **M14 completo.** Los 6 flujos (secado, tratamiento, baja, palpación, leche,
    parto) comparten ahora `core/acciones.js`. La duplicación de la coreografía
    async (aplicar/escribir/error-honesto/deshacer-compensado) quedó eliminada;
    el estado local (`hato`, `animalesPorId`, `cows`, `grupos`, …) sigue siendo
    específico de cada página — eso es "Estado único", el siguiente ítem.
- [~] 🔴 **Estado único (EN PROGRESO).** Reemplazar las ~13 estructuras
  paralelas (`hato`, `animalesPorId`, `milkCows`, `_partosRaw`…) por una fuente
  de estado con re-render (o re-fetch dirigido). Mata la clase entera de bugs
  de "caché desactualizado tras acción". Elegido: **fórmula local** (espejo de
  las derivaciones de `v_animales`, verificado exacto contra Postgres) en vez
  de re-fetch tras cada escritura — mantiene la UI instantánea, mismo patrón
  que ya usaba `hoyFincaDate()`/`diasDesdeReal()` (Fase 2) para DEL/edad.
  - [x] **Paso 1 (escritorio): `proximosPartos`/`vacasVacias`/`palpCandidatas`
    derivados de `animalesPorId`.** Antes eran arrays parcheados a mano por
    cada acción (parto/palpación/secado/baja) — exactamente el patrón de bug
    que este ítem quiere eliminar. Ahora son `derivarProximosPartos()`/
    `derivarVacasVacias()`/`derivarPalpCandidatas()`, funciones puras sobre
    `animalesPorId`, invocadas vía `recomputarRepro()`.
    - **`core/rules.js`**: nuevas `partoEstimadoCalc`/`secarCalc`/
      `diasVaciaCalc`/`prenezMesesActual` — espejo EXACTO de
      `parto_estimado_calc`/`secar_calc`/`dias_vacia_calc`/
      `prenez_meses_actual` de `v_animales` (ver `supabase/schema.sql`).
      Verificadas contra Postgres 16 antes de escribir código de UI, y ahora
      **guardadas como test permanente** en `integracion.js` ("fórmulas de
      fecha de v_animales ↔ core/rules.js") — si alguien cambia la fórmula SQL
      sin actualizar el espejo JS, el test lo atrapa.
    - **Huecos reales corregidos de paso**: `saveSeca` y `savePalp` (escritorio)
      NO actualizaban `animalesPorId` localmente (solo mutaban `hato`/arrays
      de UI) — quedaba desincronizada hasta el próximo recargo. Ahora ambas
      guardan un snapshot COMPLETO antes de mutar (para el "Deshacer") y
      actualizan `animalesPorId` de verdad.
    - **Cambio de comportamiento intencional y verificado**: la rama
      "anotación libre" de palpación (nota sin resultado prenada/vacía claro)
      ya NO saca al animal de "candidatas a palpar" si su estado real sigue sin
      resolver (antes desaparecía de la lista aunque nada se hubiera decidido,
      por ser un parche manual incondicional). Documentado, no oculto.
    - **Deliberadamente NO tocado en este paso**: `saveParto`/`saveBaja`
      (escritorio) siguen con su parche manual de `proximosPartos`/
      `vacasVacias` — sigue siendo CORRECTO (no genera bugs: `recomputarRepro()`
      simplemente sobrescribe con la verdad la próxima vez que corre), pero es
      candidato a una limpieza de seguimiento para unificar el patrón del todo.
    - **Móvil NO tocado**: tiene su propia estructura (`grupos[k].animales`,
      `cows`, contadores) completamente distinta — un paso separado.
    - Verificado en Chromium: servida→preñada (sale de candidatas, entra a
      próximos partos con fecha estimada correcta) + deshacer; servida→vacía
      (entra a vacías con motivo derivado) + deshacer; anotación libre (NO
      saca de candidatas si seguía sin resolver); secado (`animalesPorId.grupo`
      pasa a horra, `inicioLactancia` a null) + deshacer. Sin errores de página.
  - [x] **Paso 2 (escritorio): `parto`/`baja` unificados a `recomputarRepro()`.**
    `saveParto` ya no parcha `proximosPartos` a mano (quitaba/reponía por
    índice); ahora, como `animalesPorId[madre]` ya se actualizaba
    correctamente, basta con `recomputarRepro()` tras el `Object.assign` — una
    simplificación real, no solo un cambio de estilo.
    **Bug latente corregido de paso**: `darDeBaja` no toca `estado_repro`, así
    que una vaca vacía/servida/preñada dada de baja **seguía apareciendo**
    en "vacías por decidir"/"candidatas a palpar"/"próximos partos" — ya desde
    antes de cualquier trabajo de esta sesión, con o sin las listas derivadas.
    Las tres funciones `derivar*` ahora excluyen `grupo==='baja'` explícitamente
    (además de que `saveBaja` y `revertirBaja` llaman `recomputarRepro()`).
    Verificado en Chromium: parto saca/repone a la madre de `proximosPartos`;
    baja saca a una vaca vacía de `vacasVacias` Y `palpCandidatas` a la vez
    (antes solo lo hacía en apariencia, por casualidad de que baja nunca las
    tocaba) + deshacer; `revertirBaja` la repone en las listas si su estado
    reproductivo real seguía vigente. Sin errores de página.
  - [x] **Paso 3: mismo patrón en móvil.** `proximosPartos`/`vacasVacias`/
    `palpCandidatas` (app.js) se derivan de `animalesPorIdM` igual que en
    escritorio, respetando las formas propias del móvil (`vacasVacias` solo
    trae vacías con ≥120 días, sin servidas — pantalla de "requieren decisión",
    no de "todo lo pendiente"; `palpCandidatas` es un objeto `cow→motivo`, no
    un array). Nuevas `derivarProximosPartosM`/`derivarVaciasM`/
    `derivarPalpCandidatasM`/`recomputarReproM`.
    - **Misma carrera de escritorio, corregida igual**: `cargarReproMovil`
      bajaba su propia copia de `animales` en vez de llenar la caché global
      `animalesPorIdM` (el comentario en el código lo reconocía: "si este gana
      la carrera los KPIs saldrían en 0"). Ahora llena la caché global —
      cualquiera de los dos cargadores que gane, ya no importa.
    - **Huecos reales corregidos** (iguales a los de escritorio, ahora
      confirmados también en móvil): `savePalp` no actualizaba
      `animalesPorIdM` NI tocaba `palpCandidatas` en absoluto (una vaca recién
      palpada seguía apareciendo como "candidata" hasta recargar); `saveSeca`
      no actualizaba `animalesPorIdM`; `saveParto` actualizaba `grupo`/`del`/
      `inicioLactancia` de la madre pero NO `estadoRepro`/`prenez` (quedaba
      "prenada" localmente después de parir). El mismo bug de `baja` (no
      excluía de las listas) se confirmó presente también en móvil — mismo
      arreglo (`grupo!=='baja'` en las tres funciones `derivar*M`).
    - Verificado en Chromium: palpación (2 ramas, con y sin undo) + deshacer;
      parto (excluye/repone a la madre, corrige `estadoRepro`) + deshacer;
      secado (`animalesPorIdM.grupo`→horra) + deshacer; baja (saca a una vaca
      vacía de `vacasVacias` Y `palpCandidatas` a la vez) + deshacer;
      `revertirBajaM` la repone. Sin errores de página.
  - [x] **Paso 4a: `partosRecientes` (escritorio) derivado de `_partosRaw`.**
    Nueva `derivarPartosRecientes()`/`recomputarPartosRecientes()`. A
    diferencia de los pasos 1-3, esto NO tenía el mismo patrón de bug en los 2
    puntos que ya la tocaban (`saveParto` la mantenía sincronizada a mano
    correctamente) — pero investigar reveló **dos huecos reales más**, mismo
    patrón que los anteriores:
    - `savePartoHist` (parto histórico desde la ficha, Fase 4) pusheaba a
      `_partosRaw` pero **nunca tocaba `partosRecientes`** — un parto histórico
      agregado no aparecía en "Partos recientes" hasta recargar.
    - `saveCompra` (alta con partos históricos) tenía el mismo hueco.
    - `eliminarPartoHist` unificado de paso.
    Verificado en Chromium: `saveParto` (ya andaba bien, confirmado sigue
    andando) + deshacer; `savePartoHist` ahora SÍ aparece al toque (antes no);
    `eliminarPartoHist` saca de ambas listas. Sin errores de página.
    **Móvil NO tiene este hueco**: no existen `savePartoHist`/
    `eliminarPartoHist`/alta-con-partos-históricos ahí, así que no hay nada que
    corregir — replicar el patrón sería limpieza sin beneficio, no se hizo.
  - [ ] Paso 4b+: otras estructuras paralelas (`milkCows`/`cows`, historial
    sanitario) — evaluar caso a caso si hay un hueco real antes de tocarlas
    (`tratamientos`/`_tratamientosTodos` se revisaron y HOY están sincronizadas
    correctamente; no hay bug pendiente ahí).
- [ ] 🟡 **Módulos ES** por página (leche/hato/repro/sanidad) para salir del
  scope global y los sufijos `M`/TDZ.

---

## Orden recomendado y por qué
1. **Fase 0 + 1** — sin respaldo probado y sin auth, cualquier otro avance es
   frágil. La seguridad es lo único verdaderamente urgente.
2. **Fase 2** — que lo que se captura en campo NO se pierda ni mienta.
3. **Fase 3** — cerrar los huecos que la dueña siente a diario.
4. **Fase 4** — robustez de datos a medida que el hato crece.
5. **Fase 5** — poner la red de tests ANTES de tocar la estructura.
6. **Fase 6** — el refactor grande, solo cuando haya tests que lo protejan.

> Cada casilla `[ ]` es una tarea auto-contenida: se puede tomar
> "implementa P1 de PLAN-MEJORAS.md" y ejecutarla con su verificación.
