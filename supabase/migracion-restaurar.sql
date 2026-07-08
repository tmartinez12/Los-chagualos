-- =============================================================================
-- Los Chagualos · Restauración transaccional de un respaldo  (A3 de AUDITORIA)
-- =============================================================================
-- restaurar_respaldo(p jsonb): reemplaza TODOS los datos por los del respaldo,
-- en UNA sola transacción (o entra todo, o no cambia nada). Antes la
-- restauración era un merge no-transaccional: un fallo a mitad dejaba la base
-- mezclada, y las filas creadas después del respaldo sobrevivían (no volvía al
-- snapshot). Idempotente. No toca `unidades` (config).
--
-- El JSON tiene la forma { "tablas": { "animales":[...], "ordenos":[...], ... } }
-- (el que produce exportarTodo en store.js).
-- =============================================================================

CREATE OR REPLACE FUNCTION restaurar_respaldo(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  t jsonb := p -> 'tablas';
  n_animales int;
BEGIN
  IF t IS NULL OR jsonb_typeof(t) <> 'object' THEN
    RAISE EXCEPTION 'Respaldo inválido: falta el objeto "tablas".';
  END IF;

  -- Reemplazo total (en esta transacción). CASCADE por si acaso; se listan
  -- de hijas a madres igual.
  TRUNCATE ordenos, palpaciones, tratamientos, vacunaciones,
           partos, movimientos_potrero, animales, potreros RESTART IDENTITY CASCADE;

  -- potreros primero (sin dependencias)
  INSERT INTO potreros
    SELECT * FROM jsonb_populate_recordset(NULL::potreros, COALESCE(t->'potreros','[]'::jsonb));

  -- animales: un solo INSERT (las FK madre/padre autorreferenciadas se
  -- verifican al FINAL del statement, así que el orden dentro del set no importa).
  INSERT INTO animales
    SELECT * FROM jsonb_populate_recordset(NULL::animales, COALESCE(t->'animales','[]'::jsonb));
  GET DIAGNOSTICS n_animales = ROW_COUNT;

  -- tablas hijas (ya existen animales/potreros que referencian)
  INSERT INTO ordenos             SELECT * FROM jsonb_populate_recordset(NULL::ordenos,             COALESCE(t->'ordenos','[]'::jsonb));
  INSERT INTO palpaciones         SELECT * FROM jsonb_populate_recordset(NULL::palpaciones,         COALESCE(t->'palpaciones','[]'::jsonb));
  INSERT INTO tratamientos        SELECT * FROM jsonb_populate_recordset(NULL::tratamientos,        COALESCE(t->'tratamientos','[]'::jsonb));
  INSERT INTO partos              SELECT * FROM jsonb_populate_recordset(NULL::partos,              COALESCE(t->'partos','[]'::jsonb));
  INSERT INTO movimientos_potrero SELECT * FROM jsonb_populate_recordset(NULL::movimientos_potrero, COALESCE(t->'movimientos_potrero','[]'::jsonb));
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vacunaciones') THEN
    INSERT INTO vacunaciones      SELECT * FROM jsonb_populate_recordset(NULL::vacunaciones,        COALESCE(t->'vacunaciones','[]'::jsonb));
  END IF;

  RETURN jsonb_build_object('ok', true, 'animales', n_animales);
END $$;

GRANT EXECUTE ON FUNCTION restaurar_respaldo(jsonb) TO anon, authenticated;
