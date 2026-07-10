-- =============================================================================
-- Los Chagualos · Integridad de datos + parto transaccional
-- (arregla A5, A6, M1, M2, M3, M18, B5, B9, B10 de AUDITORIA.md)
-- =============================================================================
-- Idempotente: se puede correr más de una vez. Autocontenida: crea hoy_finca()
-- si aún no existe. Los CHECK se agregan NOT VALID (no chocan con datos viejos;
-- validan solo lo nuevo). Al final hay VALIDATEs opcionales comentados.
-- =============================================================================

-- 0) hoy_finca() por si esta base no corrió migracion-zona-horaria.sql
CREATE OR REPLACE FUNCTION hoy_finca() RETURNS date
  LANGUAGE sql STABLE
  AS $$ SELECT (now() AT TIME ZONE 'America/Bogota')::date $$;
GRANT EXECUTE ON FUNCTION hoy_finca() TO anon, authenticated;

-- 1) [A5] Semilla de unidades: sin la unidad 'leche' no se puede insertar
--    ningún animal (FK). Una instalación limpia quedaba inutilizable.
INSERT INTO unidades (id, nombre, activa)
VALUES ('leche', 'Ganadería de leche', true)
ON CONFLICT (id) DO NOTHING;

-- 2) [M1/B10] CHECKs de dominio (NOT VALID: solo validan datos nuevos)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_ordenos_litros') THEN
    ALTER TABLE ordenos ADD CONSTRAINT ck_ordenos_litros
      CHECK (litros >= 0 AND litros < 100) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_ordenos_turno') THEN
    ALTER TABLE ordenos ADD CONSTRAINT ck_ordenos_turno
      CHECK (turno IN ('dia','am','pm')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_ordenos_fecha') THEN
    ALTER TABLE ordenos ADD CONSTRAINT ck_ordenos_fecha
      CHECK (fecha <= hoy_finca() + 1) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_animales_prenez') THEN
    ALTER TABLE animales ADD CONSTRAINT ck_animales_prenez
      CHECK (prenez_meses IS NULL OR (prenez_meses >= 0 AND prenez_meses <= 9.5)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_animales_peso') THEN
    ALTER TABLE animales ADD CONSTRAINT ck_animales_peso
      CHECK (peso_kg IS NULL OR peso_kg > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_animales_nacimiento') THEN
    ALTER TABLE animales ADD CONSTRAINT ck_animales_nacimiento
      CHECK (nacimiento IS NULL OR nacimiento <= hoy_finca() + 1) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_animales_id') THEN
    ALTER TABLE animales ADD CONSTRAINT ck_animales_id
      CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,19}$') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_palpaciones_prenez') THEN
    ALTER TABLE palpaciones ADD CONSTRAINT ck_palpaciones_prenez
      CHECK (prenez_meses IS NULL OR (prenez_meses >= 0 AND prenez_meses <= 9.5)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_palpaciones_fecha') THEN
    ALTER TABLE palpaciones ADD CONSTRAINT ck_palpaciones_fecha
      CHECK (fecha <= hoy_finca() + 1) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_partos_peso') THEN
    ALTER TABLE partos ADD CONSTRAINT ck_partos_peso
      CHECK (peso_kg IS NULL OR peso_kg > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_partos_fecha') THEN
    ALTER TABLE partos ADD CONSTRAINT ck_partos_fecha
      CHECK (fecha <= hoy_finca() + 1) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_tratamientos_retiro') THEN
    ALTER TABLE tratamientos ADD CONSTRAINT ck_tratamientos_retiro
      CHECK (dias_retiro IS NULL OR dias_retiro >= 0) NOT VALID;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='vacunaciones')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_vacunaciones_alcance') THEN
    ALTER TABLE vacunaciones ADD CONSTRAINT ck_vacunaciones_alcance
      CHECK (alcance IN ('hato','individual')
             AND (alcance <> 'individual' OR animal_id IS NOT NULL)) NOT VALID;
  END IF;
END $$;

-- 3) [M3] turno obligatorio (dos NULL no chocan en el UNIQUE → duplicados) y
--    una cría no puede figurar en dos partos.
UPDATE ordenos SET turno = 'dia' WHERE turno IS NULL;
ALTER TABLE ordenos ALTER COLUMN turno SET NOT NULL;
ALTER TABLE ordenos ALTER COLUMN turno SET DEFAULT 'dia';
CREATE UNIQUE INDEX IF NOT EXISTS uq_partos_cria ON partos (cria_id) WHERE cria_id IS NOT NULL;

-- 4) [M2] Política ON DELETE coherente en genealogía y partos:
--    borrar un animal deja la referencia en NULL (no bloquea ni borra en cascada).
--    partos.madre_id se queda RESTRICT a propósito: el parto ES de la madre.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='animales_madre_id_fkey') THEN
    ALTER TABLE animales DROP CONSTRAINT animales_madre_id_fkey;
    ALTER TABLE animales ADD CONSTRAINT animales_madre_id_fkey
      FOREIGN KEY (madre_id) REFERENCES animales(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='animales_padre_id_fkey') THEN
    ALTER TABLE animales DROP CONSTRAINT animales_padre_id_fkey;
    ALTER TABLE animales ADD CONSTRAINT animales_padre_id_fkey
      FOREIGN KEY (padre_id) REFERENCES animales(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='partos_cria_id_fkey') THEN
    ALTER TABLE partos DROP CONSTRAINT partos_cria_id_fkey;
    ALTER TABLE partos ADD CONSTRAINT partos_cria_id_fkey
      FOREIGN KEY (cria_id) REFERENCES animales(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5) [B5] Índice que sirve al upsert del ordeño y al "última leche" de la vista.
