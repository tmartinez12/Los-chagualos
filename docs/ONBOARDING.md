# ONBOARDING.md — Los Chagualos

> Recorrido guiado del proyecto para un agente/desarrollador nuevo, generado
> con una exploración multi-agente (3 agentes en paralelo asimilando datos,
> UI y núcleo) y verificado contra el código real, julio 2026.
>
> Este documento te lleva de cero a productivo. Para el detalle: `PROJECT.md`
> (arquitectura), `docs/REQUISITOS.md` (qué hace), `GAPS.md` (qué falta),
> `AGENTS.md`/`CLAUDE.md` (reglas operativas), `supabase/README.md` (base).

---

## 0. En 60 segundos

App de gestión de una **finca lechera en Colombia**. **Vanilla JS sin build**,
dos UIs (escritorio admin + móvil de campo) sobre **Supabase Postgres**. La
dueña no es técnica. **Un push a la rama de trabajo ES un deploy a producción**
(GitHub Pages) — no hay staging.

```
escritorio.js / app.js      ← UIs, estado en scope global
      │  (la UI NUNCA llama a Supabase directo)
      ▼
core/rules.js (LCRules)      ← lógica pura compartida (fechas, curva, esc…)
core/acciones.js (LCAcciones)← coreografía de guardado con "Deshacer"
core/store.js (LCStore)      ← ÚNICA frontera con Supabase
      ▼
Postgres: tablas fuente + vista v_animales (DERIVA todo lo calculable)
```

**Correr y verificar:**
```bash
cd prototipo && python3 -m http.server 8099    # /escritorio.html y /index.html
node prototipo/test/smoke.js                    # contrato UI↔núcleo↔esquema
node prototipo/test/integracion.js              # + SQL real si hay Postgres
node --check prototipo/{app,escritorio}.js prototipo/core/{store,rules,acciones}.js
```

---

## 1. Las dos ideas que gobiernan todo

**(A) Derivar, no guardar.** Edad, DEL, leche de ayer, retiro de leche, parto
estimado, secado, días vacía, conteo de partos y ganancia diaria **se calculan
en la vista `v_animales`** — nunca se persisten. Así no hay dos verdades. El
store solo escribe columnas FUENTE (`animalToDB` omite a propósito los
derivados). Hay un **espejo local** de esas fórmulas en `core/rules.js`
(`partoEstimadoCalc`/`secarCalc`/`diasVaciaCalc`/`prenezMesesActual`) solo para
pintar optimista sin esperar red; `integracion.js` verifica que el espejo y el
SQL coincidan exacto.

**(B) UI optimista con Deshacer compensado.** Cada acción de guardado sigue
`LCAcciones.ejecutarConDeshacer` (`core/acciones.js`): aplica local y pinta YA
→ escribe en BD en paralelo → si falla, snack honesto (`⚠ … NO se guardó`) →
el snack de éxito ofrece "Deshacer" (5 s) que revierte pantalla **y** compensa
en la base. Contrato de opciones:

| opción | rol |
|---|---|
| `aplicar()` (requerido) | muta estado local + pinta, síncrono |
| `escribir` `()→Promise` | persiste en BD; si falla → `avisoError` (nunca solo console.warn) |
| `mensaje` / `snack` | snackbar de éxito (snack se inyecta por página) |
| `revertir()` | deshace lo local; si falta → snack simple sin Deshacer |
| `compensarBD` `()→Promise` | deshace en BD; se **encadena tras** la escritura original (nunca en paralelo, para no pisarse) |

---

## 2. Capa de datos — `core/store.js` (la frontera)

Módulo UMD (`window.LCStore` en navegador, `module.exports` en Node). Piezas
transversales:
- **`hoyFinca()`** — "hoy" en `America/Bogota`. Jamás `toISOString()` (UTC): de
  7pm a medianoche marcaría el día siguiente y rompería el `UNIQUE(animal,
  fecha,turno)` de ordeños.
- **`animalFromDB` / `animalToDB`** — mapean BD (snake_case, plano) ↔ modelo
  (camelCase, anidado). `animalToDB` solo escribe columnas fuente. Los flags de
  transición de etapa (`listoLevante`, `listoNovilla`, `listoMachos`,
  `listaServicio` a 330 kg) se computan aquí.
- **Caché de animales** = 30 s, pero la invalidación real es **por evento**:
  cada escritura llama `_invalidarAnimales()`. Un guard de generación evita que
  una lectura en vuelo tape una escritura reciente.
