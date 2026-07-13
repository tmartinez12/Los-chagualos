# Base de datos · cómo instalar y migrar

## Instalación NUEVA (base vacía)

Correr **solo** `schema.sql` en el SQL Editor de Supabase. Es el instalador
canónico completo: tablas, vistas, funciones (`hoy_finca`,
`registrar_parto_completo`), constraints, índices, permisos y la semilla de
`unidades`. **No** correr ninguna migración después — ya están fusionadas.

## Base EXISTENTE (la desplegada de la finca)

Migraciones **pendientes** de correr, en orden (idempotentes):

| # | Archivo | Qué hace | ¿Ya corrió? |
|---|---|---|---|
| 1 | `migracion-ciclo-vida.sql` | Renombra el grupo `ternera` → `cria` (ambos sexos nacen como cría) y ajusta `registrar_parto_completo`. Las filas con grupo `ternera` pasan a `cria` solas. | corrió jul 2026 |
| 2 | `migracion-movimientos-grupo.sql` | Crea la tabla `movimientos_grupo` (historial del ciclo de vida: cada cambio de grupo con su fecha) y la función `mover_grupo()`. Correr DESPUÉS de la #1. | corrió jul 2026 |
| 3 | `migracion-vacunas-lista.sql` | Crea `vacunaciones_animales` (la lista EXACTA de animales de cada vacunación — checkboxes) y el RPC `registrar_vacunacion_completa()`. Arregla que una vaca nueva apareciera vacunada por eventos anteriores. | **pendiente** (jul 2026) |

Las 6 migraciones de la tanda anterior (vacunaciones, zona-horaria,
integridad, nacimiento, restaurar, ganancia) ya corrieron y están en
`migraciones-aplicadas/` (regla 3 de abajo).

Utilidades (no son migraciones):

- `limpiar-datos.sql` — vacía TODOS los datos conservando la estructura.
  ⚠️ Irreversible; hacer respaldo antes.
- `seed-demo.sql` — datos de demostración. No cargar en la base real.

## ⛔ `migraciones-aplicadas/` — NO volver a correr en producción

Migraciones ya aplicadas a la base de la finca y ya fusionadas en
`schema.sql`. Se conservan como registro histórico. En particular
`migracion-color.sql` es **destructiva si se re-ejecuta** (recrea la vista
`v_animales` con una definición vieja que hoy falla y la dejaría eliminada) y
`migracion-integridad.sql` es orden-dependiente (recrea `v_animales` con una
definición previa a `migracion-ganancia.sql`). La tanda de jul 2026
(vacunaciones/zona-horaria/nacimiento/restaurar/ganancia) es idempotente —
re-correrla no daña, pero tampoco hace falta: ya está toda en `schema.sql`.
`test/integracion.js` re-ejecuta las idempotentes SOLO en la base efímera
local, nunca en producción.

## Reglas para cambios futuros

1. Todo cambio de esquema se hace en DOS lugares: una migración nueva
   `migracion-<nombre>.sql` (idempotente, para la base desplegada) **y**
   `schema.sql` (para instalaciones nuevas). Si no están sincronizados, la
   base desplegada y el repo divergen.
2. Validar SIEMPRE en un Postgres local antes de tocar Supabase:
   cargar `schema.sql` en una base fresca, y la migración (dos veces) sobre
   una base construida con el `schema.sql` del commit anterior.
3. Cuando una migración ya corrió en la base de la finca y está fusionada en
   `schema.sql`, moverla a `migraciones-aplicadas/`.
4. Principio del modelo: los valores derivados (edad, DEL, leche de ayer,
   retiro, parto estimado, conteo de partos) viven en la vista `v_animales`
   y NUNCA se guardan como columnas.