CREATE INDEX IF NOT EXISTS idx_ordenos_animal_turno_fecha
  ON ordenos (animal_id, turno, fecha DESC);

-- 6) [M18] Parto estimado y secado calculados EN DÍAS (antes: round de meses,
--    con error sistemático de ±15 días — la diferencia entre secar a tiempo o no).
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
       THEN a.ultima_palpacion + round((9 - a.prenez_meses) * 30.44)::int END AS parto_estimado_calc,
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN a.ultima_palpacion + round((7 - a.prenez_meses) * 30.44)::int END AS secar_calc,
  CASE WHEN a.estado_repro = 'vacia' AND a.ultima_palpacion IS NOT NULL
       THEN (hoy_finca() - a.ultima_palpacion) END AS dias_vacia_calc,
  CASE WHEN a.estado_repro = 'prenada' AND a.prenez_meses IS NOT NULL AND a.ultima_palpacion IS NOT NULL
       THEN least(9, round((a.prenez_meses + (hoy_finca() - a.ultima_palpacion) / 30.44)::numeric, 1)) END AS prenez_meses_actual
FROM animales a;
GRANT SELECT ON v_animales TO anon, authenticated;

-- 7) [A6] Parto completo en UNA transacción: cría (si nació viva) + registro
--    del parto + actualización de la madre. O se guarda todo, o nada.
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
GRANT EXECUTE ON FUNCTION registrar_parto_completo(text,date,sexo_animal,numeric,tipo_parto,estado_cria,text,text,text,text) TO anon, authenticated;

-- 8) [B9] La anon key no debe poder leer/escribir tablas de auth/infra.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','login_attempts','outbox'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- OPCIONAL (correr cuando los datos viejos ya estén limpios): valida los CHECK
-- también sobre lo existente. Si alguno falla, muestra la fila culpable.
-- ALTER TABLE ordenos      VALIDATE CONSTRAINT ck_ordenos_litros;
-- ALTER TABLE ordenos      VALIDATE CONSTRAINT ck_ordenos_turno;
-- ALTER TABLE ordenos      VALIDATE CONSTRAINT ck_ordenos_fecha;
-- ALTER TABLE animales     VALIDATE CONSTRAINT ck_animales_prenez;
-- ALTER TABLE animales     VALIDATE CONSTRAINT ck_animales_peso;
-- ALTER TABLE animales     VALIDATE CONSTRAINT ck_animales_nacimiento;
-- ALTER TABLE animales     VALIDATE CONSTRAINT ck_animales_id;
-- ALTER TABLE palpaciones  VALIDATE CONSTRAINT ck_palpaciones_prenez;
-- ALTER TABLE palpaciones  VALIDATE CONSTRAINT ck_palpaciones_fecha;
-- ALTER TABLE partos       VALIDATE CONSTRAINT ck_partos_peso;
-- ALTER TABLE partos       VALIDATE CONSTRAINT ck_partos_fecha;
-- ALTER TABLE tratamientos VALIDATE CONSTRAINT ck_tratamientos_retiro;
-- ALTER TABLE vacunaciones VALIDATE CONSTRAINT ck_vacunaciones_alcance;
