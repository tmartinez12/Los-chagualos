-- Test: registrar_parto_completo() — cría + parto + madre en UNA transacción.
-- Las aserciones usan RAISE EXCEPTION: si algo no cuadra, psql sale != 0.
\set ON_ERROR_STOP on
BEGIN;

-- madre horra preñada
INSERT INTO animales (id, nombre, especie, grupo, sexo, estado_repro, prenez_meses, ultima_palpacion)
VALUES ('M1', 'Madre', 'bovino', 'horra', 'H', 'prenada', 8, hoy_finca() - 30);

-- parto con cría viva
SELECT registrar_parto_completo('M1', hoy_finca(), 'H', 38, 'normal', 'viva', 'P1', 'C1', 'Cría de Madre', 'Holstein');

DO $$
DECLARE g grupo_animal; il date; np int; cg grupo_animal; er estado_repro;
BEGIN
  -- la cría entró como cria, vinculada a la madre
  SELECT grupo INTO cg FROM animales WHERE id = 'C1';
  IF cg IS DISTINCT FROM 'cria' THEN RAISE EXCEPTION 'cría no quedó en cria: %', cg; END IF;
  IF (SELECT madre_id FROM animales WHERE id='C1') <> 'M1' THEN RAISE EXCEPTION 'cría sin madre_id correcto'; END IF;
  -- el parto quedó registrado
  IF (SELECT count(*) FROM partos WHERE id='P1' AND madre_id='M1' AND cria_id='C1') <> 1
     THEN RAISE EXCEPTION 'parto P1 no registrado'; END IF;
  -- la madre volvió al ordeño en DEL 0, sin preñez
  SELECT grupo, inicio_lactancia, estado_repro INTO g, il, er FROM animales WHERE id='M1';
  IF g IS DISTINCT FROM 'ordeño' THEN RAISE EXCEPTION 'madre no volvió a ordeño: %', g; END IF;
  IF il IS DISTINCT FROM hoy_finca() THEN RAISE EXCEPTION 'inicio_lactancia mal: %', il; END IF;
  IF er IS NOT NULL THEN RAISE EXCEPTION 'estado_repro no se limpió: %', er; END IF;
  -- el conteo de partos derivado en v_animales cuenta 1
  SELECT partos INTO np FROM v_animales WHERE id='M1';
  IF np <> 1 THEN RAISE EXCEPTION 'conteo de partos mal: %', np; END IF;
  -- DEL derivado = 0 (parió hoy)
  IF (SELECT del_calc FROM v_animales WHERE id='M1') <> 0 THEN RAISE EXCEPTION 'DEL no es 0'; END IF;
END $$;

-- parto SIN cría (histórico/mortinato): no crea animal, sí registra parto
SELECT registrar_parto_completo('M1', hoy_finca() - 400, 'M', NULL, 'normal', 'muerta', 'P2', NULL, NULL, NULL);
DO $$
BEGIN
  IF (SELECT count(*) FROM partos WHERE madre_id='M1') <> 2 THEN RAISE EXCEPTION 'debía haber 2 partos'; END IF;
  IF (SELECT partos FROM v_animales WHERE id='M1') <> 2 THEN RAISE EXCEPTION 'conteo derivado != 2'; END IF;
END $$;

-- transaccionalidad: un parto con cría de id que YA existe debe fallar y NO
-- dejar el parto a medias.
DO $$
DECLARE partos_antes int;
BEGIN
  SELECT count(*) INTO partos_antes FROM partos;
  BEGIN
    PERFORM registrar_parto_completo('M1', hoy_finca(), 'H', 40, 'normal', 'viva', 'P3', 'C1', 'dup', NULL);
    RAISE EXCEPTION 'debía fallar por cría duplicada C1';
  EXCEPTION WHEN unique_violation THEN
    -- ok: rechazado. Verificar que P3 NO entró (rollback del bloque)
    IF (SELECT count(*) FROM partos) <> partos_antes THEN RAISE EXCEPTION 'el parto P3 no se revirtió'; END IF;
  END;
END $$;

ROLLBACK;  -- el test no deja datos
