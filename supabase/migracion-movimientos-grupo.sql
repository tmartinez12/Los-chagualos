-- =============================================================================
-- Migración · HISTORIAL DE MOVIMIENTOS DE GRUPO
-- -----------------------------------------------------------------------------
-- Crea la tabla movimientos_grupo (línea de tiempo del ciclo de vida: cada
-- cambio de grupo confirmado queda con su fecha) y la función mover_grupo()
-- que cambia el grupo del animal y anota el movimiento en UNA transacción.
-- Idempotente: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE. Depende de que
-- 'cria' ya exista en el enum (migracion-ciclo-vida.sql).
-- =============================================================================

CREATE TABLE IF NOT EXISTS movimientos_grupo (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id       TEXT NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  de_grupo        grupo_animal,
  a_grupo         grupo_animal NOT NULL,
  fecha           DATE NOT NULL DEFAULT hoy_finca(),
  motivo          TEXT,
  registrado_por  UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movimientos_grupo_animal ON movimientos_grupo (animal_id, fecha DESC);

-- permisos para la anon key (la app, sin login) — igual que las demás tablas
GRANT ALL ON movimientos_grupo TO anon, authenticated;

CREATE OR REPLACE FUNCTION mover_grupo(
  p_animal_id text,
  p_a_grupo   grupo_animal,
  p_de_grupo  grupo_animal DEFAULT NULL,
  p_fecha     date DEFAULT NULL,
  p_motivo    text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  UPDATE animales SET grupo = p_a_grupo WHERE id = p_animal_id;
  INSERT INTO movimientos_grupo (animal_id, de_grupo, a_grupo, fecha, motivo)
  VALUES (p_animal_id, p_de_grupo, p_a_grupo, coalesce(p_fecha, hoy_finca()), p_motivo)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
