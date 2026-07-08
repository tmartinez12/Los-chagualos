-- DEMO SEED · generado desde core/model.js · BORRAR antes de importar Excel reales
-- Reinicio limpio (las tablas hijas van primero por las FKs)
DELETE FROM partos;
DELETE FROM tratamientos;
DELETE FROM ordenos;
DELETE FROM palpaciones;
DELETE FROM movimientos_potrero;
DELETE FROM animales;
DELETE FROM potreros;

-- ANIMALES
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('042', 'Lucero', 'Holstein × Gyr', 'ordeño', 'H', 5.2, 'nacido_finca', (CURRENT_DATE - 152), 'prenada', 6, '2026-05-02', 480, '2026-04-15', NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('038', 'Mona', 'Gyrolando', 'ordeño', 'H', 4.1, 'nacido_finca', (CURRENT_DATE - 98), 'servida', NULL, NULL, 460, '2026-04-15', NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('051', 'Careta', 'Holstein × Gyr', 'ordeño', 'H', 3.2, 'nacido_finca', (CURRENT_DATE - 121), 'vacia', NULL, NULL, 420, '2026-03-15', NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('027', 'Estrella', 'Gyrolando', 'ordeño', 'H', 3.8, 'nacido_finca', (CURRENT_DATE - 64), 'vacia', NULL, NULL, 440, '2026-05-15', NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('017', 'Azucena', 'Holstein', 'ordeño', 'H', 8, 'nacido_finca', (CURRENT_DATE - 201), 'prenada', 4, '2026-05-01', 510, '2026-04-15', NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('033', 'Paloma', 'Normando', 'ordeño', 'H', 6.5, 'nacido_finca', (CURRENT_DATE - 95), 'vacia', NULL, '2026-02-03', 490, '2026-05-15', NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('029', 'Pinta', 'Holstein × Gyr', 'ordeño', 'H', 7, 'comprado', (CURRENT_DATE - 412), 'vacia', NULL, '2026-01-18', 470, '2026-05-15', NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('015', 'Mariposa', 'Gyrolando', 'ordeño', 'H', 5, NULL, (CURRENT_DATE - 180), 'prenada', 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('023', 'Candelaria', 'Holstein', 'ordeño', 'H', 6, NULL, (CURRENT_DATE - 142), 'prenada', 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('035', 'Rocío', 'Normando', 'ordeño', 'H', 4.5, NULL, (CURRENT_DATE - 110), 'prenada', 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('040', 'Nieve', 'Holstein × Gyr', 'ordeño', 'H', 3.5, NULL, (CURRENT_DATE - 88), 'prenada', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('046', 'Esperanza', 'Gyrolando', 'ordeño', 'H', 5.8, NULL, (CURRENT_DATE - 195), 'prenada', 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('011', 'Violeta', 'Gyrolando', 'horra', 'H', 7, NULL, NULL, 'prenada', 8.5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('019', 'Canela', 'Holstein × Gyr', 'horra', 'H', 6, NULL, NULL, 'prenada', 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('045', 'Morena', 'Normando', 'horra', 'H', 5.5, NULL, NULL, 'prenada', 7.5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('008', 'Golondrina', 'Holstein', 'horra', 'H', 9, NULL, NULL, 'prenada', 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('036', 'Cereza', 'Gyrolando', 'horra', 'H', 4, NULL, NULL, 'prenada', 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('041', 'Garza', 'Holstein × Gyr', 'horra', 'H', 5.2, NULL, NULL, 'prenada', 6.5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('014', 'Nube', 'Gyrolando', 'horra', 'H', 6.8, NULL, NULL, 'prenada', 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('048', 'Flor', 'Normando', 'horra', 'H', 3.8, NULL, NULL, 'prenada', 5.5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('022', 'Luna', 'Holstein', 'horra', 'H', 7.5, NULL, NULL, 'prenada', 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('055', 'Princesa', 'Gyrolando', 'novilla', 'H', 2.1, NULL, NULL, 'novilla', NULL, NULL, 342, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('058', 'Alondra', 'Holstein × Gyr', 'novilla', 'H', 2, NULL, NULL, 'novilla', NULL, NULL, 335, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('061', 'Café', 'Normando', 'novilla', 'H', 1.9, NULL, NULL, 'novilla', NULL, NULL, 318, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('063', 'Dalia', 'Gyrolando', 'novilla', 'H', 1.7, NULL, NULL, 'novilla', NULL, NULL, 295, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('067', 'Sirena', 'Holstein', 'novilla', 'H', 1.5, NULL, NULL, 'novilla', NULL, NULL, 275, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('066', 'Esmeralda', 'Gyrolando', 'levante', 'H', 1.17, NULL, NULL, NULL, NULL, NULL, 218, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('068', 'Perla', 'Holstein × Gyr', 'levante', 'H', 1.08, NULL, NULL, NULL, NULL, NULL, 201, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('070', 'Coral', 'Normando', 'levante', 'H', 0.92, NULL, NULL, NULL, NULL, NULL, 178, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('064', 'Cría de Lucero', 'Holstein × Gyr', 'ternera', 'H', 0.42, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('069', 'Cría de Estrella', 'Gyrolando', 'ternera', 'H', 0.29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('071', 'Cría de Canela', 'Holstein × Gyr', 'ternera', 'H', 0.38, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('073', 'Cría de Morena', 'Normando', 'ternera', 'H', 0.25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('T01', 'Sansón', 'Gyr', 'macho', 'M', 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('T02', 'Torete', 'Gyr', 'macho', 'M', 0.92, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('021', 'Lucía', 'Holstein × Gyr', 'baja', 'H', 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'venta', '2026-05-04', 2100000, 'descarte por baja producción');
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('009', 'Manzana', 'Gyrolando', 'baja', 'H', 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'muerte', '2026-04-18', 0, 'timpanismo');
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('044', 'Estrella vieja', 'Holstein', 'baja', 'H', 11, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'muerte', '2026-03-11', 0, 'parto complicado');
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('016', 'Perla', 'Normando', 'baja', 'H', 12, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'venta', '2026-02-20', 1800000, 'descarte por edad');
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('052', 'Nube', 'Gyrolando', 'baja', 'H', 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'perdida', '2026-01-06', 0, 'no apareció tras tormenta');
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('B-074M', 'Cría macho 058', 'Holstein × Gyr', 'baja', 'M', 0.1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'venta', '2026-04-02', 900000, 'ternero macho');
INSERT INTO animales (id, nombre, raza, grupo, sexo, edad_anios, origen, inicio_lactancia, estado_repro, prenez_meses, ultima_palpacion, peso_kg, fecha_peso, rol_toro, baja_motivo, baja_fecha, baja_valor, baja_nota) VALUES ('B-075', 'Cría de Paloma', 'Normando', 'baja', 'H', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'muerte', '2026-04-20', 0, 'mortinato');

-- GENEALOGÍA (madre/padre)
UPDATE animales SET madre_id='017', padre_id='T01' WHERE id='042';
UPDATE animales SET madre_id='011', padre_id='T01' WHERE id='038';
UPDATE animales SET madre_id='033', padre_id='T01' WHERE id='051';
UPDATE animales SET madre_id='038', padre_id='T01' WHERE id='027';
UPDATE animales SET padre_id='T01' WHERE id='055';
UPDATE animales SET madre_id='042', padre_id='T01' WHERE id='064';
UPDATE animales SET madre_id='027', padre_id='T01' WHERE id='069';
UPDATE animales SET madre_id='019', padre_id='T01' WHERE id='071';
UPDATE animales SET madre_id='045', padre_id='T01' WHERE id='073';
UPDATE animales SET madre_id='058' WHERE id='B-074M';
UPDATE animales SET madre_id='033' WHERE id='B-075';



-- POTREROS
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P1', 1, 12, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P2', 2, 19, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P3', 3, 26, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P4', 4, 33, FALSE, TRUE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P5', 5, 9, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P6', 6, 16, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P7', 7, -2, TRUE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P8', 8, 1, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P9', 9, 3, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P10', 10, 13, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P11', 11, 20, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P12', 12, 27, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P13', 13, 34, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P14', 14, 2, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P15', 15, 17, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P16', 16, 24, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P17', 17, 31, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P18', 18, 7, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P19', 19, 14, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P20', 20, 21, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P21', 21, 4, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P22', 22, 35, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P23', 23, 11, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P24', 24, 18, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P25', 25, 25, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P26', 26, 32, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P27', 27, 8, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P28', 28, 15, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P29', 29, 22, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P30', 30, 29, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P31', 31, 5, FALSE, FALSE);
INSERT INTO potreros (id, numero, dias_descanso, hato_actual, sugerido_siguiente) VALUES ('P32', 32, 12, FALSE, FALSE);


-- PARTOS
INSERT INTO partos (id, madre_id, cria_id, fecha, sexo_cria, peso_kg, tipo, estado_cria) VALUES ('P-2026-01', '042', '064', '2026-01-12', 'H', 36, 'normal', 'viva');
INSERT INTO partos (id, madre_id, cria_id, fecha, sexo_cria, peso_kg, tipo, estado_cria) VALUES ('P-2026-02', '027', '069', '2026-02-28', 'H', 34, 'normal', 'viva');
INSERT INTO partos (id, madre_id, cria_id, fecha, sexo_cria, peso_kg, tipo, estado_cria) VALUES ('P-2026-03', '033', 'B-075', '2026-04-20', 'H', 41, 'asistido', 'muerta');

-- TRATAMIENTOS
INSERT INTO tratamientos (id, animal_id, problema, medicamento, inicio, dias_retiro, activo) VALUES ('T-017-01', '017', 'Mastitis', 'Antibiótico', '2026-06-10', 4, TRUE);
