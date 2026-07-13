# Plan de escalabilidad — que no se rompa a 500 vacas ni con años de datos

> Fecha: 2026-07-11. Objetivo: que la app siga fluida y sin pérdida de datos
> cuando el hato crezca (~500 animales, ~250–300 en ordeño) y cuando se
> acumulen años de historia. Complementa `docs/PLAN-MEJORAS.md` y
> `docs/PLAN-BACKEND-MODELOS.md` (la seguridad A1 sigue siendo prioridad #1;
> este plan es ortogonal).
>
> Esfuerzo: 🟢 horas · 🟡 1–2 días · 🔴 proyecto aparte.
>
> **Modelo asignado por tarea** (mismo criterio que `PLAN-BACKEND-MODELOS.md`:
> el caro DISEÑA y REVISA lo irreversible; el mediano IMPLEMENTA con criterio;
> el pequeño EJECUTA lo mecánico con spec exacta y test que lo verifique):
>
> | Modelo | ID | Precio in/out por MTok | Úsalo para |
> |---|---|---|---|
> | Haiku 4.5 | `claude-haiku-4-5` | $1 / $5 | Tareas mecánicas con spec exacta |
> | Sonnet 5 | `claude-sonnet-5` | $3 / $15 (intro $2/$10) | Implementación estándar con criterio |
> | Opus 4.8 | `claude-opus-4-8` | $5 / $25 | Revisión de migraciones de producción, decisiones de diseño |

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

### A1 · 🟡 Seed sintético de escala — **Haiku 4.5**

**Cómo:** script `supabase/seed-escala.sql` (solo para la base efímera local,
JAMÁS producción) hecho con `generate_series` de Postgres — no hace falta
generar 500k INSERTs de texto:

- 500 animales con distribución realista (55% ordeño/horra, resto
  novilla/levante/cria/macho; ~10% con `estado_repro='prenada'`,
  chapetas `E-0001…`), sembrados con `INSERT … SELECT … FROM generate_series(1,500)`.
- Ordeños: `INSERT INTO ordenos SELECT … FROM generate_series(fecha_inicio,
  hoy, interval '1 día') × animales en ordeño`, litros con `random()`
  alrededor de una curva simple — ~500k filas en segundos.
- Partos/palpaciones/tratamientos proporcionales con el mismo patrón.

**Por qué Haiku:** la spec de arriba es cerrada; el test A2 verifica el
resultado (conteos y tiempos). Cero decisiones de diseño abiertas.

### A2 · 🟢 Test de escala en `integracion.js` — **Sonnet 5**

**Cómo:** nueva sección en la parte B (SQL) que corre SOLO si existe la
variable `LC_ESCALA=1` (para no alargar el CI de cada push): carga
`seed-escala.sql` en `lc_test`, y mide con `EXPLAIN (ANALYZE, FORMAT JSON)`:

- `SELECT * FROM v_animales` → presupuesto < 500 ms
- `SELECT * FROM v_produccion_mensual` → < 500 ms
- `SELECT … FROM ordenos WHERE fecha BETWEEN hoy-7 Y hoy` (patrón de la
  parrilla semanal) → < 200 ms

Falla con el tiempo real y el plan de ejecución en el mensaje, para que el
diagnóstico venga incluido. **Por qué Sonnet:** hay que integrarse al arnés
existente (`psql` con libpq, `pass/fail/skip`) e interpretar planes de
ejecución si algo excede el presupuesto.

## FASE B — Backend: agregar en la base, no en el navegador

### B1 · 🟡 Ampliar `v_produccion_mensual` con la suma — **Haiku 4.5 implementa, Opus 4.8 revisa**

**Cómo:** la vista pasa de `avg` a `avg + sum + count`:

```sql
CREATE OR REPLACE VIEW v_produccion_mensual AS
SELECT animal_id,
       to_char(fecha,'YYYY-MM')       AS mes,
       round(avg(litros)::numeric,1)  AS litros_dia,
       round(sum(litros)::numeric,1)  AS litros_mes,   -- NUEVO: la suma que hoy calcula el JS
       count(*)                        AS dias_con_registro
FROM ordenos WHERE turno='dia'
GROUP BY animal_id, to_char(fecha,'YYYY-MM');
```

