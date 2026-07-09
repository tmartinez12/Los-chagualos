# GAPS.md — Auditoría sin anestesia

> Estado real del proyecto a julio 2026, DESPUÉS de las Fases 0-6 de
> `docs/PLAN-MEJORAS.md` (ver ese documento para el detalle commit por commit).
> Esto es lo que sigue mal, frágil o feo, dicho sin diplomacia. La versión
> anterior de este archivo quedó desactualizada por el volumen de trabajo de
> esta sesión — reescrito de cero contra el código real, no contra memoria.

---

## 1. Deuda técnica

**Estado del frontend: ya no es contabilidad manual pura, pero tampoco es
Estado único.** `core/acciones.js` (M14) unificó la coreografía async de los 6
flujos de guardado (parto/palpación/secado/baja/leche/tratamiento) en las dos
superficies — ya no hay 12 copias de "aplicar → BD → deshacer". Además, el
dominio de reproducción (`proximosPartos`/`vacasVacias`/`palpCandidatas`) y
`partosRecientes` (escritorio) se DERIVAN de la caché canónica en vez de
parcharse a mano — esto encontró y corrigió **7 bugs reales** de
desincronización (ver Fase 6 en el plan). Lo que SIGUE siendo contabilidad
manual: `milkCows`/`cows` (registro de leche), el historial sanitario
(`tratamientos`/`_tratamientosTodos` — revisado, hoy está sincronizado
correctamente, sin bug conocido) y el hato mismo (`hato`/`animalesPorId`
siguen siendo dos estructuras separadas, sincronizadas a mano campo por
campo en cada acción).

**Los flujos de guardado ya NO están duplicados de raíz.** ✅ Resuelto por
M14: los 6 `save*` comparten `LCAcciones.ejecutarConDeshacer()`. Lo que sigue
duplicado es el ESTADO que cada superficie pinta (`hato` vs `grupos[k]`,
`milkCows` vs `cows`), que es un problema distinto (Estado único, no cubierto
para leche/hato todavía).

**Archivos monolíticos en scope global.** Sin cambios: `escritorio.js` ~2.900
líneas, `app.js` ~1.500, cero módulos, todo en `window`. Sigue siendo el
ítem "Módulos ES" del plan, no atacado.

**`onclick` en strings por todas partes.** Sin cambios. Sigue siendo la raíz
de que el XSS esté mitigado solo a medias (ver §4) y de que una CSP estricta
sea imposible.

**Duplicación de conocimiento del esquema: RESUELTO.** ✅ `COLUMNAS_RESPALDO`
(store.js) se verifica automáticamente contra las columnas reales de Postgres
en `prototipo/test/integracion.js` — si una columna nueva del esquema no entra
al respaldo, el test falla. `TABLAS_RESPALDO` ↔ `TABLAS` (respaldo.js) también
se verifican. ADEMÁS: las fórmulas de fecha de `v_animales`
(`parto_estimado_calc`/`secar_calc`/`dias_vacia_calc`/`prenez_meses_actual`)
tienen un espejo local en `core/rules.js` (para pintar optimista sin esperar
red) — ESE espejo también se verifica automáticamente contra Postgres.

**Código muerto: mayormente limpio.** ✅ `fichas={}`, `diaOverrides`/
`editDiaCell`, `partoInfo={}` — eliminados (Fase 5). `login-pin` — archivada
con advertencia clara. `PLAN-arquitectura.md`/`PLAN-backend.md` — archivados
con banner de "desactualizado". Sigue pendiente: `estadoBase()` duplicada
en los dos JS (decisión consciente de NO unificar — toca el DOM, y
`core/rules.js` debe seguir siendo puro/cargable en Node para los tests).

**Cache-busting: RESUELTO.** ✅ `pages.yml` inyecta el SHA del commit al
publicar; el repo deja el placeholder `?v=dev`. Ya no hay que acordarse de
subir un número a mano.

## 2. Cobertura de tests — de casi cero a un arnés real

**`prototipo/test/integracion.js` (nuevo) SÍ ejecuta flujos reales**, no solo
estática. Dos partes: (A) JS puro — paginación en el borde 1000/1001,
`idUnico`, `clampLitros`; (B) SQL contra Postgres real (si hay uno
alcanzable) — `registrar_parto_completo` (transaccional, con cría duplicada
forzando rollback), `restaurar_respaldo` (reemplazo total + rollback ante FK
inválida), derivaciones de `v_animales`, idempotencia de migraciones,
contrato de columnas del respaldo, paridad de fórmulas de fecha.

