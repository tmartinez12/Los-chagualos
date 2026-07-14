# Plan de arquitectura — Los Chagualos

> ⚠️ **DOCUMENTO ARCHIVADO / DESACTUALIZADO (jul 2026).** Describe un diseño
> propuesto (una capa `actions.js`, login por PIN, outbox offline) que **NO se
> construyó así** o que ya divergió de lo que existe. La realidad actual está en
> **`PROJECT.md`** (arquitectura), **`GAPS.md`** (deuda) y **`PLAN-MEJORAS.md`**
> (plan vigente). Se conserva solo como registro histórico de intención; no
> seguir sus pasos al pie de la letra.

> Extracción de una capa compartida de datos/lógica entre la versión móvil y
> la de escritorio, pensada como costura para un futuro backend.

## Contexto

Hoy existen **dos bases de código separadas** que no comparten nada:

| | Móvil | Escritorio |
|---|---|---|
| Archivos | `prototipo/index.html`, `styles.css`, `app.js` (653 líneas) | `prototipo/escritorio.html`, `escritorio.css`, `escritorio.js` (1483 líneas) |
| Usuario | Pedro, María (operarios) | Tatiana (administradora) |
| Contexto | En el campo, una mano, prisa | Oficina, análisis con calma |
| Tarea | Captura rápida de datos | Análisis, decisiones, exportar |
| Diseño | Flujos lineales, botones grandes | Tablas densas, dashboards, filtros |

Separar la **capa de experiencia** por dispositivo es legítimo. El problema es que
hoy **también** están duplicados los datos y la lógica de negocio.

**Decisión confirmada:** más adelante se le hará un **backend** a la app. Esto
convierte a la capa compartida en el punto donde se enchufa el backend, y obliga
a modelar los datos con forma de base de datos desde el diseño.

## Principio rector

> Si cambia porque cambió **la finca o la biología de la vaca** → capa compartida.
> Si cambia porque cambió **el dispositivo o el usuario** → capa de presentación.
>
> Y para el modelo de datos: **¿esto lo guardaría una base de datos?** Si no
> (un color, un ícono, un texto armado), no va en el modelo — se deriva en la UI.

## Evidencia: duplicación y divergencia actuales

**Lógica idéntica, copiada literal en `app.js` y `escritorio.js`:**
- `fechaParto(meses)` — cálculo de gestación (~9 meses).
- `fechaDias(dias)` y el array `MESC`.
- Detección de bajón de leche (`v <= ayer*0.75`).
- `snack()` con undo.
- Mecánica de `saveParto / saveSeca / saveTrata / saveAlta / saveBaja` — mismas
  reglas de negocio, distinta mutación de datos.

**Mismos datos, formas distintas (la trampa):**
| Dato | Móvil | Escritorio |
|---|---|---|
| Vacas en ordeño | `cows` (6 vacas) | `milkCows` (7 vacas) |
| Hato | `grupos` (drill-down anidado) | `hato` (array plano de 34) |
| `palpCandidatas` | objeto `{cow:motivo}` (4) | array (5, incluye Mona) |
| `proximosPartos` | `{short,badge,bw}` | `{prenez,parto,badge}` |
| `vacasVacias` | `{diasVacia,ultimaPalp}` | `{dias,ultima}` |

**Divergencias que YA son inconsistencias reales:**
- Paloma "ayer" = 6 L en móvil, 9 L en escritorio.
- Móvil: parser de palpación por chips. Escritorio: parser de **notación
  veterinaria real** (`parsePalpNota`). No coinciden.
- Solo móvil: cola offline (`encolar/desencolar`), rutina, selector de línea.
- Solo escritorio: scatter, tablas ordenables, búsqueda.

→ Cada feature vive en un solo lado: prueba del costo de la duplicación.

## Arquitectura objetivo

```
prototipo/
├── core/
│   ├── model.js     ← forma canónica de las entidades (= futuras tablas/DB),
│   │                  con IDs estables. Sin nada de presentación.
│   ├── store.js     ← ÚNICO punto de acceso a datos (get/set). Hoy lee de
│   │                  memoria; mañana hace fetch() — y NADIE más cambia.
│   ├── rules.js     ← funciones puras: fechaParto, fechaDias, MESC,
│   │                  parsePalpNota, detección de bajón.
│   └── actions.js   ← casos de uso: registrarLeche, palpar, parir, secar,
│                      tratar, altaAnimal, bajaAnimal. Usan store + rules y
│                      devuelven un comando describible { tipo, payload, undo }.
├── index.html + styles.css + app.js              (presentación MÓVIL)
└── escritorio.html + escritorio.css + escritorio.js (presentación ESCRITORIO)
```

