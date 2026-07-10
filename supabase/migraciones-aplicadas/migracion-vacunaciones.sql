-- =============================================================================
-- Los Chagualos · Registro de vacunaciones
-- Una vacunación es un evento: a todo el hato (ciclo, p.ej. aftosa) o a un
-- animal (p.ej. brucelosis a una ternera). Sirve de soporte ICA.
-- =============================================================================

CREATE TABLE IF NOT EXISTS vacunaciones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        TEXT NOT NULL,                 -- aftosa · brucelosis · desparasitacion · vitaminas · otra
  alcance     TEXT NOT NULL DEFAULT 'hato',  -- hato | individual
  animal_id   TEXT REFERENCES animales(id) ON DELETE CASCADE,  -- si alcance = individual
  n_animales  INTEGER,                       -- si alcance = hato (cuántos se aplicaron)
  producto    TEXT,
  lote        TEXT,                           -- lote del biológico (soporte ICA)
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  proxima     DATE,                           -- próxima dosis/ciclo (si aplica)
  nota        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vacunaciones_fecha ON vacunaciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_vacunaciones_tipo  ON vacunaciones(tipo);

-- Acceso para la app (RLS desactivado en el MVP, como las demás tablas).
GRANT ALL ON vacunaciones TO anon, authenticated;
