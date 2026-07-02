-- =============================================================================
-- Los Chagualos · ESQUEMA SQL  (Supabase / Postgres)
-- Derivado de prototipo/core/model.js
-- =============================================================================

-- UUIDs por defecto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ──────────────────────────────────────────────────────────────────

CREATE TYPE grupo_animal AS ENUM (
  'ordeño', 'horra', 'novilla', 'levante', 'ternera', 'macho', 'baja'
);

CREATE TYPE sexo_animal AS ENUM ('H', 'M');

CREATE TYPE estado_repro AS ENUM (
  'prenada', 'servida', 'vacia', 'lactando', 'novilla'
);

CREATE TYPE origen_animal AS ENUM ('nacido_finca', 'comprado');

CREATE TYPE motivo_baja AS ENUM ('venta', 'muerte', 'descarte', 'perdida');

CREATE TYPE tipo_parto AS ENUM ('normal', 'asistido');

CREATE TYPE estado_cria AS ENUM ('viva', 'muerta');

CREATE TYPE rol_usuario AS ENUM ('admin', 'operario');

-- ─── PERFILES / AUTH POR PIN ────────────────────────────────────────────────

CREATE TABLE profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      TEXT NOT NULL,
  pin_hash    TEXT NOT NULL,
  rol         rol_usuario NOT NULL DEFAULT 'operario',
  unidad      TEXT,                -- null = acceso a todas (admin)
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── UNIDADES DE NEGOCIO ────────────────────────────────────────────────────

CREATE TABLE unidades (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  activa      BOOLEAN NOT NULL DEFAULT FALSE
);

-- ─── ANIMALES ───────────────────────────────────────────────────────────────

CREATE TABLE animales (
  id                  TEXT PRIMARY KEY,
  nombre              TEXT NOT NULL,
  unidad_id           TEXT NOT NULL DEFAULT 'leche' REFERENCES unidades(id),
  especie             TEXT NOT NULL DEFAULT 'bovino',
  raza                TEXT,
  color               TEXT,
  nota                TEXT,                  -- nota libre ("patea al ordeño"…)
  grupo               grupo_animal NOT NULL,
  sexo                sexo_animal NOT NULL,
  edad_anios          NUMERIC(5,2),
  nacimiento          DATE,
  origen              origen_animal,

  -- Lactancia (DEL y "leche de ayer" se DERIVAN en la vista v_animales)
  inicio_lactancia    DATE,                  -- DEL = hoy − inicio_lactancia
  partos              INTEGER NOT NULL DEFAULT 0,
  leche_hoy           NUMERIC(6,1),

  -- Reproducción (parto_estimado, dias_vacia y secar se DERIVAN en v_animales)
  estado_repro        estado_repro,
  prenez_meses        NUMERIC(4,1),
  ultima_palpacion    DATE,
  lista_servicio      BOOLEAN,

  -- Genealogía
  madre_id            TEXT REFERENCES animales(id),
  padre_id            TEXT REFERENCES animales(id),

  -- Peso / levante
  peso_kg             NUMERIC(6,1),
  fecha_peso          DATE,
  ganancia_dia_g      NUMERIC(6,1),

  -- Ternera / macho
  destete_proximo     BOOLEAN,
  rol_toro            BOOLEAN,
  monta_natural       BOOLEAN,
  hijas_vivas         INTEGER,
  sanidad_al_dia      BOOLEAN,
  venta_programada    DATE,

  -- Baja
  baja_motivo         motivo_baja,
  baja_fecha          DATE,
  baja_valor          NUMERIC(12,0),
  baja_nota           TEXT,

  -- Procedencia (comprados)
  procedencia         TEXT,
  valor_compra        NUMERIC(12,0),

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_animales_grupo ON animales(grupo);
CREATE INDEX idx_animales_unidad ON animales(unidad_id);
CREATE INDEX idx_animales_estado_repro ON animales(estado_repro);

-- ─── ORDEÑOS DIARIOS ────────────────────────────────────────────────────────
-- Registro día a día (no existía en el prototipo, pero es la fuente real)

CREATE TABLE ordenos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id   TEXT NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  litros      NUMERIC(6,1) NOT NULL,
  turno       TEXT,                       -- 'am', 'pm' o null (total día)
  registrado_por UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(animal_id, fecha, turno)
);

CREATE INDEX idx_ordenos_fecha ON ordenos(fecha);

-- ─── PALPACIONES ────────────────────────────────────────────────────────────

CREATE TABLE palpaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id       TEXT NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo          TEXT,
  resultado       TEXT,                   -- texto del veterinario
  prenez_meses    NUMERIC(4,1),
  registrado_por  UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_palpaciones_animal ON palpaciones(animal_id);

-- ─── PARTOS ─────────────────────────────────────────────────────────────────

