-- =============================================================================
-- Los Chagualos · Segunda simplificación: más datos derivados, menos guardados
-- =============================================================================
-- Elimina columnas que salen de otros datos (una sola fuente de verdad):
--   animales.partos            → se CUENTA de la tabla partos (la vista lo expone)
--   tratamientos.retiro_leche_hasta → inicio + dias_retiro
--   hijas_vivas, lista_servicio, destete_proximo, sanidad_al_dia,
--   leche_hoy, monta_natural, venta_programada → derivadas o sin uso
-- Idempotente: se puede correr más de una vez. No borra animales ni registros.
-- =============================================================================

-- 0) Conservar la información antes de soltar columnas.
--    dias_retiro se completa desde retiro_leche_hasta si hiciera falta.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='tratamientos' AND column_name='retiro_leche_hasta') THEN
    UPDATE tratamientos
       SET dias_retiro = GREATEST(COALESCE(dias_retiro,0), (retiro_leche_hasta - inicio))
     WHERE retiro_leche_hasta IS NOT NULL;
  END IF;
END $$;
--    Si una vaca tiene conteo guardado MAYOR que sus partos con fecha, se crean
--    partos históricos aproximados para no perder el conteo (uno por año hacia atrás).
DO $$
DECLARE r RECORD; faltan INT; i INT; base DATE;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='animales' AND column_name='partos') THEN
    FOR r IN SELECT a.id, a.partos,
                    (SELECT count(*) FROM partos p WHERE p.madre_id=a.id) AS reales,
                    (SELECT min(p.fecha) FROM partos p WHERE p.madre_id=a.id) AS primero
             FROM animales a WHERE a.partos>0 LOOP
      faltan := r.partos - r.reales;
      base := COALESCE(r.primero, CURRENT_DATE);
      i := 1;
      WHILE i <= faltan LOOP
        INSERT INTO partos(id, madre_id, fecha, sexo_cria, tipo, estado_cria)
        VALUES ('P-hist-'||r.id||'-'||i, r.id, base - (i*380), NULL, 'normal', 'viva')
        ON CONFLICT (id) DO NOTHING;
        i := i + 1;
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- 1) Soltar la vista y las columnas redundantes.
DROP VIEW IF EXISTS v_animales CASCADE;
ALTER TABLE animales
  DROP COLUMN IF EXISTS partos,
  DROP COLUMN IF EXISTS leche_hoy,
  DROP COLUMN IF EXISTS sanidad_al_dia,
  DROP COLUMN IF EXISTS hijas_vivas,
  DROP COLUMN IF EXISTS monta_natural,
  DROP COLUMN IF EXISTS destete_proximo,
  DROP COLUMN IF EXISTS venta_programada,
  DROP COLUMN IF EXISTS lista_servicio;
ALTER TABLE tratamientos DROP COLUMN IF EXISTS retiro_leche_hasta;

-- 2) Recrear la vista: ahora también CUENTA los partos y deriva el retiro
--    de leche desde inicio + dias_retiro del tratamiento activo.
CREATE VIEW v_animales AS
SELECT a.*,
  (SELECT count(*)::int FROM partos p WHERE p.madre_id = a.id) AS partos,
  CASE WHEN a.nacimiento IS NOT NULL
       THEN round(((CURRENT_DATE - a.nacimiento) / 365.25)::numeric, 1) END AS edad_calc,
  CASE WHEN a.inicio_lactancia IS NOT NULL
       THEN (CURRENT_DATE - a.inicio_lactancia) END AS del_calc,
  ( SELECT o.litros FROM ordenos o
    WHERE o.animal_id = a.id AND o.turno = 'dia'
    ORDER BY o.fecha DESC LIMIT 1 ) AS leche_ultima,
  ( SELECT max(t.inicio + t.dias_retiro) FROM tratamientos t
    WHERE t.animal_id = a.id AND t.activo AND t.dias_retiro > 0
      AND (t.inicio + t.dias_retiro) >= CURRENT_DATE ) AS retiro_calc,
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
