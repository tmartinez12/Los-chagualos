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

-- ─── ZONA HORARIA DE LA FINCA ───────────────────────────────────────────────
-- now()/CURRENT_DATE en Supabase corren en UTC. Colombia es UTC−5: entre las
-- 7pm y medianoche "hoy" en UTC ya es mañana. hoy_finca() da la fecha REAL de
-- la finca; se usa en los DEFAULT de eventos y en la vista v_animales.
CREATE OR REPLACE FUNCTION hoy_finca() RETURNS date
  LANGUAGE sql STABLE
  AS $$ SELECT (now() AT TIME ZONE 'America/Bogota')::date $$;

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

-- Semilla obligatoria: animales.unidad_id referencia 'leche' por defecto;
-- sin esta fila, una instalación limpia no puede insertar ningún animal.
INSERT INTO unidades (id, nombre, activa) VALUES ('leche', 'Ganadería de leche', true)
ON CONFLICT (id) DO NOTHING;

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

  -- Lactancia (DEL, "leche de ayer" y el CONTEO de partos se DERIVAN en v_animales)
  inicio_lactancia    DATE,                  -- DEL = hoy − inicio_lactancia

  -- Reproducción (parto_estimado, dias_vacia y secar se DERIVAN en v_animales)
  estado_repro        estado_repro,
  prenez_meses        NUMERIC(4,1),
  ultima_palpacion    DATE,

  -- Genealogía (SET NULL: borrar a la madre/padre no bloquea ni borra crías)
  madre_id            TEXT REFERENCES animales(id) ON DELETE SET NULL,
  padre_id            TEXT REFERENCES animales(id) ON DELETE SET NULL,

  -- Peso / levante
  peso_kg             NUMERIC(6,1),
  fecha_peso          DATE,
  ganancia_dia_g      NUMERIC(6,1),

  -- Macho (el toro designado; hijas/destete/lista-servicio se derivan)
  rol_toro            BOOLEAN,

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
  fecha       DATE NOT NULL DEFAULT hoy_finca(),
  litros      NUMERIC(6,1) NOT NULL CHECK (litros >= 0 AND litros < 100),
  turno       TEXT NOT NULL DEFAULT 'dia' CHECK (turno IN ('dia','am','pm')),
              -- la app usa 'dia' (total del día); las vistas filtran turno='dia'
  registrado_por UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(animal_id, fecha, turno)
);

CREATE INDEX idx_ordenos_fecha ON ordenos(fecha);
-- sirve al upsert (animal,fecha,turno) y al "última leche" de v_animales
CREATE INDEX idx_ordenos_animal_turno_fecha ON ordenos (animal_id, turno, fecha DESC);

-- ─── PALPACIONES ────────────────────────────────────────────────────────────

CREATE TABLE palpaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id       TEXT NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL DEFAULT hoy_finca(),
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
  madre_id        TEXT NOT NULL REFERENCES animales(id),          -- RESTRICT: el parto es de la madre
  cria_id         TEXT REFERENCES animales(id) ON DELETE SET NULL,
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
-- una cría no puede figurar en dos partos (inflaría el conteo derivado)
CREATE UNIQUE INDEX uq_partos_cria ON partos (cria_id) WHERE cria_id IS NOT NULL;

-- ─── TRATAMIENTOS / SANIDAD ─────────────────────────────────────────────────

CREATE TABLE tratamientos (
  id                  TEXT PRIMARY KEY,
  animal_id           TEXT NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  problema            TEXT NOT NULL,
  medicamento         TEXT,
  inicio              DATE NOT NULL,
  dias_retiro         INTEGER,               -- el retiro va hasta inicio + dias_retiro (derivado)
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
  fecha       DATE NOT NULL DEFAULT hoy_finca(),
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
  fecha           DATE NOT NULL DEFAULT hoy_finca(),
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

-- ─── INTEGRIDAD (CHECKs de dominio) ─────────────────────────────────────────
ALTER TABLE ordenos      ADD CONSTRAINT ck_ordenos_fecha       CHECK (fecha <= hoy_finca() + 1);
ALTER TABLE animales     ADD CONSTRAINT ck_animales_prenez     CHECK (prenez_meses IS NULL OR (prenez_meses >= 0 AND prenez_meses <= 9.5));
ALTER TABLE animales     ADD CONSTRAINT ck_animales_peso       CHECK (peso_kg IS NULL OR peso_kg > 0);
ALTER TABLE animales     ADD CONSTRAINT ck_animales_nacimiento CHECK (nacimiento IS NULL OR nacimiento <= hoy_finca() + 1);
ALTER TABLE animales     ADD CONSTRAINT ck_animales_id         CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,19}$');
ALTER TABLE palpaciones  ADD CONSTRAINT ck_palpaciones_prenez  CHECK (prenez_meses IS NULL OR (prenez_meses >= 0 AND prenez_meses <= 9.5));
ALTER TABLE palpaciones  ADD CONSTRAINT ck_palpaciones_fecha   CHECK (fecha <= hoy_finca() + 1);
ALTER TABLE partos       ADD CONSTRAINT ck_partos_peso         CHECK (peso_kg IS NULL OR peso_kg > 0);
ALTER TABLE partos       ADD CONSTRAINT ck_partos_fecha        CHECK (fecha <= hoy_finca() + 1);
ALTER TABLE tratamientos ADD CONSTRAINT ck_tratamientos_retiro CHECK (dias_retiro IS NULL OR dias_retiro >= 0);
ALTER TABLE vacunaciones ADD CONSTRAINT ck_vacunaciones_alcance
  CHECK (alcance IN ('hato','individual') AND (alcance <> 'individual' OR animal_id IS NOT NULL));

