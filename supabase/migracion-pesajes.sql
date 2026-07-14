-- =============================================================================
-- Migración · HISTORIAL DE PESAJES
-- -----------------------------------------------------------------------------
-- Problema: el peso vivía solo como copia única en animales.peso_kg/fecha_peso
-- (cada pesaje PISABA el anterior). Para ver ganancia de peso en levante y
-- sustentar la regla de los 330 kg de servicio, cada pesaje debe quedar con su
-- fecha. Esta migración crea la tabla pesajes; animales.peso_kg/fecha_peso
-- siguen guardando el MÁS RECIENTE como copia rápida (la app la actualiza al
-- registrar un pesaje con fecha igual o posterior a la de la copia).
-- También actualiza restaurar_respaldo() para incluir pesajes (y de paso
-- vacunaciones_animales, que faltaba en la versión instalada).
-- Idempotente: se puede correr más de una vez sin daño.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pesajes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id       TEXT NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL DEFAULT hoy_finca(),
  peso_kg         NUMERIC(5,1) NOT NULL CHECK (peso_kg > 0),
  registrado_por  UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pesajes_animal ON pesajes(animal_id, fecha DESC);

-- MVP sin login: RLS desactivado, igual que las demás tablas de datos
ALTER TABLE pesajes DISABLE ROW LEVEL SECURITY;

-- permisos para la anon key (la app, sin login) — igual que las demás tablas
GRANT ALL ON pesajes TO anon, authenticated;

-- restauración transaccional: versión canónica vigente (espejo de schema.sql),
-- ahora con pesajes y vacunaciones_animales
CREATE OR REPLACE FUNCTION restaurar_respaldo(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE t jsonb := p -> 'tablas'; n_animales int;
BEGIN
  IF t IS NULL OR jsonb_typeof(t) <> 'object' THEN
    RAISE EXCEPTION 'Respaldo inválido: falta el objeto "tablas".';
  END IF;
  TRUNCATE ordenos, palpaciones, tratamientos, vacunaciones, vacunaciones_animales,
           partos, pesajes, movimientos_potrero, movimientos_grupo, animales, potreros RESTART IDENTITY CASCADE;
  INSERT INTO potreros SELECT * FROM jsonb_populate_recordset(NULL::potreros, COALESCE(t->'potreros','[]'::jsonb));
  -- un solo INSERT: las FK madre/padre autorreferenciadas se verifican al final del statement
  INSERT INTO animales SELECT * FROM jsonb_populate_recordset(NULL::animales, COALESCE(t->'animales','[]'::jsonb));
  GET DIAGNOSTICS n_animales = ROW_COUNT;
  INSERT INTO ordenos             SELECT * FROM jsonb_populate_recordset(NULL::ordenos,             COALESCE(t->'ordenos','[]'::jsonb));
  INSERT INTO palpaciones         SELECT * FROM jsonb_populate_recordset(NULL::palpaciones,         COALESCE(t->'palpaciones','[]'::jsonb));
  INSERT INTO tratamientos        SELECT * FROM jsonb_populate_recordset(NULL::tratamientos,        COALESCE(t->'tratamientos','[]'::jsonb));
  INSERT INTO vacunaciones        SELECT * FROM jsonb_populate_recordset(NULL::vacunaciones,        COALESCE(t->'vacunaciones','[]'::jsonb));
  INSERT INTO partos              SELECT * FROM jsonb_populate_recordset(NULL::partos,              COALESCE(t->'partos','[]'::jsonb));
  INSERT INTO movimientos_potrero SELECT * FROM jsonb_populate_recordset(NULL::movimientos_potrero, COALESCE(t->'movimientos_potrero','[]'::jsonb));
  INSERT INTO movimientos_grupo   SELECT * FROM jsonb_populate_recordset(NULL::movimientos_grupo,   COALESCE(t->'movimientos_grupo','[]'::jsonb));
  INSERT INTO vacunaciones_animales SELECT * FROM jsonb_populate_recordset(NULL::vacunaciones_animales, COALESCE(t->'vacunaciones_animales','[]'::jsonb));
  INSERT INTO pesajes             SELECT * FROM jsonb_populate_recordset(NULL::pesajes,             COALESCE(t->'pesajes','[]'::jsonb));
  RETURN jsonb_build_object('ok', true, 'animales', n_animales);
END $$;