- **`_paginado`** — pagina de a 1000 (tope silencioso de PostgREST) con orden
  determinista. Toda lectura nueva de tablas debe usarlo.
- **`updateAnimalCampos(id, {snake_case}, expectedUpdatedAt?)`** — update
  parcial (con `expectedUpdatedAt` da control de concurrencia → error
  `CONFLICTO`). **`updateAnimal` fue retirado** porque vaciaba campos ausentes.

Funciones por dominio: animales, ordeños (`registrarOrdeno` upsert +
detección de "pisado"), partos (`registrarPartoCompleto` RPC transaccional +
`vincularCriaParto` con único por cría), palpaciones, tratamientos,
vacunaciones (lista exacta de animales), pesajes (`registrarPesaje` inserta +
copia rápida condicional), movimientos de grupo, respaldo/restauración. **Casi
toda función tiene fallback** si su RPC/vista no está instalada (error 42P01)
— esos fallbacks siguen vivos porque prod aún no tiene las migraciones #4/#5.

---

## 3. Base de datos — `supabase/`

- **Tablas fuente:** `animales` (PK = chapeta), `ordenos`, `palpaciones`,
  `partos`, `pesajes`, `tratamientos`, `vacunaciones` (+`vacunaciones_animales`),
  `potreros`, `movimientos_*`, `unidades` (semilla `'leche'`), `profiles`.
- **`v_animales`** deriva todo lo calculable sobre `hoy_finca()`.
- **RPCs transaccionales:** `registrar_parto_completo`, `mover_grupo`,
  `registrar_vacunacion_completa`, `restaurar_respaldo` (TRUNCATE+reinserta;
  no toca `unidades`).
- **RLS DESACTIVADO en todas las tablas de datos** — intencional (MVP sin
  login); activarlo con anon key sin sesión deja las lecturas en CERO filas y
  el hato "desaparece". Es el riesgo CRÍTICO documentado.
- **Migraciones:** todo cambio de esquema va en DOS archivos — migración
  idempotente nueva **y** `schema.sql`. Validar en Postgres 16 local (esquema
  fresco + migración ×2 sobre el esquema del commit anterior) antes de que la
  dueña la corra. **NUNCA re-ejecutar `migraciones-aplicadas/`**
  (`migracion-color.sql` es destructiva; `migracion-integridad.sql` es
  orden-dependiente). **Pendientes en prod:** #4 (tratamiento genérico) y #5
  (pesajes + peso_nacer).
- **Contrato de respaldo (4 lugares sincronizados, verificados por
  `integracion.js`):** `COLUMNAS_RESPALDO`/`TABLAS_RESPALDO` (store.js),
  `TABLAS` (respaldo.js, = store + `unidades`), y las columnas reales del
  esquema. Una columna nueva que no entre al respaldo → el test falla.

---

## 4. UI de escritorio — `escritorio.js` (~3k líneas, scope global)

**Estructuras paralelas que se mantienen a mano** (la mayor fuente de
regresiones):
- `animalesPorId` — caché canónica `id→animal` (grupo modelo `'ordeño'`).
  Declarada arriba de todo **por TDZ** (el render arranca antes de la carga).
- `hato` — filas de la tabla del Hato (grupo **display** `'En ordeño'`).
- `milkCows` — filas del registro de ordeño del día.
- `_partosRaw` (+ `_ultimoParto`, `_partosPorMadre`) — partos y sus derivados.
- `tratamientos`/`_tratamientosTodos`, `_pesajesCache`, `_vacunaciones`…

**Listas derivadas (NO parchear a mano):** `proximosPartos`, `vacasVacias`,
`palpCandidatas`, `partosRecientes` se recalculan con `recomputarRepro()` /
`recomputarPartosRecientes()` desde la caché canónica. Parcharlas a mano fue
el origen de 7 bugs históricos ("Estado único, Fase 6").

**La ficha (`goVaca`)**: hero (foto + `num·nombre` + edad·raza·grupo) con la
sección **"Datos del animal" plegable y editable en el lugar** (`renderVacaDatos`
→ lápiz → `editarDatosVaca`/`_pintarDatosForm` → `guardarEditarVaca`, que
sincroniza `animalesPorId`+`hato`+`milkCows` y tiene control de concurrencia
propio — NO usa el patrón Deshacer). KPIs, alertas repro con CTA, y tablas de
partos/palpaciones/pesajes/lactancia.

