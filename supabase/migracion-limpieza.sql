-- =============================================================================
-- Los Chagualos · Limpieza del backend (quita duplicados que pueden dar errores)
-- =============================================================================
-- Elimina de la tabla `animales` las columnas que la vista v_animales ya
-- recalcula sola (se "congelaban" y contradecían al valor derivado), y borra
-- las tablas que quedaron sin uso al quitar la parte de lecheros.
--
-- Es idempotente y NO borra tus animales ni tus ordeños. Corre una sola vez.
-- Antes de correrlo, refresca la app (para que ya use la versión nueva que no
-- escribe esas columnas).
-- =============================================================================

-- 1) No perder el DEL: pasar el valor guardado a inicio_lactancia donde falte.
--    (DEL = hoy − inicio_lactancia; así la lactancia en curso se conserva.)
--    Va dentro de un DO con guardia: si ya corriste la limpieza, la columna
--    `del` ya no existe y este paso se salta sin error (idempotente).
ALTER TABLE animales ADD COLUMN IF NOT EXISTS inicio_lactancia DATE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'animales' AND column_name = 'del') THEN
    UPDATE animales
       SET inicio_lactancia = CURRENT_DATE - del
     WHERE inicio_lactancia IS NULL AND del IS NOT NULL;
  END IF;
END $$;

-- 2) Quitar la vista (depende de animales.*) para poder soltar columnas.
DROP VIEW IF EXISTS v_animales CASCADE;

-- 3) Soltar las columnas redundantes de `animales`.
--    OJO: retiro_leche_hasta se quita SOLO de animales; en `tratamientos`
--    sigue siendo la fuente real y NO se toca.
ALTER TABLE animales
  DROP COLUMN IF EXISTS del,
  DROP COLUMN IF EXISTS leche_ayer,
  DROP COLUMN IF EXISTS parto_estimado,
  DROP COLUMN IF EXISTS dias_vacia,
  DROP COLUMN IF EXISTS secar_estimado,
  DROP COLUMN IF EXISTS retiro_leche_hasta;

-- 4) Recrear la vista v_animales (igual que antes; ahora a.* ya no trae las
--    columnas soltadas, pero los _calc se siguen derivando de las fuentes).
CREATE VIEW v_animales AS
SELECT a.*,
  CASE WHEN a.nacimiento IS NOT NULL
       THEN round(((CURRENT_DATE - a.nacimiento) / 365.25)::numeric, 1) END AS edad_calc,
  CASE WHEN a.inicio_lactancia IS NOT NULL
       THEN (CURRENT_DATE - a.inicio_lactancia) END AS del_calc,
  ( SELECT o.litros FROM ordenos o
    WHERE o.animal_id = a.id AND o.turno = 'dia'
    ORDER BY o.fecha DESC LIMIT 1 ) AS leche_ultima,
  ( SELECT max(t.retiro_leche_hasta) FROM tratamientos t
    WHERE t.animal_id = a.id AND t.activo
      AND t.retiro_leche_hasta >= CURRENT_DATE ) AS retiro_calc,
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN (a.ultima_palpacion + (round((9 - a.prenez_meses))::int * INTERVAL '1 month'))::date END AS parto_estimado_calc,
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN (a.ultima_palpacion + (round((7 - a.prenez_meses))::int * INTERVAL '1 month'))::date END AS secar_calc,
  CASE WHEN a.estado_repro = 'vacia' AND a.ultima_palpacion IS NOT NULL
       THEN (CURRENT_DATE - a.ultima_palpacion) END AS dias_vacia_calc,
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN least(9, round((a.prenez_meses + (CURRENT_DATE - a.ultima_palpacion) / 30.44)::numeric, 1)) END AS prenez_meses_actual
FROM animales a;
GRANT SELECT ON v_animales TO anon, authenticated;

-- 5) Borrar tablas sin uso (quedó fuera la parte de lecheros; la producción
--    mensual se deriva de los ordeños con v_produccion_mensual).
--    entregas referencia lecheros (FK), por eso va primero.
DROP TABLE IF EXISTS entregas CASCADE;
DROP TABLE IF EXISTS lecheros CASCADE;
DROP TABLE IF EXISTS tarifa CASCADE;
DROP TABLE IF EXISTS consumo_interno CASCADE;
DROP TABLE IF EXISTS produccion_mensual CASCADE;
