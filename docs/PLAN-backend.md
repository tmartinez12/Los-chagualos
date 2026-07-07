# Plan de backend — Los Chagualos

> Decisiones tomadas para construir el backend. **Aún no se ejecuta**: primero
> se revisa y ajusta el prototipo. Este documento es el punto de partida para
> retomar (el contenedor es efímero, por eso queda en el repo).

## Decisiones confirmadas

| Tema | Decisión |
|---|---|
| **Stack** | Supabase (Postgres + Auth + Row Level Security + API REST/Realtime) |
| **Offline** | Offline-first desde el MVP |
| **Alcance MVP** | Solo unidad **Leche** (hato, ordeño, entregas, reproducción, sanidad, partos) |
| **Auth** | **PIN por operario** (no email/contraseña) |
| **Roles** | `admin` (Tatiana — todo) · `operario` (Pedro/María — registra en su unidad) |

## Implicaciones de cada decisión

### Supabase
- El modelo canónico (`prototipo/core/model.js`) es ~80% del esquema: se traduce
  a tablas Postgres con llaves foráneas, enums e índices.
- Roles aplicados con **RLS**: el operario solo escribe en su unidad; el admin
  ve y edita todo. Las políticas leen el rol/unidad del JWT de la sesión.

### Auth por PIN (requiere diseño — Supabase Auth no hace PIN nativo)
Supabase Auth nativo es email/teléfono/OAuth, no PIN. Camino propuesto:
- Tabla `profiles` (operario, nombre, unidad, rol, **pin_hash**).
- Una **Edge Function** `login-pin` valida el PIN (hash) y emite un JWT con
  claims `role` y `unidad` (o crea una sesión Supabase).
- RLS y la app usan ese JWT.
- Consideración de seguridad: PIN corto = baja entropía → limitar intentos
  (rate limit por dispositivo), PINs por persona (no compartidos), y atar la
  sesión al dispositivo. Suficiente para un equipo pequeño y de confianza en
  campo; revisar si se escala.

### Offline-first (lo que más define la arquitectura)
- Patrón **outbox**: la cola `encolar/desencolar` ya prototipada en `app.js`.
- `core/store.js` se vuelve la frontera: lee de almacenamiento local
  (IndexedDB), escribe local + encola la mutación; un *sync worker* sube cuando
  hay señal.
- Conflictos: **last-write-wins** al inicio (simple y suficiente para el MVP).
- Camino de upgrade futuro: **PowerSync** (offline robusto para Supabase) si la
  finca crece o aparecen conflictos reales.

### Alcance Leche
- Finanzas y cultivos quedan como tablas/módulos **inactivos listos para
  activar** (ya previstos en el registro `unidades`/`modulos` de `model.js`).

## Lo que se necesita para desplegar y correr
- Un **proyecto Supabase** + credenciales (URL, anon key, service key) como
  variables de entorno/secreto del entorno de ejecución.
- Tener en cuenta la **política de red** del entorno remoto para probar contra
  el backend real.

## Datos iniciales: base vacía + importación desde Excel

La base **arranca vacía** (sin datos de demo / sin seed). Tatiana la llena
después importando sus Excel.

- Se preparan **plantillas Excel/CSV** (una por tabla: animales, lecheros,
  partos, tratamientos, potreros…) con las columnas exactas del esquema.
- Importación vía el editor de tablas de Supabase (Excel → CSV → subir), o con
  un pequeño script de importación si se prefiere.
- El modelo canónico (`core/model.js`) define las columnas; las plantillas
  salen de ahí.

## Orden de construcción propuesto (cuando se retome)
1. **Esquema SQL (DDL)** derivado de `model.js` — tablas, FKs, enums, índices.
   *(No requiere la nube; se verifica con un Postgres local efímero.)*
2. **RLS + `profiles` + Edge Function `login-pin`** (auth por PIN, roles).
3. **Plantillas Excel/CSV** por tabla + guía de importación. *(Reemplaza al seed.)*
4. **`core/store.js`** — capa offline-first (local + outbox + sync worker).
5. **Cablear las UIs** a `store.js` (Fase 2-3 del plan de arquitectura).

## Estado actual del prototipo (base para el backend)
- `prototipo/core/model.js` — modelo canónico con forma de DB (Fase 0). ✅
- `prototipo/core/rules.js` — reglas puras compartidas (Fase 1). ✅
- `PLAN-arquitectura.md` — plan de la capa compartida y fases.
- Pendiente antes de backend: **revisar y corregir cosas del prototipo** (por
  pedido del usuario).