**Rutas críticas — estado real hoy:**
- `registrar_parto_completo` — ✅ con test de integración (rollback ante cría
  duplicada, verificado).
- Compensaciones de "Deshacer" (leche/trata/seca/baja/parto ×2 superficies) —
  ⚠️ verificadas A MANO en Chromium durante esta sesión (docenas de veces,
  documentado en cada commit de Fase 6), pero **sin un test automatizado que
  las proteja de una futura regresión**. Sigue siendo el hueco más grande de
  cobertura.
- `exportarTodo`/`restaurarTodo` — ✅ con test de integración (reemplazo total,
  rollback, tope de tamaño `MAX_FILAS_RESTAURA`).
- Paginación — ✅ con test (0/999/1000/1001/2000/2001 filas exactas).
- Cálculos de la vista SQL — ✅ con test de paridad SQL↔JS.
- Idempotencia de migraciones — ✅ con test (excepto `migracion-integridad`,
  que es orden-dependiente por diseño, documentado).
- `esc()`/XSS — SIGUE sin test de regresión.
- `respaldo.yml` (el workflow automático) — el botón manual de la app SÍ se
  probó en producción (jul 2026); el *workflow de GitHub Actions* en sí
  todavía no se disparó a mano para confirmar que corre solo.
- Tests de DOM/UI — sigue sin haber ninguno ESCRITO Y GUARDADO (se usó
  Playwright ad-hoc en cada sesión de trabajo para verificar, pero esas
  pruebas no quedan en el repo como regresión).

## 3. Bordes frágiles

