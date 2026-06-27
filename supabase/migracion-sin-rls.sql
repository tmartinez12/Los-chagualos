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
-- Esta migración desactiva RLS en todas las tablas de datos. Es idempotente:
-- se puede correr cuantas veces haga falta sin romper nada.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE animales            DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordenos             DISABLE ROW LEVEL SECURITY;
ALTER TABLE entregas            DISABLE ROW LEVEL SECURITY;
ALTER TABLE partos              DISABLE ROW LEVEL SECURITY;
ALTER TABLE palpaciones         DISABLE ROW LEVEL SECURITY;
ALTER TABLE tratamientos        DISABLE ROW LEVEL SECURITY;
ALTER TABLE potreros            DISABLE ROW LEVEL SECURITY;
ALTER TABLE produccion_mensual  DISABLE ROW LEVEL SECURITY;
ALTER TABLE lecheros            DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_potrero DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            DISABLE ROW LEVEL SECURITY;

-- Tablas que pueden o no tener RLS activo; las dejamos explícitas por si acaso.
ALTER TABLE tarifa              DISABLE ROW LEVEL SECURITY;
ALTER TABLE consumo_interno     DISABLE ROW LEVEL SECURITY;
ALTER TABLE vacunaciones        DISABLE ROW LEVEL SECURITY;
ALTER TABLE finca               DISABLE ROW LEVEL SECURITY;
ALTER TABLE unidades            DISABLE ROW LEVEL SECURITY;
ALTER TABLE modulos             DISABLE ROW LEVEL SECURITY;

-- Acceso de lectura/escritura para la app (anon key) mientras no haya login.
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
