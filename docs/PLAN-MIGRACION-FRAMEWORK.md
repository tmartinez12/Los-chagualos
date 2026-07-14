# Plan de migración — de vanilla JS a React + TypeScript + Capacitor

> Fecha: 2026-07-11. Contexto: la app aún NO está en uso diario, así que una
> reescritura de la capa de UI es viable sin riesgo operativo. Motivación
> (ver conversación y `GAPS.md`): eliminar estructuralmente la clase de bug
> más repetida (estado paralelo sincronizado a mano — 7 bugs reales
> encontrados en una sola auditoría), habilitar offline-first de verdad
> (gap A7) y volverla instalable como app de campo.
>
> **Qué se conserva:** Supabase tal cual (esquema, `v_animales`, RPCs,
> respaldos — cero cambios de backend en este plan), y la lógica de negocio
> de `core/` (JS puro sin DOM, reutilizable casi tal cual). Se reescribe
> SOLO la capa de pantallas.
>
> Esfuerzo: 🟢 horas · 🟡 1–2 días · 🔴 semana(s).
> Modelos: mismo criterio de los otros planes — Opus 4.8 decide/revisa,
> Sonnet 5 implementa lo que cruza piezas, Haiku 4.5 ejecuta specs cerradas.

---

## Stack elegido (y por qué)

| Pieza | Elección | Por qué |
|---|---|---|
| UI | **React 18 + Vite** | El ecosistema más grande y el que mejor conocen los modelos de IA que desarrollan este repo; Vite da dev-server y build simples |
| Tipos | **TypeScript** | Mata en compilación los bugs de mapeo documentados (3 representaciones de `grupo`, snake_case↔camelCase) |
| Estado de servidor | **TanStack Query** | Mapea 1:1 con lo que `LCStore` ya hace a mano: caché con TTL, invalidación por evento (`_invalidarAnimales` → `invalidateQueries`), reintentos. Las listas derivadas (próximos partos, vacías) pasan a ser `select`/`useMemo` sobre UNA fuente — el patrón "Estado único" que la Fase 6 construyó a mano, gratis |
| Estado local de UI | React state / Zustand solo si hace falta | El estado de esta app es chico; no meter Redux |
| App instalable | **Capacitor** | Web + Android/iOS desde la misma base; acceso a SQLite nativo para el outbox offline |
| Estilos | CSS actual portado (variables `--ink*`, `--green`…) | El diseño ya está resuelto y probado; no se rediseña, se transcribe a componentes |
| Monorepo | npm workspaces: `packages/nucleo` + `apps/movil` + `apps/escritorio` | Las dos UIs son deliberadamente distintas (operario vs admin); comparten el núcleo, no las pantallas |

**Lo que se pierde y se acepta:** la simplicidad de "cero build" (ahora hay
`npm install` + pipeline de compilación + dependencias que actualizar). Es
el precio de los tres beneficios de arriba; queda mitigado porque el build
de Vite es un paso de CI, no un requisito para leer el código del núcleo.

**Regla de oro de toda la migración:** el `prototipo/` actual NO se toca ni
se borra hasta el corte final (Fase 5). Es la referencia de paridad y el
plan B permanente.

---

## FASE 0 — Decisiones y esqueleto 🟡

| # | Tarea | Modelo |
|---|---|---|
| 0.1 | **Fijar las decisiones de arquitectura** en un ADR corto: el stack de arriba, la estructura del monorepo, cómo conviven `prototipo/` (producción actual) y `apps/` (lo nuevo) en el mismo repo, y el criterio de corte (checklist de paridad, no fecha). | **Opus 4.8** |
| 0.2 | **Esqueleto del monorepo**: workspaces, Vite + React + TS en `apps/movil` y `apps/escritorio`, ESLint/Prettier, CI que compila y corre tests en cada push (además del CI actual de `prototipo/`, que sigue intacto). | **Sonnet 5** |
| 0.3 | **Pipeline de publicación en paralelo**: lo nuevo se publica en una URL de preview (rama → build → Pages en subruta `/beta/` o Vercel preview) SIN tocar la publicación actual de `prototipo/`. | **Haiku 4.5** (spec cerrada: ajustar `pages.yml`) |

## FASE 1 — Portar el núcleo (la parte más valiosa ya existe) 🟡