Dos archivos (regla 3 de CLAUDE.md): `migracion-produccion-suma.sql`
(idempotente, `CREATE OR REPLACE`) + `schema.sql`. Validación local
obligatoria (schema fresco + migración ×2). `getProduccionMensual()` en
store.js agrega `litros_mes` al select. Con esto, la suma mensual que hoy
requiere ~100.000 filas crudas viaja agregada: ~12 filas × animal (~3.000).

**Por qué así los modelos:** el SQL es transcripción mecánica de la spec →
Haiku; pero toca una vista de producción sin staging → revisión de Opus
antes de que la dueña la corra (mismo protocolo que la Fase 1 del plan de
backend).

### B2 · 🟢 `getOrdenosRango(desde, hasta)` en store.js — **Haiku 4.5**

**Cómo:** clon de `getOrdenos(anio)` con `.gte('fecha',desde).lte('fecha',hasta)`
sobre el mismo `_paginado` y el mismo orden determinista. La parrilla semanal
pide sus 7 días (~2k filas máx = 2 requests); la vista mensual del registro
pide su mes. Actualizar el smoke test de contrato (lista de funciones
LCStore.*). **Por qué Haiku:** espeja una función existente línea a línea.

### B3 · 🟢 Ventanas en los historiales + ficha por animal — **Sonnet 5**

**Cómo:**
- `getPartos({anio})`, `getPalpaciones({anio})` — filtro `gte/lte` por año,
  aprovechando que el selector de año del escritorio ya define la ventana.
- `getVacunaciones({limite, antesDe})` — keyset por `(fecha,id)` (el orden
  determinista ya existe); el botón "ver más" pasa el último `(fecha,id)`
  visto como cursor.
- `getEventosAnimal(id)` — tres selects filtrados por `animal_id`/`madre_id`
  en un `Promise.all` (cada uno son decenas de filas, no tablas enteras).

**Por qué Sonnet:** cambia contratos que consumen varias pantallas con
cachés locales (`_partosRaw`, `_palpaciones`…) y hay que decidir caso por
caso qué pantalla pide qué ventana sin romper derivaciones (Estado único).

### B4 · 🟡 Respaldo que escala — **Opus 4.8 diseña (1 página), Sonnet 5 implementa**

**Cómo:**
- **Workflow (`respaldo.yml`)**: reemplazar los ~500 requests de PostgREST
  por `pg_dump --format=custom` contra la connection string de Supabase
  guardada como secret de GitHub (`SUPABASE_DB_URL`). Comprimir, validar
  (conteo de tablas y filas > 0 con `pg_restore --list`), y conservar la
  exportación JSON actual como formato secundario legible mientras quepa.
- **`exportarTodo()` del navegador**: si `ping()` reporta más de ~100k filas
  totales, exportar los ordeños por año (un archivo por año) en vez de un
  JSON monolítico de 50–100 MB.
- **`MAX_FILAS_RESTAURA`**: dejar de ser constante mágica — el tope pasa a
  ser `max(200000, conteo_actual_de_la_BD × 1.5)`, para que un respaldo
  legítimo nunca sea rechazado como "corrupto" pero uno manipulado gigante
  siga bloqueado.

**Por qué así:** la decisión de diseño (secret con credencial privilegiada
en CI, formato de retención, qué pasa con `restaurar_respaldo()` para dumps
binarios) es de Opus — es la credencial más sensible del proyecto; la
implementación del workflow y los cambios de store.js son de Sonnet.

### B5 · 🟢 Solo si A2 lo pide: `v_animales` con `LEFT JOIN LATERAL` — **Sonnet 5**

**Cómo:** reescribir las 4 subqueries correlacionadas (conteo de partos,
`leche_ultima`, `retiro_calc`) como `LEFT JOIN LATERAL (…) ON true`, e
índices que el `EXPLAIN` de A2 señale (candidato: `palpaciones(fecha DESC,
id)`). La red de seguridad ya existe: el test de paridad SQL↔JS de
`integracion.js` verifica que las fórmulas no cambien de resultado.
**Condicional:** no hacerlo si A2 muestra que la vista cumple presupuesto —
derivar > optimizar prematuro.

