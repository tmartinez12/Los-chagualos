# CLAUDE.md — Instrucciones operativas

App de gestión de finca lechera (Colombia). Vanilla JS sin build, dos UIs
(escritorio + móvil) sobre Supabase Postgres. **Arquitectura y contexto:
`PROJECT.md`** (qué es, cómo fluyen los datos, decisiones de diseño, rutas
críticas). **Problemas conocidos: `GAPS.md`** (deuda, tests faltantes, bordes
frágiles, seguridad con severidad). Historial de arreglos: `docs/AUDITORIA.md`.
Base de datos (instalar/migrar): `supabase/README.md`.

## Comandos

```bash
# Correr localmente (no hay build):
cd prototipo && python3 -m http.server 8099
#   → http://localhost:8099/index.html (móvil) y /escritorio.html (admin)

# Tests (correr antes de cada commit):
node prototipo/test/smoke.js          # 17 verificaciones de contrato UI↔núcleo↔esquema
node prototipo/test/integracion.js    # paginación + (si hay Postgres) RPCs, restauración,
                                      #   derivaciones e idempotencia de migraciones.
#   La parte SQL usa psql con variables libpq (PGHOST/PGPORT/PGUSER/PGPASSWORD);
#   sin Postgres alcanzable se SALTA (no falla). Crea/borra la base efímera lc_test.

# Lint (no hay linter; el mínimo es):
node --check prototipo/app.js && node --check prototipo/escritorio.js \
  && node --check prototipo/core/store.js && node --check prototipo/core/rules.js

# Validar SQL ANTES de que la dueña lo corra en Supabase (obligatorio):
#   levantar Postgres 16 local, cargar supabase/schema.sql en base fresca,
#   y la migración nueva DOS veces sobre una base construida con el schema
#   del commit anterior (idempotencia). Roles: CREATE ROLE anon; CREATE ROLE authenticated;

# Deploy: NO hay comando. git push a la rama de trabajo publica prototipo/
#   a GitHub Pages (pages.yml). Push = producción, sin staging.
# CI: ci.yml corre sintaxis+smoke en cada push. respaldo.yml exporta la base 2×/semana.
```

## Convenciones reales del código

- **Idioma:** código y UI en español (funciones `guardarEditarVaca`, textos al
  usuario). Hay spanglish heredado (`saveParto`, `cows`) — al crear código
  nuevo, prefiere español.
- **Sufijo `M`:** función del móvil que duplica una del escritorio
  (`isoHoy`/`isoHoyM`). Lógica pura compartida va en `core/rules.js`
  (LCRules); acceso a datos SOLO en `core/store.js` (LCStore).
- **Datos:** BD en snake_case, modelo JS en camelCase; `store.js` mapea.
  Updates parciales SIEMPRE con `updateAnimalCampos(id,{snake_case})`.
- **Estado UI:** estructuras paralelas en memoria (`hato`, `animalesPorId`,
  `grupos`, `milkCows`, `_partosRaw`…) actualizadas A MANO por cada acción.
  Patrón de guardado: aplicar local → `LCStore.*` → snack con "Deshacer" (5 s)
  que revierte local **y** compensa en BD vía `pSave.then(...)`.
- **Errores:** todo catch de guardado muestra snack honesto
  (`'⚠ … NO se guardó en la base — reintenta'`), nunca solo console.warn.
- **HTML dinámico:** todo texto libre de la BD (nombre, nota, raza, motivo,
  producto, lote) pasa por `LCRules.esc()` antes de un `innerHTML`.
- **Estilos:** dos CSS separados (`styles.css` móvil / `escritorio.css`) con
  variables `--ink*`, `--green`, `--border`; chips `.chip`(móvil)/`.pchip`
  (escritorio); mantener ambos en paralelo si tocas tokens.

## Gotchas (parece que funciona así, pero no)

- **`test/fixtures/model.js` NO es la app**: es fixture de `test/smoke.js`. Los datos
  reales vienen de Supabase.
- **Fechas:** JAMÁS `new Date().toISOString()` para fechar registros (UTC ≠
  Colombia). Usa `LCStore.hoyFinca()` / `isoHoy()` / `isoHoyM()`. En SQL,
  `hoy_finca()`, no `CURRENT_DATE`.
- **TDZ en scope global:** código que corre al cargar la página no puede usar
  un `const` declarado más abajo en el mismo archivo — usa `LCRules.X`
  directo. Ya causó una pantalla blanca total.
- **`grupo` tiene tres representaciones:** BD `'ordeño'` (con ñ); filas del
  hato escritorio usan DISPLAY `'En ordeño'` (volver con `GRUPO_MODELO`);
  claves móviles `'ordeno'` (via `GRUPO_KEY`). No compares sin mapear.
- **`updateAnimal` no existe a propósito** (vaciaba campos ausentes).
- **PostgREST corta en 1000 filas:** toda lectura nueva de tablas debe paginar
  (helper `_paginado` en store.js) con orden determinista + `id` de desempate.
- **Caché de animales = 30 s** (`ANIM_CACHE_TTL`) con token de generación; la
  invalidación real es por evento: tras escribir, llama `_invalidarAnimales()`
  (las funciones del store ya lo hacen). El TTL solo acota ver cambios de OTRO
  dispositivo.
- **El contador "sin subir" del móvil no es un outbox** — no hay cola offline.
- **Chips de vaca del móvil** muestran `'042 Nombre'` (sin `·`): compara con
  `numDe()` sobre el valor, y primer token sobre el chip.

## Reglas (no romper)

1. **La UI nunca llama a Supabase directo** — todo por `LCStore`.
2. **Derivar, no guardar:** valores calculables (edad, DEL, retiro, parto
   estimado, conteo de partos) viven en la vista `v_animales`. No agregues
   columnas persistidas para cosas derivables.
3. **Cambios de esquema = dos archivos:** migración idempotente nueva
   (`supabase/migracion-*.sql`) **y** `schema.sql` (instalador canónico).
   Validar en Postgres local antes de entregar.
4. **NUNCA re-ejecutar** nada de `supabase/migraciones-aplicadas/`
   (migracion-color.sql destruye la vista si se corre de nuevo).
5. **Al tocar JS/CSS, sube el `?v=`** en `index.html`, `escritorio.html` y
   `conexion.html` (cache-busting manual).
6. **El parto usa `registrarPartoCompleto`** (RPC transaccional con fallback)
   — no lo separes en escrituras sueltas.
7. Si tocas un flujo `save*`: actualiza TODOS sus cachés locales y la reversa
   del "Deshacer" (local + BD). Verifica en navegador ambas superficies:
   no hay tests que atrapen esto.
8. Nuevas listas/columnas de respaldo: sincronizar `TABLAS_RESPALDO` +
   `COLUMNAS_RESPALDO` (store.js) y `TABLAS` (.github/scripts/respaldo.js).
   `test/integracion.js` ya lo verifica (schema ↔ store ↔ respaldo): si una
   columna nueva del esquema no entra a `COLUMNAS_RESPALDO`, el test falla.
9. `core/vendor/` es librería vendorizada (supabase-js con versión fija):
   no editarla; para subir de versión, reemplazar el archivo completo y
   actualizar los 3 HTML.
