# Plan de mejora del backend · con modelo de IA asignado por tarea

> Fecha: 2026-07-10. Complementa `docs/PLAN-MEJORAS.md` (que ya cubrió UI,
> estado único y XSS). Este plan ataca lo que queda del **backend**
> (Supabase Postgres + `core/store.js` + respaldos), priorizado por la
> crítica de seguridad y robustez, y asigna a cada tarea el modelo de
> Claude más pequeño que puede hacerla bien.
>
> **Principio de asignación:** el modelo caro DISEÑA y REVISA (una vez,
> pocos tokens, decisiones irreversibles); el mediano IMPLEMENTA (código
> con criterio dentro de un diseño dado); el pequeño EJECUTA lo mecánico
> y bien especificado (specs exactas, sin ambigüedad).
>
> | Modelo | ID | Precio in/out por MTok | Úsalo para |
> |---|---|---|---|
> | Haiku 4.5 | `claude-haiku-4-5` | $1 / $5 | Tareas mecánicas con spec exacta |
> | Sonnet 5 | `claude-sonnet-5` | $3 / $15 (intro $2/$10) | Implementación estándar con criterio |
> | Opus 4.8 | `claude-opus-4-8` | $5 / $25 | Diseño de seguridad, revisión final |
>
> Regla práctica: si la tarea se puede describir en una spec de una página
> sin dejar decisiones abiertas → Haiku. Si requiere leer el código
> existente y tomar decisiones locales → Sonnet. Si un error es
> irreversible o compromete la seguridad de toda la base → Opus diseña o
> revisa, aunque otro implemente.

---

## Fase 1 · Cerrar la puerta (A1: auth + RLS) — lo único CRÍTICO

Hoy: RLS desactivado, `GRANT ALL` a `anon`, anon key pública en repo
público. Cualquiera lee/escribe/borra todo. `restaurar_respaldo()` es
ejecutable por `anon` y trunca 8 tablas.

| # | Tarea | Modelo | Por qué ese modelo |
|---|---|---|---|
| 1.1 | **Diseñar el modelo de seguridad**: Supabase Auth (email+password de la dueña, o magic link) vs. revivir PIN; matriz de políticas RLS por tabla × rol (admin/operario/anon); qué pasa con los respaldos automáticos (service key en GitHub Actions); plan de rotación de la anon key. Entregable: documento de una página con la matriz. | **Opus 4.8** | Decisión de seguridad irreversible; el costo de equivocarse supera con creces los ~$0.50 de la sesión de diseño. |
| 1.2 | **Implementar el login** en las 3 páginas (index/escritorio/conexion): sesión Supabase Auth, pantalla de entrada, refresh de token, logout. | **Sonnet 5** | Integración estándar de supabase-js v2 con criterio sobre el código existente (store.js, TDZ, cache-busting). |
| 1.3 | **Escribir la migración RLS** a partir de la matriz de 1.1: `ENABLE ROW LEVEL SECURITY` + una política por tabla × operación, `REVOKE ALL FROM anon`, `REVOKE EXECUTE ON FUNCTION restaurar_respaldo FROM anon, authenticated` (solo un rol admin puede restaurar). Idempotente, dos archivos (migración + schema.sql). | **Haiku 4.5** | Con la matriz de 1.1 como spec, es transcripción mecánica de SQL repetitivo. La validación local (paso 1.5) atrapa errores. |
| 1.4 | **Endurecer las funciones**: `SET search_path = public, pg_temp` y `SECURITY INVOKER` explícito en `hoy_finca`, `registrar_parto_completo`, `restaurar_respaldo`, `trigger_set_updated_at`. | **Haiku 4.5** | Cambio mecánico con patrón fijo por función. |
| 1.5 | **Validar en Postgres local** (protocolo de CLAUDE.md: schema fresco + migración ×2 sobre schema del commit anterior) y en Chromium: con login las dos UIs funcionan, sin login la BD devuelve cero filas y la app lo dice claro (no pantalla blanca). | **Sonnet 5** | Requiere interpretar fallos y ajustar; es la red de seguridad de 1.3/1.4. |
| 1.6 | **Revisión final de la migración** antes de que la dueña la corra en producción: leer el diff completo buscando el error que dejaría a la dueña fuera de su propia base. | **Opus 4.8** | Revisión barata (solo lectura) de un cambio irreversible en producción sin staging. |

