# PROJECT.md — Guía de a bordo

> Lo que un ingeniero senior te contaría el primer día. Estado: julio 2026.
> Complementos: `docs/AUDITORIA.md` (hallazgos y arreglos), `GAPS.md` (debilidades
> actuales, sin filtro), `supabase/README.md` (instalar/migrar la base).

## 1. Qué es esto y para quién

Sistema de gestión de una **finca lechera regenerativa en Colombia** ("Los
Chagualos"). Lo usa la administradora (dueña del negocio, no técnica) y
eventualmente operarios de campo. Gestiona: el **hato** (inventario de
animales con ficha por vaca), el **ordeño diario** (litros por vaca), la
**reproducción** (palpaciones, preñeces, partos, secados), la **sanidad**
(tratamientos con retiro de leche, vacunaciones con soporte ICA) y las
**bajas**. Dos superficies sobre los mismos datos:

- `prototipo/escritorio.html` — vista administradora (tablas, KPIs, exports,
  respaldo). Donde se analiza y se corrige.
- `prototipo/index.html` — móvil de campo (botones grandes, registro en
  segundos: ordeño, parto, palpación). Donde se captura.

El README raíz describe una visión mayor (5 unidades productivas, offline,
multi-rol). **Solo la lechería existe**; el README tiene una sección "estado
actual vs visión" que dice la verdad.

## 2. Stack y por qué

| Pieza | Por qué |
|---|---|
| **HTML/CSS/JS vanilla, sin framework ni build** | Deploy = copiar archivos. Cualquier editor sirve, cero toolchain, ideal para un proyecto que empezó como prototipo y se volvió real. El costo: scope global y archivos grandes (ver §6). |
| **Supabase (Postgres + PostgREST)** | Backend sin servidor propio: SQL real (vistas, constraints, funciones plpgsql) con API REST automática. La lógica de datos vive EN la base, no en un backend inexistente. |
| **supabase-js v2 vendorizado** (`core/vendor/supabase-js-2.110.0.js`) | Versión fija local; antes se cargaba `@2` flotante de un CDN y una minor nueva podía romper producción. |
| **GitHub Pages** (`.github/workflows/pages.yml`) | Hosting estático gratis. OJO: publica al hacer push a la rama de trabajo, sin revisión. |
| **GitHub Actions** | `ci.yml` (sintaxis + prueba de humo en cada push) y `respaldo.yml` (export completo de la base 2×/semana como artefacto — también evita la pausa por inactividad del free tier). |

Desarrollo local: servidor HTTP simple + Playwright para probar en navegador
real + Postgres local para validar SQL antes de tocar Supabase (obligatorio).

## 3. Arquitectura

```
 escritorio.html + escritorio.js (~2.6k líneas)   index.html + app.js (~1.3k)
        │  vista admin                                  │  captura en campo
        └──────────────┬───────────────────────────────┘
                       ▼
             core/rules.js  ← reglas PURAS compartidas (fechas, curva de
                       │       lactancia, deriveReproFicha, esc(), protocolo
                       │       sanitario, parser de notas veterinarias)
             core/acciones.js ← coreografía compartida de save* (M14, en
                       │       progreso, flujo por flujo): aplicar local →
                       │       escribir BD → si falla, snack honesto → el
                       │       snack de éxito ofrece "Deshacer" que revierte
                       ▼       local y compensa BD. Cada página sigue dando
                               qué pintar/guardar por closures.
             core/store.js  ← ÚNICA frontera con la base. Mapea snake_case↔
                       │       camelCase, caché 30s de animales, paginación,
                       │       respaldo/restauración. La UI JAMÁS llama a
                       ▼       Supabase directo.
        Supabase Postgres (PostgREST, anon key pública)
             ├─ tablas FUENTE: animales, ordenos, partos, palpaciones,
             │                 tratamientos, vacunaciones, potreros, unidades
             ├─ v_animales: vista que DERIVA edad, DEL, última leche, retiro,
             │              parto estimado, secado, conteo de partos
             ├─ v_produccion_mensual: agregado de ordeños
             └─ registrar_parto_completo(): RPC transaccional (cría+parto+madre)
```

Flujo típico: la UI actualiza su estado local (optimista) → llama a
`LCStore.*` → snack con "Deshacer" (5 s) → si se deshace, se **compensa
también en la base**. Las lecturas de animales pasan por `v_animales` (con
los campos `*_calc`); si la vista no existe (migración pendiente) cae a la
tabla base solo ante el error 42P01.

## 4. Decisiones de diseño clave

1. **Derivar, no guardar.** Edad, DEL, leche de ayer, retiro, parto estimado,
   secado y conteo de partos se calculan en `v_animales` a partir de columnas
   fuente. Nunca se almacenan → no hay dos verdades. Si agregas un dato
   calculable, cálculalo en la vista, no lo persistas.
2. **La hora de la finca es ley.** `hoy_finca()` (SQL) y `LCStore.hoyFinca()`
   (JS) devuelven la fecha en `America/Bogota`. Nunca uses
   `new Date().toISOString()` para fechar un registro (en UTC, desde las 7 pm
   ya es "mañana" en Colombia). Ambas UIs se auto-recargan al cambiar el día.
3. **Sin login, RLS desactivado, anon key pública** — decisión consciente de
   MVP para una sola usuaria. Es la debilidad CRÍTICA documentada (GAPS §4);
   la mitigación es el respaldo automático 2×/semana.
4. **UI optimista con undo compensado.** Cada acción aplica local primero,
   guarda después, y su "Deshacer" revierte AMBOS lados (patrón: capturar
   snapshot previo → `pSave.then(compensación)`).
5. **El parto es transaccional.** `registrar_parto_completo()` en Postgres:
   o entra todo (cría + parto + madre al ordeño) o nada. `store.js` tiene
   fallback a la secuencia clásica si la RPC no está instalada.
6. **`schema.sql` es el instalador canónico.** Todo cambio de esquema va en
   una migración idempotente NUEVA **y** en `schema.sql`. Las ya aplicadas se
   archivan en `supabase/migraciones-aplicadas/` (¡no re-ejecutarlas!).
7. **Todo lo que lee tablas pagina de a 1000** (tope silencioso de PostgREST)
   con orden determinista + `id` como desempate.

## 5. Rutas críticas (qué aguanta carga, qué es frágil, qué es libre)

**Máxima carga — tocar con guantes y verificación completa:**
- `core/store.js` — todo dato entra y sale por aquí. Romperlo rompe todo.
- `supabase/schema.sql` + migraciones — validar SIEMPRE contra un Postgres 16
  local (base fresca con schema + migración ×2 sobre base "desplegada") antes
  de que la dueña lo corra en Supabase.
- `exportarTodo`/`restaurarTodo` — la única red de seguridad de los datos.
- `core/rules.js` y `core/acciones.js` — compartidas: un cambio afecta las dos
  superficies a la vez.

**Frágil por diseño (el mayor riesgo de regresión):**
- Los flujos `save*` y sus "Deshacer" en `app.js`/`escritorio.js`. El estado
  local vive en estructuras paralelas (`hato`, `animalesPorId`, `grupos`,
  `milkCows`, `_partosRaw`…) que cada acción actualiza A MANO. Si tocas un
  flujo, busca TODOS los cachés que ese flujo debe mantener y su reversa.
  No hay tests que te salven (GAPS §2): verifica en navegador.

**Seguro de cambiar con calma:** CSS, textos/copys, la pantalla de potreros
(módulo oculto, `POTREROS_VISIBLE=false`), los documentos `.md`, el diseño de
la página de partos.

**Verificación mínima antes de commitear:** `node --check` de los JS tocados
+ `node prototipo/test/smoke.js` (17 verificaciones de contrato) + abrir ambas
superficies con un servidor local y mirar la consola. El CI corre lo mismo.

## 6. Lo que te va a sorprender (léelo antes de tocar nada)

- **`test/fixtures/model.js` NO se carga en la app.** Es un dataset de ejemplo que solo
  usa `test/smoke.js` como fixture. No lo "conectes" ni borres sin tocar el test.
- **El enum `grupo` tiene tres caras:** la BD usa `'ordeño'` (con ñ); el
  escritorio guarda en sus filas locales el DISPLAY (`'En ordeño'`, se mapea
  de vuelta con `GRUPO_MODELO`); el móvil usa claves sin ñ (`'ordeno'`, vía
  `GRUPO_KEY`). `_normGrupo()` en store existe para sobrevivir a esto.
- **Scope global + archivos monolíticos:** funciones duplicadas entre
  superficies llevan sufijo `M` en el móvil. Código que corre AL CARGAR no
  puede usar `const` declarados más abajo en el archivo (TDZ) — usa
  `LCRules.X` directo; ya causó una pantalla blanca una vez.
- **El contador "sin subir" del móvil NO es una cola offline.** Es un entero
  en memoria; el copy es honesto pero la capacidad no existe.
- **Cache-busting manual:** los `<script src="...?v=20260707">` hay que
  subirlos al cambiar JS/CSS, o los usuarios ejecutan código viejo.
- **IDs con cinco formatos:** chapetas (`'042'`), toros (`'T01'`), UUIDs
  (eventos), `'P-'+Date.now()` (partos de la app), `'P-hist-*'` (migración).
- **`updateAnimal` no existe a propósito:** el update "completo" vaciaba
  campos ausentes. Usa siempre `updateAnimalCampos(id, {campos_snake_case})`.
- **La caché de animales dura 3 s** y usa un token de generación para que una
  lectura en vuelo no pise una escritura. Tras escribir, `_invalidarAnimales()`.
- **Push a la rama = deploy a producción** (Pages publica `prototipo/` tal
  cual). No hay staging.
- **Los planes viejos están archivados en `docs/archivo/`** (`PLAN-arquitectura.md`,
  `PLAN-backend.md`, notas de reorganización) — describen piezas que no existen
  (actions.js, login por PIN, outbox). Para el estado real: este archivo +
  `docs/AUDITORIA.md` + `GAPS.md`.