## FASE C — Frontend: consumir agregados y ventanas

### C1 · 🟡 Pestaña de leche sin el año crudo — **Sonnet 5**

**Cómo:** en `escritorio.js`:
- `recomputeMensual()` toma la suma mensual de `litros_mes` (B1) y deja de
  recorrer `_ordsRaw` para sumar.
- `_ordsRaw`/`ordenosDiaMap` se llenan con `getOrdenosRango()` (B2) SOLO del
  rango visible (semana en vista semanal, mes en vista mensual); al navegar
  de semana/mes se pide el rango nuevo (con un mini-caché por rango para no
  repetir requests al ir y volver).
- El selector de año pide agregados (vista) — ya no crudos.
- **Crítico:** el guardado de celdas (upsert puntual + "Deshacer") no cambia
  de contrato; verificar en Chromium la parrilla, la edición, el deshacer y
  los KPIs en ambas superficies (regla 7 de CLAUDE.md — no hay tests que
  atrapen esto).

Presupuesto resultante: abrir "Leche" ≤ 5 requests / ≤ 300 KB (hoy: ~30–100
requests / varios MB). **Por qué Sonnet:** es el refactor más delicado del
plan — toca `recomputeMensual`, la parrilla editable y sus reversas.

### C2 · 🟢 Scatter con ventana corta — **Haiku 4.5**

**Cómo:** el promedio de 5 días que consume `renderScatter` se calcula sobre
`getOrdenosRango(hoy-7, hoy)` en vez del año. Spec cerrada, un solo punto de
cálculo, y la curva de Wood no cambia. Verificar que el scatter pinta igual
con los mismos datos.

### C3 · 🟢 Historiales con "ver más" — **Sonnet 5**

**Cómo:** partos/palpaciones/vacunaciones muestran el año seleccionado (B3)
y un botón "Ver más antiguos" que pide la siguiente ventana keyset y hace
append. Los recortes existentes (vacunaciones `slice(0,8)`, timeline 20
eventos) se mantienen. Cuidado con las derivaciones que hoy asumen la tabla
completa (`partosRecientes`, conteo de partos por vaca — este último ya
viene derivado de `v_animales`, no de la lista, así que no se rompe).

### C4 · 🟢 Ficha móvil por animal — **Sonnet 5**

**Cómo:** `renderFicha`/`cargarHistoriaFicha` del móvil usan
`getEventosAnimal(id)` (B3) al abrir la ficha, en vez de precargar
partos+tratamientos+palpaciones completos al iniciar la app. La precarga
global actual se elimina o queda solo para los KPIs que la necesiten (y esos
migran a agregados).

### C5 · 🟢 Regla permanente: presupuesto de red por pantalla — **Sonnet 5 el arnés, Haiku 4.5 la doc**

**Cómo:** (1) documentar en `PROJECT.md` y `CLAUDE.md`: "ninguna pantalla
baja más de ~10 requests / ~500 KB al abrirse; toda lectura nueva declara su
ventana (rango, año o keyset) — las lecturas sin ventana no pasan revisión";
(2) test Playwright que abre cada pantalla contra un LCStore instrumentado y
cuenta requests/bytes, fallando si excede el presupuesto — es la versión
automatizada de los smoke-tests de sesión que ya se usan.

---

## Resumen de asignación

| Modelo | Tareas | Naturaleza |
|---|---|---|
| **Opus 4.8** | revisión de B1, diseño de B4 | Migración de producción sin staging + la credencial más sensible del proyecto. Sesiones cortas, solo lectura/diseño. |
| **Sonnet 5** | A2, B3, B4 (impl.), B5, C1, C3, C4, C5 (arnés) | El grueso: contratos que cruzan pantallas, cachés y "Deshacer". |
| **Haiku 4.5** | A1, B1 (impl.), B2, C2, C5 (doc) | Specs cerradas con test que verifica: seeds, SQL de transcripción, clones de funciones, docs. |

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
