# Guía de importación de datos — Los Chagualos

## Plantillas CSV

En la carpeta `plantillas/` hay un CSV por tabla con las columnas exactas del
esquema. Llénalas desde tus Excel y luego impórtalas a Supabase.

### animales.csv
| Columna | Tipo | Ejemplo | Notas |
|---|---|---|---|
| id | texto | 042 | Identificador único (chapeta) |
| nombre | texto | Lucero | |
| raza | texto | Holstein × Gyr | |
| grupo | enum | ordeño | ordeño, horra, novilla, levante, ternera, macho, baja |
| sexo | enum | H | H o M |
| edad_anios | número | 5.2 | Decimal (meses ÷ 12) |
| nacimiento | fecha | 2021-01-15 | ISO YYYY-MM-DD (si se conoce) |
| origen | enum | nacido_finca | nacido_finca o comprado |
| del | entero | 152 | Días en leche (solo ordeño) |
| partos | entero | 3 | |
| leche_ayer | número | 18.0 | Litros (solo ordeño) |
| estado_repro | enum | prenada | prenada, servida, vacia, lactando, novilla |
| prenez_meses | número | 6 | Solo si preñada |
| parto_estimado | fecha | 2026-09-12 | Solo si preñada |
| madre_id | texto | 017 | ID de la madre (si se conoce) |
| padre_id | texto | T01 | ID del padre (si se conoce) |
| peso_kg | número | 480 | Último pesaje |
| baja_motivo | enum | venta | Solo grupo=baja: venta, muerte, descarte, perdida |
| baja_fecha | fecha | 2026-05-04 | Solo grupo=baja |
| baja_valor | número | 2100000 | COP |

*Las columnas que no aplican se dejan vacías.*

### lecheros.csv
| Columna | Ejemplo | Notas |
|---|---|---|
| id | jose | Identificador corto |
| nombre | Don José | |
| frecuencia | diario | diario, lmv, etc. |
| dias_semana | {0,1,2,3,4,5,6} | Array Postgres |
| base_litros | 120 | Litros base por entrega |

### potreros.csv
| Columna | Ejemplo |
|---|---|
| id | P1 |
| numero | 1 |
| dias_descanso | 15 |
| hato_actual | false |
| sugerido_siguiente | false |

### partos.csv
| Columna | Ejemplo |
|---|---|
| id | P-2026-01 |
| madre_id | 042 |
| cria_id | 064 |
| fecha | 2026-01-12 |
| sexo_cria | H |
| peso_kg | 36 |
| tipo | normal |
| estado_cria | viva |

### tratamientos.csv
| Columna | Ejemplo |
|---|---|
| id | T-017-01 |
| animal_id | 017 |
| problema | Mastitis |
| medicamento | Antibiótico |
| inicio | 2026-06-10 |
| dias_retiro | 4 |
| retiro_leche_hasta | 2026-06-14 |
| activo | true |

## Cómo importar en Supabase

1. Ve a **Table Editor** en tu dashboard de Supabase
2. Selecciona la tabla (ej: `animales`)
3. Click en **Insert** → **Import data from CSV**
4. Sube el archivo CSV correspondiente
5. Revisa que las columnas coincidan y confirma

### Orden de importación (por llaves foráneas)
1. `unidades` y `modulos` (ya vienen en el schema, pero puedes verificar)
2. `potreros`
3. `lecheros`
4. **`animales`** (la más importante — primero los que NO tienen madre/padre,
   luego los que sí, para que las FK funcionen)
5. `partos`
6. `tratamientos`

> **Tip**: Si tienes animales con madre_id/padre_id que apuntan a otros animales,
> importa primero los padres/madres (toros, vacas viejas) y luego las crías.
> O importa todos con madre_id/padre_id vacíos y luego actualiza esas columnas.
