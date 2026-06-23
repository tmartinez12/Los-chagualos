# Prueba de humo — Los Chagualos

Dos niveles: (1) **automática** (sin navegador) y (2) **manual en el navegador**
(lo que requiere red real a Supabase + render de la UI).

---

## 1) Automática — `node prototipo/test/smoke.js`

Corre sin dependencias ni red. Verifica:
- El núcleo (`model`, `rules`, `store`) carga.
- `store.js` exporta **todas** las funciones `LCStore.*` que usan móvil y escritorio.
- Las reglas (`fechaParto`, `curvaLactancia`, `parsePalpNota`, `esBajonLeche`).
- Integridad del modelo: IDs únicos, genealogía válida, enums correctos, partos.
- Coherencia `schema.sql` ↔ `seed-demo.sql` (columnas de cada INSERT existen).

```
node prototipo/test/smoke.js     # sale 0 si todo OK, !=0 si algo falla
```

### Opcional: validar el SQL contra Postgres real (si está instalado)
```
# como usuario no-root, en un dir efímero:
initdb -D ./pg -A trust && pg_ctl -D ./pg -o "-p 54329 -k $PWD" -l ./pg/log start
psql -h $PWD -p 54329 -d postgres -v ON_ERROR_STOP=1 -f supabase/schema.sql
psql -h $PWD -p 54329 -d postgres -v ON_ERROR_STOP=1 -f supabase/seed-demo.sql
```
(Ya validado: esquema + seed + las 8 escrituras del app ejecutan sin errores.)

---

## 2) Manual en el navegador (contra tu Supabase)

> Requiere: schema aplicado, datos base + seed cargados, RLS desactivado en las
> tablas de datos. Espera ~2 min al despliegue de GitHub Pages tras cada push.

### A. Conexión
- [ ] `…/conexion.html` muestra **✓ Conexión OK · 42 animal(es)**.

### B. Escritorio — lecturas (`escritorio.html`)
- [ ] **Inicio**: KPIs y alertas reales (potrero P7→P4, secar Esperanza, retiro Azucena).
- [ ] **Producción**: 12 vacas + scatter.
- [ ] **Hato**: 37 activos; clic en cualquiera abre su ficha.
- [ ] **Reproducción**: 5 candidatas a palpar, 2 vacías.
- [ ] **Partos**: próximos (Violeta ~3 jul) + recientes.
- [ ] **Plan sanitario**: tratamiento de Azucena.

### C. Escritorio — escrituras (registra y revisa la tabla en Supabase)
- [ ] **Ordeño** → Registrar → F5 → sigue marcada (tabla `ordenos`).
- [ ] **Palpar** → tabla `palpaciones` + cambia estado en `animales`.
- [ ] **Secar** una preñada → pasa a `horra`.
- [ ] **Parto** → `partos` + cría nueva en `animales` + madre a `ordeño`.
- [ ] **Compra** y luego **Deshacer** → aparece y desaparece de `animales`.

### D. Móvil — lecturas (`index.html`)
- [ ] **Ordeño**: 12 vacas (tiles).
- [ ] **Hato**: grupos con conteos reales; clic en un animal abre **su** ficha
      (no la de Lucero) con genealogía, curva y stats propios.
- [ ] **Reproducción**: próximos partos, vacías y candidatas reales.

### E. Móvil — escrituras
- [ ] **Ordeño** → guarda (chip "sin subir" baja al sincronizar) → fila en `ordenos`.
- [ ] **Entregas** → "Registrar entrega" → filas en `entregas`.
- [ ] **Palpar / Tratar / Secar / Parto / Compra / Baja** → revisa la tabla
      correspondiente en Supabase.

### Si algo falla
- Aparece "⚠ … falta sincronizar" → abre la consola del navegador (F12),
  copia el error y compáralo: suele ser RLS activo en esa tabla, o un dato fuera
  de enum. Desactiva RLS en la tabla o corrige el dato.

---

## Estado conocido (no bugs)
- El "Deshacer" de **parto** y **palpación** revierte la pantalla, no la base.
- RLS está desactivado para el MVP; al activar login por PIN habrá que añadir
  políticas de operario para `partos`, `tratamientos`, `palpaciones`, `animales`.
