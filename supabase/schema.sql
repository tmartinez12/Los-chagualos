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

-- ─── FINCA ──────────────────────────────────────────────────────────────────

CREATE TABLE finca (
  id          TEXT PRIMARY KEY DEFAULT 'chagualos',
  nombre      TEXT NOT NULL,
  moneda      TEXT NOT NULL DEFAULT 'COP',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── UNIDADES DE NEGOCIO ────────────────────────────────────────────────────

CREATE TABLE unidades (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  activa      BOOLEAN NOT NULL DEFAULT FALSE
);

-- ─── MÓDULOS ────────────────────────────────────────────────────────────────

CREATE TABLE modulos (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  unidad_id   TEXT REFERENCES unidades(id),
  activo      BOOLEAN NOT NULL DEFAULT FALSE
);

-- ─── ANIMALES ───────────────────────────────────────────────────────────────

CREATE TABLE animales (
  id                  TEXT PRIMARY KEY,
  nombre              TEXT NOT NULL,
  unidad_id           TEXT NOT NULL DEFAULT 'leche' REFERENCES unidades(id),
  especie             TEXT NOT NULL DEFAULT 'bovino',
  raza                TEXT,
  grupo               grupo_animal NOT NULL,
  sexo                sexo_animal NOT NULL,
  edad_anios          NUMERIC(5,2),
  nacimiento          DATE,
  origen              origen_animal,

  -- Lactancia
  del                 INTEGER,
  partos              INTEGER NOT NULL DEFAULT 0,
  leche_ayer          NUMERIC(6,1),
  leche_hoy           NUMERIC(6,1),

  -- Reproducción
  estado_repro        estado_repro,
  prenez_meses        NUMERIC(4,1),
  parto_estimado      DATE,
  ultima_palpacion    DATE,
  dias_vacia          INTEGER,
  lista_servicio      BOOLEAN,
  secar_estimado      DATE,

  -- Sanidad
  retiro_leche_hasta  DATE,

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

-- ─── PRODUCCIÓN MENSUAL ─────────────────────────────────────────────────────

CREATE TABLE produccion_mensual (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id   TEXT NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  mes         TEXT NOT NULL,              -- formato YYYY-MM
  litros_dia  NUMERIC(6,1),              -- promedio L/día ese mes (null = sin ordeño)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(animal_id, mes)
);

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

-- ─── LECHEROS ───────────────────────────────────────────────────────────────

CREATE TABLE lecheros (
  id              TEXT PRIMARY KEY,
  nombre          TEXT NOT NULL,
  frecuencia      TEXT,                   -- 'diario', 'lmv', etc.
  dias_semana     INTEGER[],              -- {0,1,2,3,4,5,6}
  base_litros     NUMERIC(6,1),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── ENTREGAS DE LECHE ──────────────────────────────────────────────────────

CREATE TABLE entregas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lechero_id      TEXT NOT NULL REFERENCES lecheros(id),
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  litros          NUMERIC(6,1) NOT NULL,
  precio_litro    NUMERIC(8,0),
  total           NUMERIC(12,0),
  registrado_por  UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lechero_id, fecha)
);

CREATE INDEX idx_entregas_fecha ON entregas(fecha);

-- ─── TARIFA ─────────────────────────────────────────────────────────────────

CREATE TABLE tarifa (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precio_litro    NUMERIC(8,0) NOT NULL,
  moneda          TEXT NOT NULL DEFAULT 'COP',
  vigente_desde   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CONSUMO INTERNO ────────────────────────────────────────────────────────

CREATE TABLE consumo_interno (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  terneras_litros NUMERIC(6,1),
  nota            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  sexo_cria       sexo_animal NOT NULL,
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
-- Se activa en todas las tablas de datos. Las políticas usan el JWT claim
-- `role` y `unidad` que emite la Edge Function login-pin.

ALTER TABLE animales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenos ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE partos ENABLE ROW LEVEL SECURITY;
ALTER TABLE palpaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tratamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE potreros ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecheros ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_potrero ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Admin: todo
CREATE POLICY admin_all ON animales FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');
CREATE POLICY admin_all ON ordenos FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');
CREATE POLICY admin_all ON entregas FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');
CREATE POLICY admin_all ON partos FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');
CREATE POLICY admin_all ON palpaciones FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');
CREATE POLICY admin_all ON tratamientos FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');
CREATE POLICY admin_all ON potreros FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');
CREATE POLICY admin_all ON produccion_mensual FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');
CREATE POLICY admin_all ON lecheros FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');
CREATE POLICY admin_all ON movimientos_potrero FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');
CREATE POLICY admin_all ON profiles FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

-- Operario: lectura de toda su unidad, escritura en tablas de registro
CREATE POLICY operario_read_animales ON animales FOR SELECT
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'operario'
    AND unidad_id = current_setting('request.jwt.claims', true)::json->>'unidad');

CREATE POLICY operario_insert_ordenos ON ordenos FOR INSERT
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'operario');

CREATE POLICY operario_read_ordenos ON ordenos FOR SELECT
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'operario');

CREATE POLICY operario_insert_entregas ON entregas FOR INSERT
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'operario');

CREATE POLICY operario_read_entregas ON entregas FOR SELECT
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'operario');

CREATE POLICY operario_read_potreros ON potreros FOR SELECT
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'operario');

CREATE POLICY operario_insert_movimientos ON movimientos_potrero FOR INSERT
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'operario');

CREATE POLICY operario_read_movimientos ON movimientos_potrero FOR SELECT
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'operario');

-- Operario puede leer su propio perfil
CREATE POLICY operario_own_profile ON profiles FOR SELECT
  USING (id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);