Reglas de la frontera:
- `core/*` **nunca toca el DOM**. Funciones puras + estado.
- La UI **nunca lee los arrays directamente**: todo pasa por `store`
  (ej. `store.getHato()` en vez de `hato.filter(...)`).
- Las "formas" distintas (drill-down móvil vs tabla plana) se **derivan** del
  modelo canónico con selectores (`getGrupos()`, `getHatoPlano()`).
- Las cadenas tipo `"preñada 6m"` y los badges se **derivan en la UI**, no se
  almacenan.

### Modelo con forma de DB (ejemplo)

```js
// canónico: cómo lo guardará la base de datos
{ id:'042', nombre:'Lucero', grupo:'ordeño', del:152,
  estadoRepro:'prenada', mesesPrenez:6, /* ... */ }
```
- **IDs estables e inmutables** desde ya (no el índice del array, no el nombre).
  El backend los exige y las relaciones (cría→madre, tratamiento→animal) dependen
  de ellos.

## Decisión sobre async

**No** hacer todo asíncrono ahora (Promesas en todo) — para un prototipo en
memoria es fricción prematura. En su lugar:
- Mantener `store` **síncrono hoy**, pero con todos los accesos pasando por él.
- Diseñar las **acciones** para que devuelvan un objeto-comando serializable
  (`{ tipo:'registrarLeche', payload, undo }`) — justo lo que después se encola
  para sync y se manda al backend.

Así el costo de async se paga una sola vez, en el futuro, y localizado en
`store.js` + los call-sites de acciones — no reescribiendo toda la UI.

La cola offline que ya tiene el móvil (`encolar/desencolar`) es el patrón de
sincronización: acciones optimistas que se encolan y se suben cuando hay señal.
Pertenece a `core/store.js`, y encaja con el undo existente (una acción encolada
se puede revertir antes de subir).

## Migración por fases (incremental, sin congelar el proyecto)

Cada fase deja la app funcionando; se puede pausar entre fases.

- **Fase 0 — Canonizar el modelo (con forma de DB).** Definir en `core/model.js`
  la forma única de cada entidad, con IDs estables. Reconciliar divergencias
  (decidir: Paloma da X litros, punto). Es el cimiento del backend.
  *Recomendación: hacerla cuando se arranque el backend de verdad, para canonizar
  junto al esquema real de la DB y no dos veces.*

- **Fase 1 — Reglas puras.** Mover `fechaParto`, `fechaDias`, `MESC`,
  `parsePalpNota`, detección de bajón a `core/rules.js`. Ambas UIs las importan
  en vez de tener su copia. **Mejor punto de arranque: máximo valor, riesgo casi
  nulo** (funciones sin estado).

- **Fase 2 — Acciones.** Extraer la lógica de negocio de
  `saveParto/Seca/Trata/Alta/Baja/Palp` a `core/actions.js`, que muta el estado
  vía `store` y devuelve `{ mensaje, undo }` (comando serializable). Cada UI
  conserva solo: abrir modal → llamar acción → renderizar → mostrar snack.

- **Fase 3 — Selectores de presentación.** `getGrupos()` para el drill-down
  móvil y `getHatoPlano()` / `getOrdeño()` para las tablas del escritorio, ambos
  derivados del mismo array canónico.

- **Fase 4 — Paridad de features.** Con el core unificado, las features
  "huérfanas" se vuelven baratas de portar: scatter y búsqueda a móvil, o cola
  offline a escritorio, según prioridad.

## Riesgos y mitigación

- **Prototipo sin build ni tests** → usar `<script>` simples en orden (core
  primero) y un mini-arnés de verificación en Node (simulando el DOM) para
  validar el core sin navegador. Ya se usó en esta sesión.
- **Reconciliar divergencias cambia números visibles** → hacerlo explícito en
  Fase 0 y consultar los casos ambiguos (ej. litros de Paloma).
- **No hacerlo de un solo golpe** → fases independientes; la app sigue corriendo
  entre cada una.

## Esfuerzo estimado

| Fase | Alcance | Riesgo |
|---|---|---|
| 1 — Reglas puras | ~1 sesión | Bajo |
| 2 — Acciones | ~2 sesiones | Medio |
| 3 — Selectores | ~1 sesión | Medio |
| 0 — Modelo con forma de DB | ~1–2 sesiones | Medio (fundacional) |
| 4 — Paridad | continuo | Bajo–medio |

## Recomendación de secuencia

1. **Ahora:** ejecutar **Fase 1** (reglas puras) — elimina la duplicación más
   peligrosa, la de las reglas biológicas, con riesgo casi nulo.
2. **Al arrancar el backend:** ejecutar **Fase 0** (modelo con forma de DB)
   junto al diseño del esquema real, seguida de Fase 2 y 3.
3. **Continuo:** Fase 4 según las prioridades de producto.
