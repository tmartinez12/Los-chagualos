-- =============================================================================
-- Migración · TRATAMIENTO SIN ENFERMEDAD OBLIGATORIA
-- -----------------------------------------------------------------------------
-- Decisión de producto: por ahora se registra el TRATAMIENTO aplicado (el
-- medicamento), no la enfermedad. `problema` pasa a ser opcional y
-- `medicamento` pasa a ser el campo principal (obligatorio para filas nuevas;
-- a las filas viejas sin medicamento se les copia el problema para no
-- romper el NOT NULL). Idempotente.
-- =============================================================================

ALTER TABLE tratamientos ALTER COLUMN problema DROP NOT NULL;

-- filas viejas sin medicamento: heredan el problema como texto del tratamiento
UPDATE tratamientos SET medicamento = problema WHERE medicamento IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tratamientos'
      AND column_name='medicamento' AND is_nullable='YES')
  THEN
    ALTER TABLE tratamientos ALTER COLUMN medicamento SET NOT NULL;
  END IF;
END $$;
