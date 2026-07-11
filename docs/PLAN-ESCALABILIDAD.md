# Plan de escalabilidad — que no se rompa a 500 vacas ni con años de datos

> Fecha: 2026-07-11. Objetivo: que la app siga fluida y sin pérdida de datos
> cuando el hato crezca (~500 animales, ~250–300 en ordeño) y cuando se
> acumulen años de historia. Complementa `docs/PLAN-MEJORAS.md` y
> `docs/PLAN-BACKEND-MODELOS.md` (la seguridad A1 sigue siendo prioridad #1;
> este plan es ortogonal).
>
> Esfuerzo: 🟢 horas · 🟡 1–2 días · 🔴 proyecto aparte.

---

## Los números primero (dónde se rompe de verdad)

Volúmenes estimados a 500 vacas:

| Tabla | Filas/año | A 5 años | ¿Postgres sufre? |
|---|---|---|---|
| `ordenos` | ~100.000 (275 en ordeño × 365) | ~500.000 | No — con los índices actuales esto es pequeño para Postgres |
| `palpaciones` | ~1.000 | ~5.000 | No |
| `partos` | ~250 | ~1.250 | No |
| `tratamientos`/`vacunaciones` | cientos | miles | No |
| Tamaño de la BD | ~15 MB/año | ~75 MB | No — el free tier da 500 MB; alcanza para décadas |

**Conclusión honesta: la base de datos NO es el problema.** Postgres maneja
millones de filas sin despeinarse. Lo que se rompe es el **cliente y el
transporte** — todo lo que hoy baja tablas completas al navegador:

1. **El asesino principal — `getOrdenos(anio)`** (`escritorio.js:814`): la
   pestaña de leche baja UN AÑO ENTERO de ordeños crudos para sumar litros
   por mes en JS, armar `ordenosDiaMap` y el promedio de 5 días del scatter.
   A 500 vacas eso es **~100.000 filas = ~100 requests SECUENCIALES de 1000**
   (`_paginado`), 10–20 MB por carga. En la red rural de la finca: decenas de
   segundos con la pestaña colgada. Hoy (~200 animales) ya son ~30 requests.
2. **Egress del free tier (5 GB/mes)**: esas descargas repetidas × varias
   veces al día × 30 días ≈ 1–6 GB/mes. El punto 1 puede agotar la cuota
   solo, y Supabase corta el servicio.
3. **La restauración se auto-bloquea**: `MAX_FILAS_RESTAURA = 200000`
   (`store.js`) se supera con solo ~2 años de ordeños a 500 vacas. Un
   respaldo LEGÍTIMO sería rechazado como "corrupto". Y `exportarTodo()` en
   el navegador armaría un JSON de 50–100 MB en memoria (pestaña congelada).
4. **Historiales sin ventana**: `getPartos()`, `getPalpaciones()`,
   `getVacunaciones()` bajan TODO siempre; el móvil baja los tres completos
   solo para pintar la historia de UNA ficha (`app.js:715`).
5. **`v_animales` con 4 subqueries correlacionadas por fila** — probablemente
   aguanta (todas pegan en índices existentes), pero nadie lo ha medido con
   500 × 500k filas.

Lo que **NO** hay que hacer (y sería sobre-ingeniería): particionar tablas,
cambiar de stack, virtualizar tablas del DOM (500 filas con `innerHTML` van
bien), tocar la caché de 30 s (500 filas de `v_animales` = 1 request), ni
"archivar" datos viejos — caben de sobra.

---

## FASE A — Medir antes de tocar (el arnés de escala)

- [ ] 🟡 **A1 · Seed sintético de escala.** Script `supabase/seed-escala.sql`
  (o generador en `test/`): 500 animales realistas + 5 años de ordeños
  (~500k filas) + partos/palpaciones/tratamientos proporcionales, en la base
  efímera local. NO es para producción — es la vara de medir.
- [ ] 🟢 **A2 · Test de escala en `integracion.js` (parte B).** Con el seed
  cargado: `EXPLAIN ANALYZE` + presupuesto de tiempo para `v_animales`
  completa (< 500 ms), `v_produccion_mensual` (< 500 ms), y el patrón de la
  parrilla semanal (`ordenos` de 7 días, < 200 ms). Si un cambio futuro rompe
  el presupuesto, el test lo dice antes que la finca. Se salta sin Postgres,
  como el resto de la parte B.

## FASE B — Backend: agregar en la base, no en el navegador

