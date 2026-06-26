-- =============================================================================
-- Los Chagualos · Desnormalización de la producción
-- Una sola fuente de verdad (ordenos) + inicio_lactancia. DEL, leche de ayer y
-- el histórico mensual se DERIVAN con vistas. Ya no se llenan por separado.
-- =============================================================================

-- 1) Campo único para el DEL: fecha en que arrancó la lactancia (= último parto).
--    DEL = hoy − inicio_lactancia. Reemplaza la necesidad de guardar "del".
ALTER TABLE animales ADD COLUMN IF NOT EXISTS inicio_lactancia DATE;

-- 2) Vista de animales con DEL y "leche de ayer" DERIVADOS.
--    - del_calc: días desde el inicio de lactancia (si se conoce).
--    - leche_ultima: litros del ordeño más reciente registrado.
--    La app usa estos cuando existen; si no, cae a las columnas guardadas.
CREATE OR REPLACE VIEW v_animales AS
SELECT a.*,
  CASE WHEN a.inicio_lactancia IS NOT NULL
       THEN (CURRENT_DATE - a.inicio_lactancia) END AS del_calc,
  ( SELECT o.litros FROM ordenos o
    WHERE o.animal_id = a.id AND o.turno = 'dia'
    ORDER BY o.fecha DESC LIMIT 1 ) AS leche_ultima
FROM animales a;

-- 3) Vista del histórico mensual DERIVADA de los ordeños (ya no se llena a mano).
CREATE OR REPLACE VIEW v_produccion_mensual AS
SELECT animal_id,
       to_char(fecha, 'YYYY-MM')      AS mes,
       round(avg(litros)::numeric, 1) AS litros_dia,
       count(*)                       AS dias_con_registro
FROM ordenos
WHERE turno = 'dia'
GROUP BY animal_id, to_char(fecha, 'YYYY-MM');

-- 4) Permisos para que la app (rol anon) pueda leer las vistas.
GRANT SELECT ON v_animales TO anon, authenticated;
GRANT SELECT ON v_produccion_mensual TO anon, authenticated;
