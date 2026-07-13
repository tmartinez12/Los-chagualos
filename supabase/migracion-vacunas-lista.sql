-- =============================================================================
-- Migración · VACUNACIÓN CON LISTA DE ANIMALES (checkboxes)
-- -----------------------------------------------------------------------------
-- Problema: la vacunación "al hato" solo guardaba un conteo (n_animales), así
-- que CUALQUIER animal — incluso uno registrado después — aparecía como
-- vacunado. Esta migración crea la tabla vacunaciones_animales (la lista
-- EXACTA de animales de cada vacunación) y el RPC transaccional
-- registrar_vacunacion_completa(). Los registros viejos quedan sin lista: la
-- app los muestra solo a animales que ya existían en esa fecha.
-- Idempotente: se puede correr más de una vez sin daño.
-- =============================================================================

CREATE TABLE IF NOT EXISTS vacunaciones_animales (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vacunacion_id  UUID NOT NULL REFERENCES vacunaciones(id) ON DELETE CASCADE,
  animal_id      TEXT NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vacunacion_id, animal_id)
);
CREATE INDEX IF NOT EXISTS idx_vac_animales_animal ON vacunaciones_animales(animal_id);

-- permisos para la anon key (la app, sin login) — igual que las demás tablas
GRANT ALL ON vacunaciones_animales TO anon, authenticated;

CREATE OR REPLACE FUNCTION registrar_vacunacion_completa(
  p_tipo       text,
  p_animal_ids text[],
  p_producto   text DEFAULT NULL,
  p_lote       text DEFAULT NULL,
  p_fecha      date DEFAULT NULL,
  p_proxima    date DEFAULT NULL,
  p_nota       text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_id uuid; v_n int := COALESCE(array_length(p_animal_ids, 1), 0);
BEGIN
  IF v_n = 0 THEN RAISE EXCEPTION 'La vacunación necesita al menos un animal.'; END IF;
  INSERT INTO vacunaciones (tipo, alcance, animal_id, n_animales, producto, lote, fecha, proxima, nota)
  VALUES (p_tipo,
          CASE WHEN v_n = 1 THEN 'individual' ELSE 'hato' END,
          CASE WHEN v_n = 1 THEN p_animal_ids[1] END,
          v_n, p_producto, p_lote, COALESCE(p_fecha, hoy_finca()), p_proxima, p_nota)
  RETURNING id INTO v_id;
  INSERT INTO vacunaciones_animales (vacunacion_id, animal_id)
    SELECT v_id, unnest(p_animal_ids);
  RETURN v_id;
END $$;
