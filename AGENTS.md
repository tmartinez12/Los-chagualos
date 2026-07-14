# AGENTS.md — Onboarding para agentes de IA

> Instrucciones operativas para CUALQUIER agente de codificación (Codex,
> Cursor, Gemini CLI, etc.). Claude Code usa `CLAUDE.md` (mismo contenido,
> más detalle). Lee esto ANTES de tocar código.

## Qué es este proyecto

App de gestión de una finca lechera en Colombia. **Vanilla JS sin build**,
dos UIs (escritorio + móvil) sobre Supabase Postgres. La dueña no es técnica;
un push a la rama de trabajo ES un deploy a producción (GitHub Pages).

Mapa de documentos — consúltalos en este orden:
1. `PROJECT.md` — arquitectura, decisiones de diseño, rutas críticas.
2. `docs/REQUISITOS.md` — requisitos funcionales y reglas de negocio.
3. `GAPS.md` — deuda, riesgos y huecos de cobertura conocidos.
4. `supabase/README.md` — instalar/migrar la base (y qué NO re-ejecutar).

## Comandos

```bash
# Correr localmente (no hay build):
cd prototipo && python3 -m http.server 8099
#   → /index.html (móvil) y /escritorio.html (admin)

# Tests (correr antes de cada commit):
node prototipo/test/smoke.js          # contrato UI↔núcleo↔esquema
node prototipo/test/integracion.js    # + SQL real si hay Postgres (si no, salta)

# Lint mínimo:
node --check prototipo/app.js && node --check prototipo/escritorio.js \
  && node --check prototipo/core/store.js && node --check prototipo/core/rules.js \
  && node --check prototipo/core/acciones.js
```

Todo SQL nuevo se valida en un Postgres 16 local ANTES de entregarlo:
esquema fresco con `supabase/schema.sql` + la migración nueva DOS veces sobre
el esquema del commit anterior (idempotencia). Roles: `CREATE ROLE anon;
CREATE ROLE authenticated;`.

## Arquitectura en una línea

`escritorio.js` / `app.js` (UIs, estado local en scope global) →
`core/rules.js` (lógica pura compartida) + `core/acciones.js` (coreografía
de guardado con Deshacer) → `core/store.js` (ÚNICA frontera con Supabase) →
Postgres (tablas fuente + vista `v_animales` que deriva todo lo calculable).

## Reglas que no se rompen

1. **La UI nunca llama a Supabase directo** — todo por `LCStore`.
2. **Derivar, no guardar**: lo calculable (edad, DEL, parto estimado…) vive
   en la vista `v_animales`, jamás en columnas persistidas.
3. **Cambios de esquema = dos archivos**: migración idempotente nueva
   (`supabase/migracion-*.sql`) **y** `schema.sql`. Validar en local antes.
4. **NUNCA re-ejecutar** nada de `supabase/migraciones-aplicadas/`.
5. **Fechas SIEMPRE en hora de la finca** (`LCStore.hoyFinca()` / `isoHoy()` /
   `hoy_finca()` en SQL). Jamás `new Date().toISOString()` para fechar.
6. El parto usa `registrarPartoCompleto` (RPC transaccional) — no separarlo.
7. Si tocas un flujo `save*`: actualiza TODOS sus cachés locales y la reversa
   del "Deshacer" (local + BD), y verifica en navegador — no hay tests que
   atrapen esto.
8. Columnas/tablas nuevas → sincronizar `TABLAS_RESPALDO`/`COLUMNAS_RESPALDO`
   (store.js) y `TABLAS` (.github/scripts/respaldo.js); `integracion.js` lo
   verifica.
9. Todo texto libre de la BD pasa por `LCRules.esc()` antes de un `innerHTML`.
10. `core/vendor/` es librería vendorizada — no editarla.

## Convenciones

- **Idioma: español** en código nuevo y UI (hay spanglish heredado).
- Sufijo `M` = función del móvil que duplica una del escritorio.
- BD snake_case ↔ modelo JS camelCase (mapea store.js). Updates parciales
  SIEMPRE con `updateAnimalCampos(id, {snake_case})` — `updateAnimal` no
  existe a propósito.
- Patrón de guardado: aplicar local → `LCStore.*` → snack con "Deshacer" 5 s
  que revierte local **y** compensa en BD (`LCAcciones.ejecutarConDeshacer`,
  siempre pasando `snack`). Errores de guardado = snack honesto
  (`'⚠ … NO se guardó en la base — reintenta'`), nunca solo console.warn.
- Directriz vigente: features nuevas SOLO en el escritorio (el móvil se
  mantiene, no se amplía).

## Trampas conocidas (te van a morder)

- `test/fixtures/model.js` NO es la app — es fixture del smoke test.
- TDZ en scope global: código que corre al cargar no puede usar `const`
  declarados más abajo del mismo archivo (ya causó pantalla blanca).
- El enum `grupo` tiene tres representaciones: BD `'ordeño'`, filas del
  escritorio `'En ordeño'` (display), claves móviles `'ordeno'`. Mapear
  siempre (GRUPO_MODELO / GRUPO_KEY).
- PostgREST corta en 1000 filas EN SILENCIO: toda lectura nueva pagina
  (helper `_paginado` en store.js) con orden determinista + `id`.
- Caché de animales = 30 s; tras escribir, `_invalidarAnimales()` (las
  funciones del store ya lo hacen).
- Chips de vaca del móvil muestran `'042 Nombre'` sin `·`.
- Verificación en navegador: Chromium vía Playwright
  (`/opt/pw-browsers/…/chrome`); el stub de `window.LCStore` va DENTRO de
  `page.evaluate` (store.js lo pisa al cargar si usas addInitScript).

## Antes de commitear

`node --check` de lo tocado + `smoke.js` (+ `integracion.js` con Postgres si
tocaste SQL/store) + verificar el flujo real en Chromium. Un commit por unidad
lógica, mensaje en español que declare cambios de comportamiento. Push a la
rama de trabajo = producción: no subas nada a medias.
