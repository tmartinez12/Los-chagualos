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

---

## FASE 0 — Ya (0 código, protege datos hoy)
- [ ] 🟢 **Disparar `respaldo.yml` a mano** (Actions → Run workflow) y verificar
  que el artefacto `.json` se genera. Nunca ha corrido en producción (GAPS §2).
- [ ] 🟢 **Confirmar que el repo de GitHub es privado** (los artefactos de
  respaldo contienen todos los datos de la finca).
- [ ] 🟢 **Correr las migraciones pendientes** en el SQL Editor, en orden:
  `migracion-integridad.sql` y `migracion-nacimiento.sql` (ver `supabase/README.md`).

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
- [ ] 🟢 **P5 · Parto sin fricción.** Permitir madre de cualquier grupo adulto
  (con aviso), y campos opcionales de nombre/chapeta de la cría.
- [ ] 🟢 **Paridad de captura móvil:** fecha editable en palpación y vacunación
  del móvil (hoy siempre "hoy"); `proxima`/`nota` en vacunación (el store ya las
  soporta); tratamiento sobre **todo el hato**, no solo vacas en ordeño.
- [ ] 🟢 **Ordeño:** selector de fecha (máx. hoy) en el modal de leche para
  corregir un día olvidado sin el truco de "leche de ayer"; unificar el tope de
  litros (hoy 60 escritorio / 99 móvil / 99,9 semanal).
- [ ] 🟡 **P8 · Ficha móvil rica.** Días abiertos, fecha de peso, lista de
  partos, historial sanitario detallado (hoy 3 eventos genéricos).
- [ ] 🟢 **`ganancia_dia_g`:** decidir — implementar su cálculo desde pesajes
  o eliminar la columna por migración (hoy es columna muerta).

## FASE 4 — Integridad y escala (backend)
- [ ] 🟢 **Agregar un parto histórico desde la ficha** (hoy solo al crear el
  animal) — tabla de partos de la ficha del escritorio con botón "+".
- [ ] 🟡 **Concurrencia (last-write-wins).** Comparar `updated_at` en
  `updateAnimalCampos` y avisar si otro dispositivo cambió la fila; al menos
  loguear el pisado del ordeño en vez de silenciarlo.
- [ ] 🟢 **B1 · IDs con sufijo aleatorio** (`'P-'+Date.now()+rand`) para evitar
  colisión de PK entre dispositivos en el mismo milisegundo.
- [ ] 🟢 **Secuencias de chapeta seguras:** `criaNum`/`altaSeq` desde un
  "siguiente libre" real, no del máximo cacheado (evita números duplicados con
  dos teléfonos abiertos).
- [ ] 🟡 **Escala de lecturas:** filtrar por año en `getOrdenos`/histcategory
  según pantalla; subir la caché de animales de 3 s o invalidar por evento en
  vez de por tiempo (con 200+ animales hoy re-descarga todo constantemente).

## FASE 5 — Calidad y deuda estructural (para poder cambiar sin miedo)
- [ ] 🟡 **Tests de integración** (lo que hoy NO existe, GAPS §2): un arnés
  Node + Postgres local que ejercite `registrarPartoCompleto` (y su fallback),
  las compensaciones de "Deshacer", `exportarTodo/restaurarTodo`, la paginación
  en el borde 1000/1001, e idempotencia de migraciones. **Prerequisito de la
  Fase 6.**
- [ ] 🟢 **CI más estricto:** correr esos tests en `ci.yml`; validar migraciones
  en un Postgres de servicio.
- [ ] 🟢 **Una sola fuente del esquema:** derivar `COLUMNAS_RESPALDO` (store.js)
  y `TABLAS` (respaldo.js) de un único módulo, o documentar el trío a
  sincronizar (schema ↔ store ↔ respaldo) — hoy se olvida en silencio.
- [ ] 🟢 **Limpiar código muerto** (GAPS §1): `fichas={}`, `diaOverrides/
  editDiaCell`, `partoInfo={}`; unificar `estadoBase()` (duplicada) en rules.js.
- [ ] 🟢 **Cache-busting automático** (hash o `?v=` derivado del commit) en vez
  de bump manual.
- [ ] 🟢 **Deploy con revisión:** Pages desde `main` + PRs, no desde la rama de
  trabajo (hoy cualquier push publica a producción).
- [ ] 🟢 **Actualizar/archivar `PLAN-arquitectura.md` y `PLAN-backend.md`**
  (describen actions.js/login/outbox que no existen).

## FASE 6 — Refactor de raíz (opcional, alto valor a largo plazo)
- [ ] 🔴 **M14 completo · Unificar los flujos `save*`.** Extraer las 6 acciones
  (parto/palpación/secado/baja/leche/tratamiento) con su coreografía
  (local → BD → undo compensado) a `core/acciones.js` compartido; las páginas
  solo pintan. Elimina la duplicación móvil/escritorio de raíz.
- [ ] 🔴 **Estado único.** Reemplazar las ~13 estructuras paralelas
  (`hato`, `animalesPorId`, `milkCows`, `_partosRaw`…) por una fuente de estado
  con re-render (o re-fetch dirigido). Mata la clase entera de bugs de
  "caché desactualizado tras acción". **Hacer solo con la Fase 5 lista.**
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
