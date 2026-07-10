-- =============================================================================
-- Migración: ganancia_dia_g DERIVADA (no más columna muerta)
-- -----------------------------------------------------------------------------
-- `ganancia_dia_g` era una columna persistida que la app NUNCA calculaba ni
-- capturaba: siempre quedaba en NULL en producción. Se pasa a valor DERIVADO en
-- v_animales — ganancia media diaria desde el nacimiento (g/día) — siguiendo el
-- principio "derivar, no guardar", y se elimina la columna persistida.
--
-- Idempotente: se puede correr más de una vez sin daño. La vista se recrea con
-- su definición COMPLETA y correcta (no depende del estado anterior), así que
-- re-ejecutarla no la deja en un estado viejo.
-- =============================================================================

BEGIN;

-- 1) soltar la vista: hoy expone ganancia_dia_g vía `a.*`, así que hay que
--    recrearla para poder quitar la columna base.
DROP VIEW IF EXISTS v_animales;

-- 2) quitar la columna persistida (era muerta: nunca se calculaba)
ALTER TABLE animales DROP COLUMN IF EXISTS ganancia_dia_g;

-- 3) recrear v_animales con ganancia_dia_g DERIVADA
CREATE VIEW v_animales AS
SELECT a.*,
  (SELECT count(*)::int FROM partos p WHERE p.madre_id = a.id) AS partos,
  CASE WHEN a.nacimiento IS NOT NULL
       THEN round(((hoy_finca() - a.nacimiento) / 365.25)::numeric, 1) END AS edad_calc,
  CASE WHEN a.inicio_lactancia IS NOT NULL
       THEN (hoy_finca() - a.inicio_lactancia) END AS del_calc,
  ( SELECT o.litros FROM ordenos o
    WHERE o.animal_id = a.id AND o.turno = 'dia'
    ORDER BY o.fecha DESC LIMIT 1 ) AS leche_ultima,
  ( SELECT max(t.inicio + t.dias_retiro) FROM tratamientos t
    WHERE t.animal_id = a.id AND t.activo AND t.dias_retiro > 0
      AND (t.inicio + t.dias_retiro) >= hoy_finca() ) AS retiro_calc,
  -- calculados EN DÍAS (30,44 días/mes): el round por meses metía ±15 días de error
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN a.ultima_palpacion + round((9 - a.prenez_meses) * 30.44)::int END AS parto_estimado_calc,
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN a.ultima_palpacion + round((7 - a.prenez_meses) * 30.44)::int END AS secar_calc,
  CASE WHEN a.estado_repro = 'vacia' AND a.ultima_palpacion IS NOT NULL
       THEN (hoy_finca() - a.ultima_palpacion) END AS dias_vacia_calc,
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN least(9, round((a.prenez_meses + (hoy_finca() - a.ultima_palpacion) / 30.44)::numeric, 1)) END AS prenez_meses_actual,
  -- ganancia media diaria desde el nacimiento (g/día); útil en terneras/levante.
  -- Requiere peso y nacimiento; sin historial de pesajes es la mejor derivación.
  CASE WHEN a.peso_kg IS NOT NULL AND a.nacimiento IS NOT NULL
            AND (hoy_finca() - a.nacimiento) > 0
       THEN round(a.peso_kg * 1000.0 / (hoy_finca() - a.nacimiento)) END AS ganancia_dia_g
FROM animales a;

-- 4) re-otorgar permisos (la vista se recreó desde cero)
GRANT ALL ON v_animales TO anon, authenticated;

COMMIT;
