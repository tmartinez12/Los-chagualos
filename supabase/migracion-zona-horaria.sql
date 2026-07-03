-- =============================================================================
-- Los Chagualos · Zona horaria de la finca (America/Bogota)
-- =============================================================================
-- Problema: CURRENT_DATE y now() en Supabase corren en UTC. Colombia es UTC−5,
-- así que entre las 7pm y medianoche "hoy" en UTC ya es el día SIGUIENTE. Un
-- ordeño, parto o tratamiento registrado en la tarde-noche quedaba mal fechado,
-- y la edad/DEL/retiro calculados en la vista podían adelantarse un día.
--
-- Solución: una función hoy_finca() que devuelve la fecha real en Colombia, y
-- usarla en los DEFAULT de las tablas de eventos y en la vista v_animales.
-- Idempotente: se puede correr más de una vez.
-- =============================================================================

-- 1) La fecha "de hoy" en la zona de la finca.
CREATE OR REPLACE FUNCTION hoy_finca() RETURNS date
  LANGUAGE sql STABLE
  AS $$ SELECT (now() AT TIME ZONE 'America/Bogota')::date $$;
GRANT EXECUTE ON FUNCTION hoy_finca() TO anon, authenticated;

-- 2) Defaults de las tablas de eventos: hoy real en Colombia, no UTC.
ALTER TABLE ordenos             ALTER COLUMN fecha SET DEFAULT hoy_finca();
ALTER TABLE palpaciones         ALTER COLUMN fecha SET DEFAULT hoy_finca();
ALTER TABLE vacunaciones        ALTER COLUMN fecha SET DEFAULT hoy_finca();
ALTER TABLE movimientos_potrero ALTER COLUMN fecha SET DEFAULT hoy_finca();

-- 3) Recrear la vista usando hoy_finca() en vez de CURRENT_DATE, para que la
--    edad, el DEL, el retiro de leche y los días vacía se calculen contra el
--    día real de la finca. Mismas columnas y orden → CREATE OR REPLACE basta.
CREATE OR REPLACE VIEW v_animales AS
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
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN (a.ultima_palpacion + (round((9 - a.prenez_meses))::int * INTERVAL '1 month'))::date END AS parto_estimado_calc,
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN (a.ultima_palpacion + (round((7 - a.prenez_meses))::int * INTERVAL '1 month'))::date END AS secar_calc,
  CASE WHEN a.estado_repro = 'vacia' AND a.ultima_palpacion IS NOT NULL
       THEN (hoy_finca() - a.ultima_palpacion) END AS dias_vacia_calc,
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN least(9, round((a.prenez_meses + (hoy_finca() - a.ultima_palpacion) / 30.44)::numeric, 1)) END AS prenez_meses_actual
FROM animales a;
GRANT SELECT ON v_animales TO anon, authenticated;