CREATE TABLE partos (
  id              TEXT PRIMARY KEY,
  madre_id        TEXT NOT NULL REFERENCES animales(id),
  cria_id         TEXT REFERENCES animales(id),
  fecha           DATE NOT NULL,
  sexo_cria       sexo_animal,           -- null en partos históricos sin detalle
  peso_kg         NUMERIC(5,1),
  tipo            tipo_parto NOT NULL DEFAULT 'normal',
  estado_cria     estado_cria NOT NULL DEFAULT 'viva',
  nota            TEXT,
  registrado_por  UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partos_madre ON partos(madre_id);

-- ─── TRATAMIENTOS / SANIDAD ─────────────────────────────────────────────────

CREATE TABLE tratamientos (
  id                  TEXT PRIMARY KEY,
  animal_id           TEXT NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  problema            TEXT NOT NULL,
  medicamento         TEXT,
  inicio              DATE NOT NULL,
  dias_retiro         INTEGER,
  retiro_leche_hasta  DATE,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  nota                TEXT,
  registrado_por      UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tratamientos_animal ON tratamientos(animal_id);
CREATE INDEX idx_tratamientos_activo ON tratamientos(activo) WHERE activo = TRUE;

-- ─── VACUNACIONES ───────────────────────────────────────────────────────────
-- Evento de vacunación: a todo el hato (ciclo) o a un animal. Soporte ICA.

CREATE TABLE vacunaciones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        TEXT NOT NULL,                 -- aftosa · brucelosis · desparasitacion · vitaminas · otra
  alcance     TEXT NOT NULL DEFAULT 'hato',  -- hato | individual
  animal_id   TEXT REFERENCES animales(id) ON DELETE CASCADE,
  n_animales  INTEGER,
  producto    TEXT,
  lote        TEXT,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  proxima     DATE,
  nota        TEXT,
  registrado_por UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vacunaciones_fecha ON vacunaciones(fecha DESC);

-- ─── POTREROS ───────────────────────────────────────────────────────────────

CREATE TABLE potreros (
  id                  TEXT PRIMARY KEY,
  numero              INTEGER NOT NULL UNIQUE,
  dias_descanso       INTEGER,
  hato_actual         BOOLEAN NOT NULL DEFAULT FALSE,
  sugerido_siguiente  BOOLEAN NOT NULL DEFAULT FALSE,
  nota                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── MOVIMIENTOS DE POTRERO ─────────────────────────────────────────────────
-- Historial: cuándo se movió el hato de un potrero a otro

CREATE TABLE movimientos_potrero (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  potrero_id      TEXT NOT NULL REFERENCES potreros(id),
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo            TEXT NOT NULL,          -- 'entrada', 'salida'
  registrado_por  UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── LOGIN ATTEMPTS (rate limiting para PIN) ────────────────────────────────

CREATE TABLE login_attempts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID REFERENCES profiles(id),
  device_id   TEXT,
  exitoso     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_attempts_device ON login_attempts(device_id, created_at);

-- ─── OUTBOX (offline sync) ──────────────────────────────────────────────────
-- Cola local que el sync worker usa para subir mutaciones pendientes.

CREATE TABLE outbox (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabla           TEXT NOT NULL,
  operacion       TEXT NOT NULL,          -- 'INSERT', 'UPDATE', 'DELETE'
  payload         JSONB NOT NULL,
  device_id       TEXT,
  profile_id      UUID REFERENCES profiles(id),
  intentos        INTEGER NOT NULL DEFAULT 0,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at       TIMESTAMPTZ
);

CREATE INDEX idx_outbox_pending ON outbox(synced_at) WHERE synced_at IS NULL;

-- ─── FUNCIONES UTILITARIAS ──────────────────────────────────────────────────

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_animales
  BEFORE UPDATE ON animales
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_potreros
  BEFORE UPDATE ON potreros
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── RLS (Row Level Security) ───────────────────────────────────────────────
-- MVP SIN LOGIN: el RLS queda DESACTIVADO en todas las tablas de datos. Con la
-- anon key sin login, activarlo deja las lecturas en CERO filas (sin error) y
-- el hato aparece vacío. Cuando se reactive el login por PIN, aquí volverían
-- las políticas por rol (admin/operario) — ver el historial de git.

ALTER TABLE animales            DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordenos             DISABLE ROW LEVEL SECURITY;
ALTER TABLE partos              DISABLE ROW LEVEL SECURITY;
ALTER TABLE palpaciones         DISABLE ROW LEVEL SECURITY;
ALTER TABLE tratamientos        DISABLE ROW LEVEL SECURITY;
ALTER TABLE vacunaciones        DISABLE ROW LEVEL SECURITY;
ALTER TABLE potreros            DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_potrero DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            DISABLE ROW LEVEL SECURITY;

-- ─── VISTAS DERIVADAS (una sola fuente de verdad) ───────────────────────────
-- v_animales: edad, DEL, leche de ayer, retiro de leche y la reproducción
-- (parto estimado, secado, días vacía, preñez actual) se CALCULAN aquí a
-- partir de las columnas fuente y de ordenos/tratamientos/palpaciones. La app
-- nunca guarda estos valores: así no hay dos verdades que se contradigan.
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

-- v_produccion_mensual: histórico mensual DERIVADO de los ordeños diarios.
CREATE VIEW v_produccion_mensual AS
SELECT animal_id,
       to_char(fecha, 'YYYY-MM')      AS mes,
       round(avg(litros)::numeric, 1) AS litros_dia,
       count(*)                       AS dias_con_registro
FROM ordenos
WHERE turno = 'dia'
GROUP BY animal_id, to_char(fecha, 'YYYY-MM');

-- ─── PERMISOS (rol anon = la app, sin login) ────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
