# Base de datos · cómo instalar y migrar

## Instalación NUEVA (base vacía)

Correr **solo** `schema.sql` en el SQL Editor de Supabase. Es el instalador
canónico completo: tablas, vistas, funciones (`hoy_finca`,
`registrar_parto_completo`), constraints, índices, permisos y la semilla de
`unidades`. **No** correr ninguna migración después — ya están fusionadas.

## Base EXISTENTE (la desplegada de la finca)

Migraciones activas, en este orden (todas idempotentes — se pueden correr
más de una vez sin daño):

| # | Archivo | Qué hace | ¿Ya corrió? |
|---|---|---|---|
| 1 | `migracion-vacunaciones.sql` | Crea la tabla `vacunaciones` | correr si el registro de vacunas falla |
| 2 | `migracion-zona-horaria.sql` | Fechas en hora de Colombia (`hoy_finca`) | jul 2026 |
| 3 | `migracion-integridad.sql` | Constraints, FKs coherentes, índice, parto transaccional (RPC), revokes | **pendiente** |
| 4 | `migracion-nacimiento.sql` | Backfill: estima `nacimiento` desde `edad_anios` (sin él la edad no avanza) | **pendiente** |
| 5 | `migracion-restaurar.sql` | Función `restaurar_respaldo()` (restauración transaccional; sin ella, restaurar hace un merge no-transaccional) | **pendiente** |

Utilidades (no son migraciones):

- `limpiar-datos.sql` — vacía TODOS los datos conservando la estructura.
  ⚠️ Irreversible; hacer respaldo antes.
- `seed-demo.sql` — datos de demostración. No cargar en la base real.

## ⛔ `migraciones-aplicadas/` — NO volver a correr

Migraciones históricas ya aplicadas a la base de la finca y ya fusionadas en
`schema.sql`. Se conservan solo como registro. En particular
`migracion-color.sql` es **destructiva si se re-ejecuta** (recrea la vista
`v_animales` con una definición vieja que hoy falla y la dejaría eliminada).

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
