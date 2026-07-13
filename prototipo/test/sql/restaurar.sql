-- Test: restaurar_respaldo() — reemplazo TOTAL transaccional (o entra todo, o
-- nada). El payload se arma con to_jsonb (igual que exportarTodo: select *).
\set ON_ERROR_STOP on
BEGIN;

-- estado inicial: 2 animales + 1 ordeño
INSERT INTO animales (id, nombre, especie, grupo, sexo) VALUES
  ('A1', 'Uno', 'bovino', 'ordeño', 'H'),
  ('A2', 'Dos', 'bovino', 'horra',  'H');
INSERT INTO ordenos (animal_id, fecha, litros, turno) VALUES ('A1', hoy_finca(), 12, 'dia');

-- snapshot del estado (lo que guardaría exportarTodo)
CREATE TEMP TABLE snap AS
SELECT jsonb_build_object('tablas', jsonb_build_object(
  'animales', (SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) FROM animales a),
  'ordenos',  (SELECT coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) FROM ordenos o)
)) AS p;

-- ensuciar: agregar un animal que NO está en el snapshot
INSERT INTO animales (id, nombre, especie, grupo, sexo) VALUES ('A3', 'Extra', 'bovino', 'cria', 'H');

-- restaurar el snapshot → A3 debe desaparecer, A1/A2 volver
DO $$
DECLARE res jsonb;
BEGIN
  SELECT restaurar_respaldo((SELECT p FROM snap)) INTO res;
  IF (res->>'animales')::int <> 2 THEN RAISE EXCEPTION 'restaurar reportó % animales, esperaba 2', res->>'animales'; END IF;
  IF EXISTS (SELECT 1 FROM animales WHERE id='A3') THEN RAISE EXCEPTION 'A3 no se eliminó en la restauración'; END IF;
  IF (SELECT count(*) FROM animales) <> 2 THEN RAISE EXCEPTION 'debían quedar 2 animales'; END IF;
  IF (SELECT count(*) FROM ordenos WHERE animal_id='A1') <> 1 THEN RAISE EXCEPTION 'el ordeño de A1 no se restauró'; END IF;
END $$;

-- transaccionalidad: un payload que viola una FK debe ABORTAR y dejar TODO como
-- estaba (no un TRUNCATE a medias). Ordeño que apunta a un animal inexistente.
DO $$
DECLARE animales_antes int; malo jsonb;
BEGIN
  SELECT count(*) INTO animales_antes FROM animales;
  malo := jsonb_build_object('tablas', jsonb_build_object(
    'animales', (SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) FROM animales a),
    'ordenos',  jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid(), 'animal_id', 'NO_EXISTE', 'fecha', hoy_finca(),
      'litros', 5, 'turno', 'dia', 'created_at', now()))   -- animal_id inexistente → viola la FK
  ));
  BEGIN
    PERFORM restaurar_respaldo(malo);
    RAISE EXCEPTION 'debía fallar: ordeno apunta a un animal inexistente';
  EXCEPTION WHEN foreign_key_violation THEN
    -- ok: rechazado. El TRUNCATE + inserts se revirtieron: los animales siguen.
    IF (SELECT count(*) FROM animales) <> animales_antes
       THEN RAISE EXCEPTION 'la restauración fallida no se revirtió (animales=%)', (SELECT count(*) FROM animales); END IF;
  END;
END $$;

-- payload inválido (sin 'tablas') → error claro, sin tocar datos
DO $$
DECLARE animales_antes int;
BEGIN
  SELECT count(*) INTO animales_antes FROM animales;
  BEGIN
    PERFORM restaurar_respaldo('{}'::jsonb);
    RAISE EXCEPTION 'debía rechazar un payload sin tablas';
  EXCEPTION WHEN others THEN
    IF (SELECT count(*) FROM animales) <> animales_antes THEN RAISE EXCEPTION 'payload inválido tocó los datos'; END IF;
  END;
END $$;

ROLLBACK;