-- ─── PARTO COMPLETO EN UNA TRANSACCIÓN ──────────────────────────────────────
-- Cría (si nació viva) + registro del parto + actualización de la madre:
-- o se guarda todo, o no se guarda nada. La app la llama por RPC.
CREATE OR REPLACE FUNCTION registrar_parto_completo(
  p_madre_id    text,
  p_fecha       date,
  p_sexo        sexo_animal,
  p_peso_kg     numeric,
  p_tipo        tipo_parto,
  p_estado      estado_cria,
  p_parto_id    text,
  p_cria_id     text DEFAULT NULL,
  p_cria_nombre text DEFAULT NULL,
  p_cria_raza   text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  IF p_cria_id IS NOT NULL THEN
    INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios,
                          nacimiento, origen, madre_id, peso_kg)
    VALUES (p_cria_id, coalesce(p_cria_nombre, '(cría)'), p_cria_raza,
            CASE WHEN p_sexo = 'H' THEN 'ternera'::grupo_animal ELSE 'macho'::grupo_animal END,
            p_sexo, 0, p_fecha, 'nacido_finca', p_madre_id, p_peso_kg);
  END IF;
  INSERT INTO partos (id, madre_id, cria_id, fecha, sexo_cria, peso_kg, tipo, estado_cria)
  VALUES (p_parto_id, p_madre_id, p_cria_id, p_fecha, p_sexo, p_peso_kg,
          coalesce(p_tipo, 'normal'), coalesce(p_estado, 'viva'));
  UPDATE animales
     SET grupo = 'ordeño', inicio_lactancia = p_fecha,
         estado_repro = NULL, prenez_meses = NULL, ultima_palpacion = NULL
   WHERE id = p_madre_id;
  RETURN p_parto_id;
END $$;

-- ─── RESTAURACIÓN TRANSACCIONAL DE UN RESPALDO ──────────────────────────────
-- Reemplaza TODOS los datos por los del respaldo en UNA transacción (o entra
-- todo, o no cambia nada). No toca `unidades`. La app la llama por RPC; si no
-- está instalada, store.js cae a un merge por upsert.
CREATE OR REPLACE FUNCTION restaurar_respaldo(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE t jsonb := p -> 'tablas'; n_animales int;
BEGIN
  IF t IS NULL OR jsonb_typeof(t) <> 'object' THEN
    RAISE EXCEPTION 'Respaldo inválido: falta el objeto "tablas".';
  END IF;
  TRUNCATE ordenos, palpaciones, tratamientos, vacunaciones,
           partos, movimientos_potrero, animales, potreros RESTART IDENTITY CASCADE;
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
  RETURN jsonb_build_object('ok', true, 'animales', n_animales);
END $$;

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
  -- calculados EN DÍAS (30,44 días/mes): el round por meses metía ±15 días de error
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN a.ultima_palpacion + round((9 - a.prenez_meses) * 30.44)::int END AS parto_estimado_calc,
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN a.ultima_palpacion + round((7 - a.prenez_meses) * 30.44)::int END AS secar_calc,
  CASE WHEN a.estado_repro = 'vacia' AND a.ultima_palpacion IS NOT NULL
       THEN (hoy_finca() - a.ultima_palpacion) END AS dias_vacia_calc,
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN least(9, round((a.prenez_meses + (hoy_finca() - a.ultima_palpacion) / 30.44)::numeric, 1)) END AS prenez_meses_actual
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
-- …pero las tablas de auth/infra NO deben ser accesibles con la anon key:
REVOKE ALL ON profiles, login_attempts, outbox FROM anon, authenticated;
