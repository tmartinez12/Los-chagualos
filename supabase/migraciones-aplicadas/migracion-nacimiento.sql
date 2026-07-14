-- =============================================================================
-- Los Chagualos · Backfill de nacimiento desde edad_anios  (M19 de AUDITORIA.md)
-- =============================================================================
-- Sin `nacimiento`, la edad de un animal queda CONGELADA en `edad_anios` (la
-- vista v_animales solo deriva edad desde nacimiento): en un año, edades,
-- destete y clasificación levante/novilla estarían corridos. Este backfill
-- estima nacimiento = hoy − edad_anios*365.25 para los animales que no lo
-- tienen. Idempotente (solo toca filas con nacimiento NULL).
-- El código nuevo (store.js insertAnimal) ya hace esto al crear animales.
-- =============================================================================

UPDATE animales
   SET nacimiento = hoy_finca() - round(edad_anios * 365.25)::int
 WHERE nacimiento IS NULL
   AND edad_anios IS NOT NULL;

-- Verificación: no debe quedar ninguno con edad pero sin nacimiento.
SELECT count(*) AS sin_nacimiento_con_edad
  FROM animales WHERE nacimiento IS NULL AND edad_anios IS NOT NULL;