- [ ] 🟡 **B1 · Ampliar `v_produccion_mensual`** con `suma_litros` (hoy solo
  da promedio). Es LA pieza que permite matar la descarga del año entero: la
  suma real por mes que hoy se calcula en JS (`recomputeMensual`) pasa a
  venir agregada — de ~100.000 filas a ~12 × animales_activos (~3.000
  filas). Migración idempotente + `schema.sql` (regla de dos archivos),
  validada en Postgres local.
- [ ] 🟢 **B2 · `getOrdenosRango(desde, hasta)` en store.js.** La parrilla
  semanal y el "ordeño de hoy" solo necesitan 7–35 días (~2–10k filas máx,
  2–10 requests), no el año. Mismo `_paginado`, con filtro de rango.
- [ ] 🟢 **B3 · Ventanas en los historiales.** `getPartos({anio})`,
  `getPalpaciones({anio})`, `getVacunaciones({limite, antesDe})` (keyset por
  `fecha,id` — el orden determinista ya existe). El selector de año del
  escritorio ya define la ventana natural. Y para la ficha móvil:
  `getEventosAnimal(id)` que trae partos/palpaciones/tratamientos de UN
  animal en vez de las tres tablas completas.
- [ ] 🟡 **B4 · Respaldo que escala.**
  - El workflow (`respaldo.yml`) deja PostgREST paginado y pasa a `pg_dump`
    vía connection string en un secret de GitHub (ya no depende de la anon
    key ni de 500 requests; comprime con gzip; valida conteos > 0 antes de
    dar OK).
  - `exportarTodo()` del navegador queda para hatos chicos y exporta POR
    AÑO los ordeños (varios archivos) cuando el conteo supere un umbral.
  - `MAX_FILAS_RESTAURA` deja de ser constante mágica: se valida contra el
    conteo REAL de la base (`ping()` ya trae count) — un respaldo legítimo
    de 400k filas no puede ser rechazado como corrupto.
- [ ] 🟢 **B5 · Solo si A2 lo pide: `v_animales` con `LEFT JOIN LATERAL`**
  en vez de subqueries correlacionadas, e índices extra que el `EXPLAIN`
  señale (candidato: `palpaciones(fecha DESC, id)` para el historial). No
  hacerlo a ciegas: derivar > optimizar prematuro.

## FASE C — Frontend: consumir agregados y ventanas

- [ ] 🟡 **C1 · Pestaña de leche sin el año crudo.** `recomputeMensual()`
  consume la vista ampliada (B1) para la suma mensual; `ordenosDiaMap` se
  llena solo con el rango visible (B2: semana en vista, o mes en la vista
  mensual). El selector de año pide agregados, no crudos. Presupuesto
  resultante: abrir "Leche" ≤ 5 requests / ≤ 300 KB (hoy: ~30–100 requests /
  varios MB).
- [ ] 🟢 **C2 · Scatter con ventana corta.** El promedio de 5 días sale de
  los últimos 5–7 días de ordeños (B2), no del año.
- [ ] 🟢 **C3 · Historiales con "ver más".** Partos/palpaciones/vacunaciones
  muestran el año seleccionado y cargan otra ventana bajo demanda (B3). Los
  recortes que ya existen (vacunaciones `slice(0,8)`, timeline 20 eventos)
  se mantienen — ya eran la decisión correcta.
- [ ] 🟢 **C4 · Ficha móvil por animal.** La historia de la ficha usa
  `getEventosAnimal(id)` (B3) en vez de bajar las tres tablas completas.
- [ ] 🟢 **C5 · Regla de presupuesto de red por pantalla** (documentada en
  PROJECT.md): ninguna pantalla baja más de ~10 requests / ~500 KB al
  abrirse; toda lectura nueva declara su ventana. Verificable en Chromium
  contando requests (Playwright), como los smoke-tests de sesión.

**Regla transversal:** cada cambio de contrato en store.js pasa por los
flujos `save*` con sus cachés locales y la reversa del "Deshacer" (regla 7
de CLAUDE.md), y por `smoke.js` + `integracion.js` + verificación en ambas
superficies antes de commit.

## Orden recomendado

1. **A1 + A2** (el arnés — sin vara de medir, lo demás es a ciegas),
2. **B1 + B2 + C1 + C2** (el cuello real: la pestaña de leche),
3. **B4** (respaldo — es integridad de datos, no solo velocidad),
4. **B3 + C3 + C4** (historiales),
5. **B5** solo si A2 muestra que `v_animales` excede el presupuesto,
6. **C5** al final, como regla permanente del repo.

Con 1–4 hechos, el sistema queda plano en costo por pantalla (KB, no MB;
requests constantes, no proporcionales a la historia) — que es la
definición práctica de "no se rompe con el tiempo".
