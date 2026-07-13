-- =============================================================================
-- Migración · CICLO DE VIDA: 'ternera' → 'cria' (ambos sexos)
-- -----------------------------------------------------------------------------
-- Antes: al nacer, las hembras iban al grupo 'ternera' y los machos directo a
-- 'macho'. El modelo real de la finca es: TODA cría (hembra o macho) nace como
-- 'cria', a los ~8 meses pasa a 'levante', y a los ~3 años las hembras pasan a
-- 'novilla' y los machos a 'macho'. Esta migración:
--   1. Renombra el valor de enum 'ternera' → 'cria' (las filas existentes con
--      grupo='ternera' quedan como 'cria' automáticamente; es un cambio de
--      catálogo, sin reescritura de tabla).
--   2. Actualiza registrar_parto_completo() para que AMBOS sexos nazcan 'cria'.
-- NO reclasifica los machos jóvenes que hoy están en 'macho' (eso lo hace la
-- dueña con los avisos de transición); solo corrige la lógica hacia adelante.
-- Idempotente: se puede correr más de una vez sin daño.
-- =============================================================================

-- 1) renombrar el valor del enum, con guarda de idempotencia
DO $$
BEGIN
  IF EXISTS (
        SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'grupo_animal' AND e.enumlabel = 'ternera')
     AND NOT EXISTS (
        SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'grupo_animal' AND e.enumlabel = 'cria')
  THEN
    ALTER TYPE grupo_animal RENAME VALUE 'ternera' TO 'cria';
  END IF;
END $$;

-- 2) el parto: ambos sexos nacen como 'cria' (CREATE OR REPLACE es idempotente)
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
            'cria'::grupo_animal,   -- ambos sexos nacen como cría
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