| # | Tarea | Modelo |
|---|---|---|
| 1.1 | **`packages/nucleo/tipos.ts`**: el modelo canónico tipado — `Animal`, `Parto`, `Palpacion`, `Tratamiento`, enums de BD (`grupo` con UNA sola representación interna + funciones de display; las 3 representaciones actuales mueren aquí). Derivar los tipos del esquema real (`supabase gen types` o a mano desde `schema.sql`). | **Sonnet 5** |
| 1.2 | **Portar `core/rules.js` → `nucleo/reglas.ts`**: transcripción 1:1 con tipos (fechas de finca, curva de Wood, espejos de `v_animales`, `esc()` deja de existir — JSX escapa solo). Los tests de paridad SQL↔JS de `integracion.js` pasan a correr contra la versión TS: si un número cambia, el port se equivocó. | **Haiku 4.5** (transcripción con test que verifica) |
| 1.3 | **Envolver `core/store.js` → `nucleo/api.ts` + hooks TanStack Query**: mismos contratos (`getAnimales`, `updateAnimalCampos` con OCC, `_paginado`, respaldo) expuestos como `useAnimales()`, `useMutacionAnimal()`… La invalidación por evento se declara una vez (`onSuccess → invalidateQueries(['animales'])`) en vez de en cada `save*`. | **Sonnet 5** |
| 1.4 | **Portar el patrón "Deshacer"**: `ejecutarConDeshacer` se vuelve un hook `useAccionConDeshacer` sobre mutaciones de TanStack Query (optimistic update + rollback + compensación en BD) — la misma coreografía, pero escrita UNA vez y sin listas paralelas que revertir a mano. | **Sonnet 5** |
| 1.5 | **Contrato de humo nuevo**: adaptar `smoke.js` para verificar que el núcleo TS expone las mismas funciones/columnas (schema ↔ nucleo ↔ respaldo), manteniendo el test del `prototipo/` mientras conviva. | **Haiku 4.5** |

## FASE 2 — Móvil primero (la app de campo) 🔴

Pantalla por pantalla contra checklist de paridad con el `prototipo/` (que
sigue siendo el espejo): inicio/KPIs, ordeño del día, hato + grupos + bajas,
ficha (con historia), reproducción (partos/palpación/vacías), sanidad,
registro (alta/parto/palpación/secado/baja/tratamiento/vacunación) con su
"Deshacer".

| # | Tarea | Modelo |
|---|---|---|
| 2.1 | Componentes base transcritos del CSS actual (chips, cards, sheets, list-items, navbar) — el diseño no cambia, se componentiza. | **Haiku 4.5** (transcripción de HTML/CSS existente) |
| 2.2 | Pantallas de lectura (inicio, hato, grupos, ficha, listas repro/sanidad) consumiendo los hooks del núcleo. Las listas derivadas son `select` de la query — sin `recomputarReproM` manual. | **Sonnet 5** |
| 2.3 | Flujos de escritura (los 6 `save*` + alta + vacunación) con `useAccionConDeshacer`, verificados uno a uno en Chromium contra el checklist (misma disciplina de la Fase 6 del plan de mejoras). | **Sonnet 5** |
| 2.4 | Shell de Capacitor: proyecto Android (iOS después), ícono, splash, build firmado de prueba en un celular real de la finca. | **Sonnet 5** |
| 2.5 | Checklist de paridad ejecutable: script Playwright que recorre las pantallas nuevas y las del prototipo con el MISMO LCStore simulado y compara los datos pintados (no el pixel). | **Sonnet 5** |

## FASE 3 — Offline de verdad (el gap A7, la razón #1 de migrar) 🔴

