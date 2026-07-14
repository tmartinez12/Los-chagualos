# Cómo cargar el Excel de ANIMALES (y demás) — para Claude y para Tatiana

> Esta es la guía operativa para que el cargue **quede bien a la primera**.
> Resume los errores que ya encontramos y cómo evitarlos.

## ⭐ Para Claude (sesiones futuras): la forma robusta

Cuando Tatiana te pase su Excel/CSV de animales lleno, **NO la mandes a pelear
con el importador CSV de Supabase** (rechaza celdas vacías en columnas numéricas
y de fecha con el error `invalid input syntax for type integer: ""`).

En vez de eso, haz tú la conversión:

1. Pídele el archivo (o léelo si está en el repo / te lo adjunta).
2. Léelo con Node + la librería `xlsx` (ya se usó para generar las plantillas).
3. **Genera sentencias `INSERT INTO animales (...) VALUES (...)`** con estas reglas:
   - Celda vacía → `NULL` (NUNCA `''` en columnas de número/fecha/boolean).
   - Texto → entre comillas, escapando `'` como `''`.
   - Números/fechas/booleanos → sin comillas; vacío → `NULL`.
   - Valida los enums (ver abajo); si hay un valor inválido, avísale antes.
   - **Ordena las filas**: primero los animales SIN `madre_id`/`padre_id`
     (toros, vacas viejas) y luego las crías, para no romper las FKs. O genera
     los INSERT sin `madre_id`/`padre_id` y al final unos `UPDATE` para la
     genealogía (este patrón ya está en `scratchpad/gen-seed.js`).
4. Entrégale el `.sql` listo para pegar en **SQL Editor → Run**.
5. Si valió la pena, valida el SQL primero contra un Postgres local efímero
   (hay uno disponible; ver `PRUEBA-DE-HUMO.md`).

Este camino convierte los vacíos en `NULL` correctamente y respeta las FKs, así
que "queda bien" sin que ella tenga que limpiar el Excel a mano.

## Camino manual (si Tatiana lo hace sola con CSV)

El importador de Supabase mete las celdas vacías como `""`. Las columnas de
**texto** lo toleran; las de **número, fecha y booleano NO**. Por eso:

1. En el Excel, **borra (columna completa) las columnas de número/fecha que
   dejaste vacías**. Lo que no esté en el CSV queda `NULL`/valor por defecto.
2. Si una columna numérica está llena en unas filas y vacía en otras: rellena
   las vacías **o** quita la columna y cárgala después.
3. Las columnas de texto (nombre, raza, nota…) sí pueden ir vacías.
4. **Guardar como → CSV (UTF-8)** → Supabase → Table Editor → tabla `animales`
   → **Insert → Import data from CSV**.

Cargue mínimo a prueba de errores (solo lo esencial):

```
id,nombre,raza,grupo,sexo
042,Lucero,Holstein × Gyr,ordeño,H
```

Lo demás (peso, fechas, preñez…) se agrega después editando cada vaca desde la
ficha (botón ✏️ Editar) o con un segundo cargue.

## Columnas por tipo (qué puede ir vacío)

- **Texto (puede ir vacío)**: `nombre`, `raza`, `baja_nota`, `procedencia`.
- **Enum** (si va, valor exacto): `grupo`, `sexo`, `estado_repro`, `origen`,
  `baja_motivo`.
- **Número (vacío → quitar columna o NULL)**: `edad_anios`, `del`, `partos`,
  `leche_ayer`, `prenez_meses`, `dias_vacia`, `peso_kg`, `ganancia_dia_g`,
  `hijas_vivas`, `baja_valor`, `valor_compra`.
- **Fecha `AAAA-MM-DD` (vacío → quitar columna o NULL)**: `nacimiento`,
  `parto_estimado`, `ultima_palpacion`, `secar_estimado`, `retiro_leche_hasta`,
  `fecha_peso`, `venta_programada`, `baja_fecha`.
- **Booleano `true`/`false`**: `lista_servicio`, `destete_proximo`, `rol_toro`,
  `monta_natural`, `sanidad_al_dia`.

> ⚠️ **Columnas DERIVADAS — NO ponerlas en los `INSERT INTO animales`** (las
> calcula la vista `v_animales`; no son columnas de la tabla base): `del`,
> `partos`, `leche_ayer`, `parto_estimado`, `dias_vacia`, `secar_estimado`,
> `prenez_meses_actual`, **`ganancia_dia_g`** (ganancia g/día desde el
> nacimiento). Están en la plantilla solo como referencia de la ficha completa.

### Valores de enum válidos
- `grupo`: ordeño · horra · novilla · levante · cria · macho · baja
- `sexo`: H · M
- `estado_repro`: prenada · servida · vacia · lactando · novilla
- `origen`: nacido_finca · comprado
- `baja_motivo`: venta · muerte · descarte · perdida

## Orden de cargue entre tablas
1. `animales` (primero; todo lo demás referencia sus `id`)
2. `lecheros`, `potreros` (independientes)
3. `ordenos`, `partos`, `tratamientos`, `produccion_mensual` (usan `animal_id`)
4. `entregas` (usa `lechero_id`)

## Antes de cargar lo real: limpiar la demo
Si se cargó `seed-demo.sql`, vaciar primero (en SQL Editor):
```sql
DELETE FROM partos; DELETE FROM tratamientos; DELETE FROM produccion_mensual;
DELETE FROM ordenos; DELETE FROM palpaciones; DELETE FROM animales;
```

## Errores típicos
| Error | Causa | Arreglo |
|---|---|---|
| `invalid input syntax for type integer: ""` | celda vacía en columna numérica | quitar/rellenar esa columna (o usar el camino de INSERT con NULL) |
| `invalid input syntax for type date` | fecha mal formateada | dejar `AAAA-MM-DD` |
| `invalid input value for enum` | valor de enum mal escrito | usar exactamente los valores de arriba |
| `violates foreign key constraint` | `madre_id`/`animal_id` inexistente o fila antes que su padre | ordenar padres primero; cargar `animales` antes que el resto |
| `duplicate key value` | `id` repetido (o demo sin borrar) | borrar la demo o corregir el id |