## Fase 2 · Concurrencia honesta (OCC en los flujos de guardado)

Hoy: `updateAnimalCampos` ya soporta `expectedUpdatedAt` pero casi ningún
flujo lo pasa → last-write-wins silencioso entre el celular y el
escritorio. Y `registrarOrdeno` detecta "pisados" con read-then-upsert no
atómico.

| # | Tarea | Modelo | Por qué |
|---|---|---|---|
| 2.1 | **Extender OCC a los 6 flujos** de `core/acciones.js` (palpación, secado, baja, parto, edición, tratamiento): pasar `updatedAt` del animal cacheado, manejar el error `CONFLICTO` con snack + recarga de la ficha. | **Sonnet 5** | Toca los 6 `save*` × 2 superficies con sus cachés y "Deshacer"; requiere el mismo cuidado que tuvo el refactor de acciones. |
| 2.2 | **Hacer atómica la detección de "pisado"**: reemplazar el read-then-upsert de `registrarOrdeno` por un solo statement (`INSERT … ON CONFLICT DO UPDATE … RETURNING (xmax <> 0) AS existia, litros_previos` vía RPC pequeño, o upsert que devuelva el valor anterior). Migración + store.js. | **Sonnet 5** | SQL no trivial + cambio de contrato en store.js con fallback. |
| 2.3 | **Test de integración** del conflicto: dos escrituras concurrentes sobre el mismo animal, la segunda debe fallar con `CONFLICTO`. Añadir a `test/integracion.js` parte B. | **Haiku 4.5** | El patrón de test ya existe en el archivo; es replicar la estructura con otro caso. |

## Fase 3 · Fallbacks ruidosos, no silenciosos

Hoy: vista ausente → cae a tabla base; RPC ausente → cae a 3 escrituras
NO transaccionales (el bug que el RPC arregló). En producción madura los
fallbacks de "migración pendiente" deben avisar, y el no transaccional
debe morir.

| # | Tarea | Modelo | Por qué |
|---|---|---|---|
| 3.1 | **Decidir la política**: ¿eliminar los fallbacks ya (las migraciones están aplicadas en producción) o mantenerlos con un banner "BD desactualizada, corre la migración X"? Recomendación por defecto: eliminarlos y fallar con mensaje claro. | **Opus 4.8** (o decisión humana directa — es una sola pregunta) | Cambia el contrato de instalación limpia documentado en supabase/README. |
| 3.2 | **Implementarlo**: quitar los caminos `42P01`/`PGRST202`/`42883` de `store.js` (o convertirlos en error con mensaje accionable), actualizar `supabase/README.md`. | **Sonnet 5** | Hay que verificar qué rutas de la UI dependían del fallback. |

## Fase 4 · Auditoría: que la BD sepa quién hizo qué

Hoy: `registrado_por` existe en 7 tablas y siempre es NULL. Con el login
de la Fase 1 ya hay un `auth.uid()` real que registrar.

| # | Tarea | Modelo | Por qué |
|---|---|---|---|
| 4.1 | Poblar `registrado_por` en cada escritura: `DEFAULT auth.uid()` vía migración (no tocar store.js para esto), y mostrar "registrado por" en los historiales del escritorio. | **Sonnet 5** | La parte SQL es simple; la parte UI toca varios renders con el patrón esc() reciente. |
| 4.2 | Sincronizar `COLUMNAS_RESPALDO`/`TABLAS` si cambia alguna columna, y correr los tests de contrato. | **Haiku 4.5** | Mecánico; `test/integracion.js` ya verifica el resultado. |

