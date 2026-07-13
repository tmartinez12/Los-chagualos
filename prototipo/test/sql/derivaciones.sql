-- Test: v_animales deriva edad, DEL, leche de ayer, retiro, parto estimado,
-- conteo de partos y ganancia/día — la app NUNCA guarda estos valores.
\set ON_ERROR_STOP on
BEGIN;

-- animal con nacimiento y lactancia conocidos
INSERT INTO animales (id, nombre, especie, grupo, sexo, nacimiento, inicio_lactancia, peso_kg)
VALUES ('V1', 'Vaca', 'bovino', 'ordeño', 'H', hoy_finca() - 1096, hoy_finca() - 100, NULL);   -- ~3 años, DEL 100

-- cría con peso para ganancia/día
INSERT INTO animales (id, nombre, especie, grupo, sexo, nacimiento, peso_kg)
VALUES ('T1', 'Ternera', 'bovino', 'cria', 'H', hoy_finca() - 200, 120);   -- 120kg en 200 días

-- ordeño de "ayer" (leche_ultima)
INSERT INTO ordenos (animal_id, fecha, litros, turno) VALUES ('V1', hoy_finca() - 1, 15, 'dia');
-- tratamiento con retiro activo (retiro_calc); medicamento es el campo principal
INSERT INTO tratamientos (id, animal_id, medicamento, inicio, dias_retiro, activo)
VALUES ('TR1', 'V1', 'Antibiótico', hoy_finca() - 1, 4, true);

DO $$
DECLARE edad numeric; del int; leche numeric; retiro date; gan numeric;
BEGIN
  SELECT edad_calc, del_calc, leche_ultima, retiro_calc INTO edad, del, leche, retiro
  FROM v_animales WHERE id='V1';
  IF round(edad) <> 3 THEN RAISE EXCEPTION 'edad derivada mal: %', edad; END IF;
  IF del <> 100 THEN RAISE EXCEPTION 'DEL derivado mal: %', del; END IF;
  IF leche <> 15 THEN RAISE EXCEPTION 'leche de ayer mal: %', leche; END IF;
  IF retiro IS NULL OR retiro < hoy_finca() THEN RAISE EXCEPTION 'retiro no activo: %', retiro; END IF;

  -- ganancia/día de la cría: 120000 g / 200 días = 600 g/día
  SELECT ganancia_dia_g INTO gan FROM v_animales WHERE id='T1';
  IF gan <> 600 THEN RAISE EXCEPTION 'ganancia/día mal: % (esperaba 600)', gan; END IF;

  -- sin peso → ganancia null (no inventa)
  IF (SELECT ganancia_dia_g FROM v_animales WHERE id='V1') IS NOT NULL
     THEN RAISE EXCEPTION 'ganancia debía ser null sin peso'; END IF;
END $$;

-- parto estimado y secado se derivan de la preñez
INSERT INTO animales (id, nombre, especie, grupo, sexo, estado_repro, prenez_meses, ultima_palpacion)
VALUES ('P1', 'Preñada', 'bovino', 'horra', 'H', 'prenada', 7, hoy_finca());
DO $$
DECLARE pe date; se date;
BEGIN
  SELECT parto_estimado_calc, secar_calc INTO pe, se FROM v_animales WHERE id='P1';
  -- a 7 meses, faltan ~2 meses de parto (~61 días) y el secado es ~ya (0 días)
  IF pe IS NULL OR pe <= hoy_finca() THEN RAISE EXCEPTION 'parto estimado mal: %', pe; END IF;
  IF se IS NULL THEN RAISE EXCEPTION 'secado estimado nulo'; END IF;
END $$;

ROLLBACK;