| # | Tarea | Modelo |
|---|---|---|
| 3.1 | **Diseño del outbox** (1 página): cola local (SQLite vía Capacitor en app; IndexedDB en web) de mutaciones serializadas `{tabla, operacion, payload, creado_en}`, despacho FIFO al volver la señal, política de conflicto (el OCC de `updateAnimalCampos` decide: si la fila cambió, el registro entra a "revisar a mano", nunca pisa en silencio), y qué lecturas se cachean para consultar sin señal (animales + rangos recientes). | **Opus 4.8** |
| 3.2 | Implementación del outbox + estado de UI honesto ("N registros por subir", con detalle y reintento manual) — reemplaza el contador fake actual. | **Sonnet 5** |
| 3.3 | Pruebas de campo simuladas: Playwright con red cortada (`context.setOffline(true)`) — registrar leche/parto sin señal, reconectar, verificar que llega a la BD local de test en orden y sin duplicar (idempotencia por id de cliente). | **Sonnet 5** |
| 3.4 | **Prerrequisito que se hereda del plan de backend:** auth + RLS (Fase 1 de `PLAN-BACKEND-MODELOS.md`) debe estar hecho ANTES de repartir la app instalada — una app en celulares ajenos con la anon key actual y la BD abierta es el gap A1 multiplicado. | — (dependencia, no tarea) |

## FASE 4 — Escritorio 🔴

Mismo patrón que la Fase 2 (componentes → lecturas → escrituras → checklist)
pero para la vista de la administradora: hato con filtros/bajas, registro
semanal de leche (la parrilla editable es lo más delicado), producción
(curvas/scatter con la curva de Wood del núcleo), reproducción, sanidad,
respaldos. El escritorio queda como web app (no necesita Capacitor).
**Sonnet 5** todo, con los componentes mecánicos en **Haiku 4.5**.

## FASE 5 — Corte y retiro del prototipo 🟢

| # | Tarea | Modelo |
|---|---|---|
| 5.1 | Checklist de paridad completo en verde + una semana de uso real con la app nueva (la señora y el operario) reportando contra el prototipo aún disponible. | — (humano) |
| 5.2 | Publicación: `apps/` pasa a ser lo que publica Pages (o Vercel con previews por PR, que con build ya aporta); `prototipo/` se mueve a `archivo/` en el repo — deja de publicarse pero queda como registro. | **Sonnet 5** |
| 5.3 | Actualizar CLAUDE.md, PROJECT.md, GAPS.md y los planes al mundo nuevo (comandos, arquitectura, gotchas que mueren — TDZ global, `?v=dev`, las 3 representaciones de `grupo` — y los que nacen). | **Haiku 4.5** con revisión de **Sonnet 5** |

---

## Qué problema mata cada fase (para no perder el norte)

| Fase | Problema que elimina |
|---|---|
| 1 | Las 3 representaciones de `grupo`, el mapeo a mano sin tipos, `esc()` manual (XSS por omisión) |
| 2 | Las estructuras paralelas del móvil (`grupos[k]`, `cows`, `palpCandidatas`…) sincronizadas a mano |
| 3 | El gap A7: registro que falla sin señal → cola local con reconciliación honesta |
| 4 | Las estructuras paralelas del escritorio (`hato`, `milkCows`, `_partosRaw`…) |
| 5 | La doble verdad prototipo/app nueva |

## Riesgos y mitigaciones

- **El rewrite eterno** (el riesgo #1 de toda migración): se mitiga con el
  orden móvil-primero (valor de campo antes que paridad total), el checklist
  ejecutable por pantalla, y la regla de que `prototipo/` sigue publicado y
  funcional hasta el corte — nunca hay un momento sin app usable.
- **Regresiones de lógica de negocio**: el núcleo se porta con los tests de
  paridad SQL↔JS existentes como juez — un número distinto = port mal hecho.
- **Sobre-ingeniería**: prohibido agregar librerías fuera de la tabla del
  stack sin ADR; el diseño visual NO se rediseña, se transcribe.
- **El plan de escalabilidad no se pierde**: las ventanas/agregados de
  `PLAN-ESCALABILIDAD.md` se implementan directamente en `nucleo/api.ts`
  (mejor hacerlos ahí una vez que dos veces — coordinar: escalabilidad B1/B2
  puede aterrizar en el núcleo nuevo en vez de en `store.js`).

## Orden global recomendado entre planes

1. **Auth + RLS** (PLAN-BACKEND-MODELOS Fase 1) — bloquea repartir la app.
2. **Fases 0–2 de este plan** (núcleo + móvil) con las lecturas ya
   ventaneadas (PLAN-ESCALABILIDAD B1–B3 implementadas en `nucleo/api.ts`).
3. **Fase 3** (offline) — el porqué de todo esto.
4. **Fase 4–5** (escritorio y corte).