## Fase 5 · Limpiar el esquema muerto

Hoy: `profiles`, `login_attempts` y `outbox` existen sin uso. Esquema que
documenta intenciones confunde a cualquier futuro mantenedor (humano o
modelo).

| # | Tarea | Modelo | Por qué |
|---|---|---|---|
| 5.1 | Tras la Fase 1: `profiles`/`login_attempts` o se usan (si quedó auth por PIN) o se eliminan (si quedó Supabase Auth, que trae sus propias tablas). `outbox` se elimina salvo que se decida construir el offline real (proyecto aparte, no de este plan). Migración + schema.sql + README. | **Haiku 4.5** | `DROP TABLE IF EXISTS` idempotente con spec dada por la decisión de Fase 1. |

## Fase 6 · Robustez operativa

| # | Tarea | Modelo | Por qué |
|---|---|---|---|
| 6.1 | **Verificación del respaldo**: que `respaldo.yml` (2×/semana) valide el JSON exportado (tablas presentes, conteos > 0, ids únicos) y falle el workflow si el respaldo salió vacío — hoy un export roto pasaría en silencio. | **Haiku 4.5** | Script Node corto con spec clara; el patrón de validación ya existe en `restaurarTodo`. |
| 6.2 | **Proyecto Supabase de staging** (segundo proyecto gratuito): documentar en supabase/README cómo aplicar migraciones ahí primero, con la anon key de staging en `conexion.html` local. | **Sonnet 5** | Documentación + pequeños cambios de configuración con criterio. |
| 6.3 | **Test de regresión "Deshacer"** (pendiente de GAPS.md): arnés Playwright que ejercite los 6 flujos × 2 superficies con LCStore simulado, verificando aplicar→deshacer→estado idéntico. Correría en CI. | **Sonnet 5** | Es la codificación de las docenas de verificaciones manuales de Chromium de las sesiones pasadas; requiere entender los cachés locales de cada flujo. |
| 6.4 | `v_animales` con `LEFT JOIN LATERAL` en vez de 4 subqueries correlacionadas — **solo si** el hato pasa de ~1.000 animales o la carga se siente lenta. No hacerlo antes (derivar > optimizar prematuro). | **Sonnet 5** | Reescritura de vista con test de paridad ya existente como red. |

---

## Resumen de asignación

| Modelo | Tareas | Naturaleza |
|---|---|---|
| **Opus 4.8** | 1.1, 1.6, 3.1 | Diseño de seguridad y revisión de cambios irreversibles. Pocas sesiones, pocos tokens, máximo criterio. |
| **Sonnet 5** | 1.2, 1.5, 2.1, 2.2, 3.2, 4.1, 6.2, 6.3, 6.4 | El grueso de la implementación: código con criterio dentro de un diseño dado. |
| **Haiku 4.5** | 1.3, 1.4, 2.3, 4.2, 5.1, 6.1 | SQL/scripts mecánicos con spec exacta y tests que atrapan errores. |

**Claves para que los modelos pequeños funcionen bien aquí:**

1. **La spec es el contrato.** Haiku rinde cuando la tarea llega con la
   matriz/spec ya escrita (por Opus o por un humano) y con un test que
   verifica el resultado. Nunca darle a Haiku una tarea con decisiones
   de diseño abiertas.
2. **Los tests existentes son la red.** `smoke.js` + `integracion.js`
   (paridad SQL↔JS, contrato respaldo, idempotencia de migraciones)
   convierten tareas riesgosas en tareas delegables: si el test pasa,
   la tarea mecánica quedó bien.
3. **Todo SQL pasa por la validación local** (protocolo CLAUDE.md) sin
   importar qué modelo lo escribió, y la Fase 1 además por revisión de
   Opus — porque no hay staging y push = producción.
4. **Orden de fases**: la Fase 1 va primero y sola (es lo único crítico
   y cambia el contexto de las demás — auditoría y limpieza dependen de
   qué auth quede). Las fases 2–6 son independientes entre sí.