- **Concurrencia entre dispositivos — PARCIALMENTE RESUELTO.** ✅
  `updateAnimalCampos(id, campos, expectedUpdatedAt)` soporta control de
  concurrencia optimista (compara `updated_at`; si otro dispositivo la
  cambió, lanza `CONFLICTO` y la UI avisa "otro dispositivo cambió esta
  ficha"). **Wireado HOY solo en el flujo de "Editar datos" de la ficha**
  (ambas superficies). Los 6 flujos de `core/acciones.js` (parto/palpación/
  secado/baja/leche/tratamiento) NO pasan `expectedUpdatedAt` — siguen siendo
  last-write-wins sin aviso.
- **IDs por `Date.now()` — RESUELTO.** ✅ `LCRules.idUnico()` (tiempo +
  sufijo aleatorio de 6 chars base36) reemplazó los `'P-'+Date.now()` en
  parto y tratamiento.
- **Secuencias locales de chapeta — RESUELTO.** ✅ Las altas (móvil y
  escritorio) validan contra la PK antes de escribir y avisan "el número X ya
  existe" en vez de fallar en silencio.
- **Ventana de "Deshacer" vs red lenta — RESUELTO.** ✅ `core/acciones.js`
  siempre espera a que la escritura original TERMINE antes de compensar
  (encontrado y corregido como bug real en secado/baja, que no lo hacían).
- **`restaurarTodo` — RESUELTO.** ✅ `restaurar_respaldo()` es transaccional
  (todo o nada) desde `migracion-restaurar.sql`, con `MAX_FILAS_RESTAURA =
  200000` como tope de tamaño.
- **Offline sigue sin existir.** Sin cambios (A7, diferido a propósito — ver
  el plan). El contador "pendientes" sigue siendo un entero en RAM.
- **Escala — RESUELTO.** ✅ `getOrdenos(anio)` filtra por año en vez de bajar
  toda la historia; la caché de animales subió de 3s a 30s (invalidación real
  es por evento, no por tiempo).
- **Reloj del dispositivo.** Sin cambios: un celular con fecha atrasada
  registra sin alerta. Bajo impacto (rango acotado por el CHECK de fecha
  futura), no atacado.
- **`turno='dia'` hardcodeado.** Sin cambios (B10, documentado, no resuelto
  de fondo — hoy no hay UI que use otro turno, así que no es un bug activo).
- **Tres nociones de "hoy" — PARCIAL.** `isoHoy()`/`isoHoyM()` ya delegan en
  `hoyFinca()` (Fase 2). Queda `HOY_LC` en `app.js` (capturado una sola vez al
  cargar la página, usado en `isoMasDiasM`/`isoPartoM` para estimar fechas de
  parto) — si la pestaña queda abierta mucho tiempo, esos cálculos usan una
  fecha vieja. Mitigado por el auto-reload a medianoche, pero sigue siendo una
  tercera fuente de "hoy".

## 4. Seguridad

| Severidad | Problema | Estado |
|---|---|---|
| **CRÍTICA** | Sin autenticación + RLS desactivado + `GRANT ALL` a `anon` + anon key pública en el repo. Cualquiera con la URL lee, modifica o borra TODO. | **SIN CAMBIOS — sigue siendo el problema #1.** (A1) |
| **ALTA** | XSS mitigado solo a medias: `esc()` cubre listas/fichas/tablas principales; quedan `innerHTML` de `snack()`/headers de grupo sin escapar, y todos los `onclick` en strings interpolan ids sin sanear. | **SIN CAMBIOS.** (A8) |
| **MEDIA** | La anon key no se puede rotar sin redesplegar (hardcodeada en `store.js` y `respaldo.js`). | Sin cambios. |
| **MEDIA** | `restaurarTodo` acepta cualquier JSON: valida estructura y ahora tamaño (`MAX_FILAS_RESTAURA`), no contenido semántico. | **PARCIAL** — mejoró (antes no tenía ni tope de tamaño). |
| **MEDIA** | `login-pin` huérfana con debilidades conocidas si se despliega tal cual. | **MITIGADO** — archivada en `supabase/edge-functions-archivadas/` con advertencia; no está desplegada. |
| **BAJA** | Sin CSP (los `onclick` inline lo impiden). Repo público — decisión consciente tomada (ver plan), no un descuido. | Repo: decisión documentada. CSP: sin cambios. |

## 5. Inconsistencias internas

- **Tres representaciones del enum `grupo`.** Sin cambios. `_normGrupo()`
  sigue siendo el parche que las hace convivir.
- **Cinco formatos de ID.** Sin cambios.
- **Español e inglés mezclados.** Sin cambios (cosmético, bajo impacto).
- **Tres nociones de "hoy".** Ver §3 — de tres a dos y media (queda `HOY_LC`
  en móvil para estimaciones de parto).
- **Manejo de errores no uniforme.** MEJORADO en las rutas tocadas esta
  sesión (todo lo que pasa por `core/acciones.js` usa `avisoError` con snack
  honesto de forma uniforme). Quedan `console.warn` mudos en rutas no
  tocadas (potreros, vacunaciones al cargar).
- **Dos sistemas de diseño CSS.** Sin cambios.
- **Convención `M` a medio camino.** Sin cambios estructurales; de hecho
  creció un poco (`derivarProximosPartosM`, `recomputarReproM`, etc. — nuevas
  funciones "M" para el paso 3 de Estado único), aunque siguen el patrón ya
  establecido, no uno nuevo.
- **Documentación que se contradice: RESUELTO.** ✅ `docs/PLAN-arquitectura.md`
  y `docs/PLAN-backend.md` tienen banner de "archivado/desactualizado" al
  inicio, apuntando a la realidad vigente.

---

## Si solo se pueden hacer tres cosas

1. **Auth + RLS** (la fila CRÍTICA). Sigue siendo lo único verdaderamente
   urgente — todo lo demás de esta sesión mejoró la casa, pero la puerta
   sigue sin cerradura.
2. **Test de regresión para "Deshacer"** — es la ruta más verificada a mano
   (docenas de veces en Chromium esta sesión) y la menos protegida contra una
   futura regresión silenciosa. Un arnés headless (Playwright, ya vendorizado
   en el entorno de desarrollo) que ejercite los 6 flujos × 2 superficies
   sería el mayor ROI de testing que queda.
3. **Cerrar el XSS del todo (A8).** Con la BD abierta a escritura anónima
   (fila #1), un `innerHTML` sin escapar es una cadena de ataque completa:
   quien escribe un nombre malicioso en la BD ejecuta JS en el navegador de
   la administradora. Mientras no haya login, esto es más urgente de lo que
   parece a simple vista.