**Flujos `save*`** (todos con `ejecutarConDeshacer` salvo `guardarEditarVaca`):
ordeño, **palpación** (captura 100% estructurada: dropdown+buscador de vaca,
chips de resultado, días de preñez con parto estimado en vivo, tratamiento
escrito con sugerencias de lo ya usado — `_palpConstruirParsed` traduce a la
forma que antes daba el parser), parto (transaccional), secado, baja, tratamiento,
pesaje, vincular/corregir parto.

---

## 5. Núcleo y pruebas

- **`core/rules.js` (puro, cargable en Node):** fechas, curva de lactancia
  (Wood), `deriveReproFicha` (estado repro canónico para ambas UIs), `esc()`
  (anti-XSS obligatorio antes de innerHTML), `vacunaAplicaA`, el espejo de las
  derivaciones de `v_animales`. Debe seguir sin DOM ni estado (los tests lo
  importan).
- **`smoke.js`** (18 verificaciones, sin red): carga del núcleo, que cada
  `LCStore.X` usado en las UIs esté exportado, reglas puras, integridad del
  modelo, coherencia esquema↔seed.
- **`integracion.js`**: (A) JS puro siempre — paginación en el borde 1000/1001,
  `idUnico`, `clampLitros`, contrato de respaldo; (B) SQL contra Postgres real
  (se salta si no hay) — RPCs con rollback, restauración, derivaciones de
  `v_animales`, idempotencia de migraciones ×2, contrato de columnas, paridad
  de fórmulas de fecha.
- **CI/CD:** `ci.yml` (sintaxis+smoke+integración con postgres:16 en cada
  push), `pages.yml` (**push a la rama = deploy**, con cache-busting por SHA),
  `respaldo.yml` (export 2×/semana).

---

## 6. Ciclo de vida del animal (regla de negocio central)

```
cría (ambos sexos al nacer) → levante (≥8m) → novilla (H ≥3a) / macho (M ≥3a)
                                            → ordeño ⇄ horra
```
Las transiciones **NO son automáticas**: los flags derivados (`listoLevante`,
`listoNovilla`, `listaServicio` con ≥330 kg…) disparan un **aviso** y la dueña
**confirma** el paso, que queda con su fecha en `movimientos_grupo`. Al parir,
la madre pasa a ordeño con DEL 0. La palpación es la **única** fuente de verdad
del estado reproductivo.

---

## 7. Las trampas que te van a morder (memorízalas)

1. **El enum `grupo` tiene tres caras:** BD/modelo `'ordeño'` (en
   `animalesPorId`), display `'En ordeño'` (en `hato`), móvil `'ordeno'`.
   Comparar sin mapear (`GRUPO_DISPLAY`/`GRUPO_MODELO`/`GRUPO_KEY`) da 0
   resultados en silencio.
2. **TDZ en scope global:** código que corre al cargar no puede usar un `const`
   declarado más abajo del mismo archivo — usa `LCRules.X` directo. Ya causó
   una pantalla blanca total.
3. **Fechas SIEMPRE en hora de finca** (`hoyFinca()`/`isoHoy()`/`hoy_finca()`).
   Nunca UTC.
4. **PostgREST corta en 1000 filas sin avisar** — toda lectura nueva pagina.
5. **Cachés a mano:** al tocar un `save*`, sincroniza TODAS las estructuras
   paralelas que ese flujo afecta y la reversa del Deshacer (local + BD). No
   hay test que lo atrape: verifica en Chromium.
6. **`_pesajesCache` con tres estados:** `undefined`=no pedido, `null`=en
   vuelo, lista=cargado.
7. **`test/fixtures/model.js` NO es la app** — es fixture del smoke test.
8. **Verificación en navegador:** el stub de `window.LCStore` va DENTRO de
   `page.evaluate` (store.js lo pisa al cargar si usas `addInitScript`).

---

## 8. Tu primer cambio, paso a paso

1. Lee `PROJECT.md` + `docs/REQUISITOS.md` + este archivo.
2. Levanta `python3 -m http.server 8099` y abre ambas UIs; mira la consola.
3. Haz el cambio. Si toca datos/UI, respeta el patrón `ejecutarConDeshacer`
   y sincroniza los cachés. Si toca SQL, migración idempotente **+**
   `schema.sql`, validados en Postgres local.
4. Verifica: `node --check` + `smoke.js` (+ `integracion.js` con Postgres si
   tocaste SQL/store) + el flujo real en Chromium.
5. Un commit por unidad lógica, mensaje en español declarando cambios de
   comportamiento. Recuerda: **push a la rama = producción.**
