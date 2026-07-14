-- =============================================================================
-- Los Chagualos · Vaciar TODOS los datos (empezar de cero)
-- =============================================================================
-- Borra el hato y todos sus eventos, CONSERVANDO la estructura (tablas, vistas,
-- funciones) y la configuración (unidades de negocio). La app sigue funcionando
-- y queda lista para cargar el hato real desde cero, sin datos de demo/semilla.
--
-- ⚠️  IRREVERSIBLE. Haz un respaldo antes:
--     - Escritorio: botón "Respaldo" (baja un .json con todo), o
--     - Supabase: cada tabla → Export → CSV.
--
-- Qué NO toca:
--     - unidades  (leche, etc.): la app las necesita para registrar animales.
--     - profiles  (si existieran): usuarios/roles.
--     - El esquema, las vistas y las funciones.
-- =============================================================================

DO $$
DECLARE t text;
BEGIN
  -- Se listan de "hijas" a "madres"; CASCADE resuelve el resto de las FK.
  FOREACH t IN ARRAY ARRAY[
    'ordenos','palpaciones','tratamientos','vacunaciones',
    'partos','movimientos_potrero','animales','potreros'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', t);
    END IF;
  END LOOP;
END $$;

-- Verificación: debe dar 0 en todo.
SELECT
  (SELECT count(*) FROM animales)            AS animales,
  (SELECT count(*) FROM partos)              AS partos,
  (SELECT count(*) FROM ordenos)             AS ordenos,
  (SELECT count(*) FROM palpaciones)         AS palpaciones,
  (SELECT count(*) FROM tratamientos)        AS tratamientos,
  (SELECT count(*) FROM potreros)            AS potreros;
