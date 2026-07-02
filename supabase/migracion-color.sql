-- =============================================================================
-- Los Chagualos · Agregar COLOR y NOTA del animal
-- =============================================================================
-- Nuevas columnas animales.color ("negra", "pinta roja"…) y animales.nota
-- (texto libre: "patea al ordeño", "propensa a mastitis"…).
-- La vista v_animales usa a.*, pero las columnas nuevas NO entran solas a una
-- vista ya creada: hay que recrearla. Idempotente (se puede correr 2 veces).
-- =============================================================================

ALTER TABLE animales ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE animales ADD COLUMN IF NOT EXISTS nota TEXT;

DROP VIEW IF EXISTS v_animales CASCADE;
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
