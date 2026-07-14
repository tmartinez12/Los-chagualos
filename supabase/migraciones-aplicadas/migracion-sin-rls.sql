-- ════════════════════════════════════════════════════════════════════════════
-- ARREGLO: desactivar RLS en todas las tablas (MVP sin login)
-- ════════════════════════════════════════════════════════════════════════════
-- Por qué: el esquema activaba Row Level Security con políticas que exigen un
-- JWT con role='admin'. Como por ahora usamos la anon key SIN login, esas
-- políticas dejan las lecturas en CERO filas (sin error), y el hato aparece
-- vacío. Las lecturas funcionaban solo porque pasaban por la vista v_animales
-- (que corre con permisos del dueño y se salta el RLS); al quedar la vista sin
-- recrear, las lecturas caen a la tabla y el RLS las bloquea.
--
-- Usa ALTER TABLE IF EXISTS para saltar sin error las tablas que aún no estén
-- creadas en tu base. Es idempotente: se puede correr cuantas veces haga falta.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS animales            DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ordenos             DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entregas            DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS partos              DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS palpaciones         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tratamientos        DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS potreros            DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS produccion_mensual  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lecheros            DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movimientos_potrero DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles            DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tarifa              DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS consumo_interno     DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vacunaciones        DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS finca               DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS unidades            DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS modulos             DISABLE ROW LEVEL SECURITY;

-- Acceso de lectura/escritura para la app (anon key) mientras no haya login.
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
