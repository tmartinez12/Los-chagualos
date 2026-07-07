# 🔍 Auditoría técnica — Los Chagualos

> **Fecha:** julio 2026 · **Rama auditada:** `claude/youthful-cannon-l903re`
> **Propósito:** inventario completo de brechas, problemas y mejoras del frontend
> y el backend, escrito para que cualquier persona (o modelo de IA) pueda tomar
> un ítem y arreglarlo sin más contexto. Cada hallazgo tiene un ID estable
> (cítalo al trabajar), referencia `archivo:línea` y arreglo sugerido.
>
> **Cómo verificar un arreglo:** `node prototipo/test/smoke.js` (17 verificaciones)
> + abrir `prototipo/index.html` y `prototipo/escritorio.html` con un servidor
> local (`python3 -m http.server`) y revisar que no haya errores de consola.
> Para SQL: validar contra un Postgres 16 local antes de tocar Supabase.

## 📌 Estado (actualizado jul 2026, tras la primera ronda de correcciones)

**Corregidos:** A2 (respaldo paginado, aborta en error) · A4 (README de
migraciones + `migraciones-aplicadas/` archivadas) · A5 (semilla `unidades` en
schema) · A6 (RPC transaccional `registrar_parto_completo` + errores visibles
en todos los catch) · A9 (`deleteOrdeno` cableado) · A10 (undo con reversa en
BD: leche, tratamiento y secado en ambas superficies) · A11 (guards con hato
vacío en los 9 flujos) · M1+M3+B10 (CHECKs y UNIQUEs en `migracion-integridad.sql`)
· M2 (FKs ON DELETE SET NULL) · M4 (`updateAnimal` retirado del API) · M5
(caché con token de generación + fallback solo en 42P01) · M17 (workflow
`respaldo.yml` semanal, también evita la pausa del free tier) · M18 (parto/secado
calculados en días) · B5 (índice compuesto) · B9 (REVOKE en profiles/outbox).

**Parciales:** A3 (restauración ahora valida y filtra columnas; sigue siendo
merge sin transacción — el TRUNCATE previo/RPC queda pendiente) · A7 (copy
honesto, pero el outbox real con localStorage sigue pendiente) · A8 (esc() en
listas/fichas/tablas principales; falta refactorizar los `onclick` en strings)
· B2 (matching exacto `numDe()` en trata/seca/baja móvil; quedan otros sitios)
· M13 (litros validados en store; faltan `max` en date inputs).

**Pendiente del dueño:** correr `supabase/migracion-integridad.sql` en el SQL
Editor (después de vacunaciones y zona-horaria, si faltan — ver `supabase/README.md`).

**Segunda ronda (M6–M16), corregidos:** M6 (carrera de KPIs repro móvil: usa la
lista local) · M7 (cachés canónicos actualizados en parto/baja de ambas
superficies, con reversa en el undo; lista de tratamientos móvil recargable) ·
M8 (todas las lecturas paginan de a 1000) · M9 (isoHoy delega en hoyFinca y
ambas superficies recargan solas al cambiar el día) · M10 (✕ eliminar con
confirmación en historiales de partos/palpaciones/vacunaciones del escritorio)
· M11 parcial (terminar/reactivar tratamiento desde el móvil; corrección de
ordeños pasados en móvil sigue pendiente) · M12 (banner "cargando…" y banner
rojo de error con reintentar en ambas superficies) · M13 (max=hoy en date
inputs; litros con tope 99,9 en la tabla semanal) · M14 parcial (PROTOCOLO_SAN
único en rules.js; el refactor grande a core/acciones.js sigue pendiente) ·
M15 (supabase-js 2.110.0 vendorizado, sin CDN flotante) · M16 (cache-busting
?v= en scripts y CSS) · B12 (snack ruidoso de carga eliminado).

**Sin tocar aún:** A1 (auth+RLS), M19-M20, y los B restantes.

## Mapa rápido del proyecto

| Pieza | Archivos | Rol |
|---|---|---|
| Escritorio | `prototipo/escritorio.html` + `escritorio.js` (~2550 líneas) + `escritorio.css` | Vista administradora |
| Móvil | `prototipo/index.html` + `app.js` (~1120 líneas) + `styles.css` | Registro en campo |
| Capa de datos | `prototipo/core/store.js` (LCStore) | Única frontera UI ↔ Supabase |
| Reglas compartidas | `prototipo/core/rules.js` | Fechas, curva de lactancia, parser vet |
| Fixture de test | `prototipo/core/model.js` | **Solo** lo usa `test/smoke.js`; NO se carga en la app |
| Backend | `supabase/schema.sql` (canónico) + `supabase/migracion-*.sql` | Postgres en Supabase, vistas derivadas `v_animales` / `v_produccion_mensual` |
| Deploy | `.github/workflows/pages.yml` | GitHub Pages, publica `prototipo/` al hacer push a la rama de trabajo |

**Principio de diseño ya establecido:** los valores derivados (edad, DEL, leche
de ayer, retiro, parto estimado, conteo de partos) se calculan en la vista
`v_animales`, nunca se guardan. La zona horaria de la finca es `America/Bogota`
vía `hoy_finca()` (SQL) y `hoyFinca()` (store.js). No romper esto al arreglar.

---

## 🔴 SEVERIDAD ALTA — pérdida de datos, seguridad, instalabilidad

### A1 · La base es escribible por cualquiera (sin login, RLS desactivado)
- **Dónde:** `supabase/schema.sql:278-286` (RLS DISABLE), `:336-339` (GRANT ALL a `anon`), `prototipo/core/store.js:24-27` (anon key pública en el JS).
- **Problema:** cualquiera con la URL puede leer, modificar o **borrar todo el hato** (`deleteAnimal`, `restaurarTodo` incluidos). Es decisión consciente de MVP sin login, pero la exposición es total y no hay red de seguridad automática.
- **Arreglo:** corto plazo → respaldos automáticos (ver A2) y no difundir la URL. Mediano plazo → Supabase Auth (o el login por PIN ya esbozado) + políticas RLS por rol. Al reactivar login, revisar la edge function `login-pin` (ver B8).

### A2 · El "Respaldo" trunca a 1000 filas por tabla, en silencio
- **Dónde:** `prototipo/core/store.js:376-383` (`exportarTodo`).
- **Problema:** PostgREST devuelve máx. 1000 filas por defecto y no se pagina. Con ~12-26 ordeños/día, `ordenos` supera 1000 filas en 2-3 meses: el `.json` de respaldo pierde el histórico viejo **sin avisar**. Además un error de red se convierte en "tabla vacía" en el respaldo (línea `out.tablas[t]=error?[]:…`). Es la única red de seguridad de la finca y tiene dos agujeros.
- **Arreglo:** paginar con `.range(offset, offset+999)` en bucle hasta recibir <1000 filas; hacer `throw` si una tabla da error en vez de continuar con `[]`.

### A3 · `restaurarTodo` no es transaccional, no valida, y es un merge (no un restore)
- **Dónde:** `prototipo/core/store.js:384-408`.
- **Problema:** (a) upserts secuenciales sin transacción — si falla a mitad, la base queda mezclada sin rollback; (b) no valida el contenido del `.json` (un respaldo de esquema viejo con columnas eliminadas revienta a mitad); (c) no borra filas creadas después del respaldo, así que no devuelve al estado del snapshot; (d) puede restaurar respaldos ya truncados por A2.
- **Arreglo:** función Postgres (RPC) que restaure en una transacción; validar versión/columnas del archivo antes de empezar; documentar que es merge o agregar TRUNCATE previo opcional.

### A4 · Migraciones sin orden documentado; `migracion-color.sql` puede destruir `v_animales`
- **Dónde:** `supabase/migracion-color.sql:18-39` y la carpeta `supabase/` en general.
- **Problema:** `migracion-color.sql` recrea la vista con la definición **vieja**: usa `CURRENT_DATE` (desharía el fix de zona horaria), referencia `retiro_leche_hasta` (columna que `migracion-simplificar.sql` eliminó → el CREATE VIEW falla) y como antes hace `DROP VIEW ... CASCADE`, correrla hoy deja la base **sin `v_animales`**. No existe orden numerado, ni registro de qué migración ya corrió, ni README de instalación (¿instalar = schema.sql solo? sí, pero nada lo dice). Ya pasó en la práctica: la base desplegada no tenía `vacunaciones` porque su migración nunca se corrió.
- **Arreglo:** (1) declarar `schema.sql` como único instalador para bases nuevas; (2) mover migraciones a `supabase/migrations/NNN-nombre.sql` con orden numérico y un README; (3) archivar las ya fusionadas en schema.sql (color, desnormalizar, sin-rls, vacunaciones); (4) opcional: query de drift-check (`information_schema` vs schema.sql).

### A5 · `unidades` nunca se puebla: una instalación limpia no puede insertar animales
- **Dónde:** `supabase/schema.sql:54-58` (tabla), `:65` (`animales.unidad_id ... REFERENCES unidades(id)`).
- **Problema:** ningún archivo del repo hace `INSERT INTO unidades`. En una base recién creada, todo `insertAnimal` (y el propio seed) falla por FK. La base desplegada funciona porque la fila `'leche'` se insertó a mano — drift no reproducible.
- **Arreglo:** añadir a `schema.sql`: `INSERT INTO unidades (id,nombre,activa) VALUES ('leche','Ganadería de leche',true) ON CONFLICT (id) DO NOTHING;`.

### A6 · Guardados multi-paso sin transacción + errores silenciosos con snack de éxito
- **Dónde:** parto = 3 escrituras encadenadas: `escritorio.js:2279-2289`, `app.js:688-698` (`insertAnimal → registrarParto → updateAnimalCampos`). Catch silenciosos: `app.js:698, 860, 983, 1099` (solo `console.warn`; el usuario ya vio "guardado ✓"). El mensaje `escritorio.js:2288` "Parto guardado local, falta sincronizar" es falso: no hay persistencia local.
- **Problema:** si falla el paso 2 o 3, queda una cría sin parto o la madre sin actualizar; con red intermitente (el caso real de la finca) un registro "exitoso" puede no existir.
- **Arreglo:** (1) RPC transaccional `registrar_parto()` en Postgres para el flujo de parto; (2) en todos los catch, snack de error visible ("NO se guardó — reintenta") en vez de `console.warn`; (3) reintento con backoff en store.js.

### A7 · El contador "offline / pendientes" es cosmético — promete sync que no existe
- **Dónde:** `app.js:573-583` (`encolar/desencolar/sincronizar`), copy en `app.js:460,581`; tabla `outbox` en `schema.sql:242-255` sin uso; README promete "Offline-first".
- **Problema:** es un entero en memoria; se pierde al recargar, no reintenta, no persiste. "Se suben solos cuando haya señal" es falso: fallo de red = dato perdido con mensaje de éxito.
- **Arreglo:** outbox real en `localStorage` con reintento en evento `online` + al abrir la app; o quitar el contador y el copy de offline hasta implementarlo.

### A8 · XSS: `innerHTML` con texto libre de la BD, generalizado
- **Dónde:** `escritorio.js:1857` (nombre/raza en hato), `:703,749` (mensual), `:1019` (nota/procedencia en ficha), `:1471` (tratamientos), `:1683` (motivo palpación); `app.js:125,141,325,548`. También ids interpolados dentro de `onclick="..."` en strings (`escritorio.js:247,266,329`; `app.js:126,366`).
- **Problema:** nombre, nota, raza, motivo, producto y lote son texto libre editable; un valor como `<img src=x onerror=...>` ejecuta JS en cualquier navegador que abra la app. Combinado con A1 (cualquiera puede escribir en la BD), es explotable de verdad, no teórico.
- **Arreglo:** helper `esc()` aplicado a TODO dato de BD interpolado en `innerHTML`, y reemplazar `onclick` en strings por listeners con closures.

### A9 · Borrar una celda del registro semanal no borra en la BD
- **Dónde:** `escritorio.js:373` (`guardarCeldaSemana`, rama `raw===''`).
- **Problema:** elimina el litro de los mapas locales pero no existe `deleteOrdeno` en store.js: al recargar, el dato "borrado" reaparece.
- **Arreglo:** añadir `LCStore.deleteOrdeno(animalId, fecha)` (DELETE con eq animal+fecha+turno) y llamarlo en esa rama.

### A10 · Varios "Deshacer" no revierten la BD (solo lo local)
- **Dónde:** `saveMilk` `escritorio.js:481-484` (el upsert ya se disparó); `saveTrata` `escritorio.js:2161-2165` y `app.js:940-942`; `saveSeca` móvil `app.js:986-991`.
- **Problema:** el undo restaura la pantalla pero el registro queda en Supabase. El caso más grave: deshacer un secado en móvil **no** revierte `{grupo:'horra', inicio_lactancia:null}` → la vaca pierde su DEL definitivamente (el escritorio sí guarda `prevInicio`, `escritorio.js:2195,2208` — copiar ese patrón).
- **Arreglo:** en cada undo, capturar estado previo y compensar en BD (como ya hacen parto y palpación).

### A11 · Crashes con hato vacío o sin conexión
- **Dónde:** `app.js:646,969,1089` (`parto.cow.split('·')[1]` con `cow=''`); `escritorio.js:2124` (`cands[0].num`), `:2173`, `:2489` (`hato[0].num`).
- **Problema:** con la base vacía (estado real después de `limpiar-datos.sql`) o sin conexión, abrir/guardar estos flujos lanza TypeError y puede dejar el script muerto.
- **Arreglo:** guard clause al inicio de cada open/save: si no hay animales elegibles, snack "no hay animales registrados" y return.

---

## 🟠 SEVERIDAD MEDIA — integridad, consistencia, UX

### M1 · Faltan CHECKs de dominio en la BD
- **Dónde:** `schema.sql` — `ordenos.litros` (:122) sin `CHECK (litros >= 0 AND litros < 100)`; `prenez_meses` (:81 y palpaciones :139) sin `CHECK BETWEEN 0 AND 9.5`; `peso_kg` (:89,154) sin `> 0`; `dias_retiro` (:172) sin `>= 0`; sin `fecha <= hoy_finca()` en eventos ni `nacimiento <= hoy_finca()`; `vacunaciones.alcance` (:188) y `movimientos_potrero.tipo` (:222) TEXT libres sin CHECK.
- **Impacto:** un litro 999 por error de dedo envenena promedios; `prenez_meses=15` da parto estimado en el pasado; fechas futuras dan DEL/edad negativos.
- **Arreglo:** una sola migración de constraints con `NOT VALID` + `VALIDATE CONSTRAINT` para no chocar con datos existentes. El cliente también debe validar (ver M13).

### M2 · FKs de `partos` y genealogía sin política ON DELETE coherente
- **Dónde:** `schema.sql:150-151` (`partos.madre_id/cria_id` = NO ACTION), `:85-86` (`animales.madre_id/padre_id` = NO ACTION), vs ordeños/tratamientos/palpaciones que sí CASCADE.
- **Impacto:** `deleteAnimal` sobre una vaca con partos o crías falla con error de FK crudo que la UI no traduce; mientras que el histórico productivo (ordeños) se borra en CASCADE sin aviso. Política incoherente.
- **Arreglo:** `partos.cria_id ON DELETE SET NULL`, `animales.madre_id/padre_id ON DELETE SET NULL`; `partos.madre_id` mantener RESTRICT pero capturar el error en la UI ("dale de baja en vez de borrar").

### M3 · UNIQUEs que faltan
- **Dónde:** `schema.sql:126` — `UNIQUE(animal_id,fecha,turno)` con `turno` NULLABLE (dos NULL no chocan → duplicados posibles vía importación); `partos` sin `UNIQUE(cria_id)` (una cría puede figurar en dos partos e inflar el conteo de la vista).
- **Arreglo:** `ALTER COLUMN turno SET NOT NULL DEFAULT 'dia'` y `UNIQUE (cria_id) WHERE cria_id IS NOT NULL` en partos.

### M4 · `updateAnimal` exportado borra campos (rellena con null lo ausente)
- **Dónde:** `store.js:163-168` + `animalToDB` `:91-109`.
- **Impacto:** `updateAnimal(id,{nombre:'X'})` vacía nota, color, nacimiento, peso, lactancia, madre/padre… Hoy la UI solo usa `updateAnimalCampos` (seguro), pero la función peligrosa está en el API público.
- **Arreglo:** quitar `updateAnimal` del API o reimplementarla filtrando claves `undefined`.

### M5 · Carrera en `_animCache` + fallback que enmascara errores
- **Dónde:** `store.js:120-129`.
- **Impacto:** una lectura en vuelo puede repoblar la caché con datos pre-escritura (pantalla muestra estado viejo tras guardar, hasta 3 s). Y si `v_animales` da *cualquier* error, cae en silencio a la tabla `animales` sin derivados (DEL/leche/partos = undefined) en vez de fallar visiblemente.
- **Arreglo:** cachear la Promise con token de generación (invalidar = subir generación); restringir el fallback al error 42P01 ("relation does not exist").

### M6 · Cargadores async en carrera al arranque
- **Dónde:** `app.js:753-806` (`cargarReproMovil` lee `animalesPorIdM` que llena otra IIFE — si repro gana la carrera, KPIs=0%); escritorio tiene ~8 IIFEs paralelas con dependencias implícitas (`milkCows`/`hato`/`ordenosDiaMap`).
- **Arreglo:** un `init()` único con `await Promise.all([...])` y render al final; o en el caso móvil, usar la variable local `animales` que ya tiene.

### M7 · Cachés locales desactualizados tras acciones → pantallas contradictorias
- **Dónde:** `saveParto` escritorio (`escritorio.js:2249-2267`) no actualiza `animalesPorId` ni `_partosRaw/_ultimoParto/_partosPorMadre`; `saveBaja` (`escritorio.js:2503`) no quita de `animalesPorId`; baja móvil (`app.js:1092-1094`) no quita del drill-down de grupos; trata móvil (`app.js:929`) no refresca la lista de tratamientos.
- **Impacto:** KPIs, alertas y fichas muestran el estado anterior hasta recargar la página.
- **Arreglo:** tras cada acción, actualizar el caché canónico o hacer re-fetch dirigido (invalidar y recargar la entidad tocada).

### M8 · Lecturas sin paginar: el histórico se corta en 1000 filas
- **Dónde:** `store.js:276-281` (`getOrdenos`) y `getPartos/getPalpaciones/getVacunaciones/getTratamientos`.
- **Impacto:** mismo límite PostgREST que A2 — a los pocos meses, el histórico de producción de la UI muestra un subconjunto arbitrario.
- **Arreglo:** filtrar por rango (`.gte('fecha', inicioDelAño)`) según lo que cada pantalla necesita, y/o paginar.

### M9 · `HOY_LC` congelado + zona horaria del dispositivo
- **Dónde:** `app.js:287`, `escritorio.js:1891` (`const HOY_LC=new Date()` al cargar; `isoHoy()` deriva de ahí con TZ del dispositivo).
- **Impacto:** una pestaña abierta de un día para otro registra con fecha de ayer; y `isoHoy()` (TZ dispositivo) puede diferir de `hoyFinca()` (America/Bogota) que usa store.js.
- **Arreglo:** función `hoy()` evaluada al momento de usarse, delegando en `hoyFinca` del store (exportarla del API).

### M10 · Sin edición/borrado de registros históricos
- **Dónde:** no hay UI para corregir un parto/palpación/tratamiento/vacunación ya guardados; el store tiene `deleteParto/deletePalpacion/deleteVacunacion` pero solo los usa el undo de 5 segundos.
- **Arreglo:** acción "corregir / eliminar" en los historiales del escritorio (con confirmación).

### M11 · Brecha de capacidades móvil vs escritorio
- **Faltan en móvil:** terminar tratamiento, historial de palpaciones, palpación con nota del veterinario (parser solo escritorio), vacunación con fecha/próxima, alta completa (nacimiento/madre/partos históricos; el alta móvil ni pide nombre), respaldo/restauración, exportes CSV, corrección de días pasados.
- **Arreglo:** documentar la matriz de capacidades y cerrar las críticas de campo primero: terminar tratamiento y corregir ordeños de días pasados.

### M12 · Estados de carga mentirosos (vacío = ¿sin datos o sin red?)
- **Dónde:** `escritorio.js:317,1265`, `app.js:343` — antes de resolver los fetch se pinta "No hay vacas…" idéntico a una finca vacía; los errores de red solo van a `console.warn`.
- **Arreglo:** estado "cargando…" explícito y banner visible si LCStore falla (con botón reintentar).

### M13 · Validaciones de formulario incompletas e inconsistentes
- **Dónde:** fechas futuras aceptadas en parto/palpación (`partoFecha`, `palpFecha` sin `max`); litros: tope 60 en modal escritorio, sin tope en tabla semanal, tope 99 (keypad) en móvil; `registrarOrdeno` (store.js:251) acepta NaN/negativos; alta móvil sin nombre.
- **Arreglo:** `max=hoy` en todos los date inputs; validación única de litros (0–?) compartida en core; `Number()`+rechazo de NaN en store.

### M14 · Duplicación masiva móvil/escritorio que ya divergió
- **Dónde:** pares casi idénticos con sufijo M: `deriveReproFicha(M)`, `renderSanCalendario(M)`, `renderSanProxima(M)`, `PROTOCOLO_SAN(_M)`, `fmtNacimiento(M)`, `isoHoy(M)`, flujos completos de parto/palpación/seca/baja. Divergencias reales ya visibles: chips de problema distintos, undo con/sin reversa, validación de litros distinta.
- **Arreglo:** extraer a `core/acciones.js` las derivaciones y los flujos de guardado (con su undo/compensación); las páginas solo pintan.

### M15 · Dependencia del CDN sin versión fija, sin SRI, sin fallback
- **Dónde:** `index.html:753`, `escritorio.html:406`, `conexion.html:31` — `supabase-js@2` flotante desde jsdelivr.
- **Impacto:** una minor nueva del SDK puede romper la app sin que nadie tocara el repo; sin internet la app abre en blanco silencioso (contradice el objetivo de campo).
- **Arreglo:** vendorizar supabase-js en el repo con versión fijada (p.ej. `core/vendor/supabase-2.x.x.js`); considerar PWA básica (manifest + service worker) para carga sin señal.

### M16 · Sin cache-busting: usuarios pueden ejecutar JS viejo contra esquema nuevo
- **Dónde:** `index.html:754-756`, `escritorio.html:407-409` — `app.js`, `escritorio.js`, `core/*.js`, CSS sin `?v=`.
- **Arreglo:** query param de versión (`app.js?v=N`) actualizado en cada deploy, o hash en el nombre.

### M17 · Operación: sin respaldo automático; el free tier de Supabase se pausa
- **Dónde:** no hay job de respaldo en el repo; plan free = sin backups automáticos, y el proyecto se **pausa tras ~7 días sin actividad** (la app aparecería "caída").
- **Arreglo:** GitHub Action semanal que exporte los datos (paginado) a un artefacto o repo privado + un ping programado para evitar la pausa.

### M18 · Bordes de `parto_estimado_calc` / `secar_calc` (round de meses)
- **Dónde:** `schema.sql:314-317` — `round(9 − prenez_meses)::int * INTERVAL '1 month'`.
- **Impacto:** con 6,5 meses el round da error sistemático de ±15 días (diferencia entre secar a tiempo o no); con ≥8,5 meses `secar_calc` queda en el pasado sin señal.
- **Arreglo:** calcular en días: `ultima_palpacion + ((9 − prenez_meses) * 30.44)::int`, coherente con `prenez_meses_actual`. Nota: `rules.js` (`fechaParto`) duplica este cálculo con otra fórmula — unificar para que la UI use siempre el valor de la vista (ver B6).

### M19 · Animales sin `nacimiento` no envejecen
- **Dónde:** `schema.sql:72-73` + `store.js:65` — sin `nacimiento`, la edad cae a `edad_anios`, foto congelada del momento del import.
- **Impacto:** en un año, edades, destete próximo (umbral 0,58 años) y clasificación levante/novilla estarán corridos.
- **Arreglo:** al importar/crear, derivar `nacimiento ≈ hoy − edad_anios*365.25` y tratar `edad_anios` solo como respaldo.

### M20 · Accesibilidad básica ausente
- **Dónde:** modales/sheets sin `role="dialog"`/foco/Escape; inputs sin `<label>` (solo placeholder); botones de icono sin `aria-label` (FAB, keypad ⌫); contraste `--ink-3` #A8ACA0 ≈ 2.2:1 en textos de 10-11.5px (`styles.css:11`).
- **Arreglo:** pasada de aria/labels + subir `--ink-3` a ~#8a8e82 + cierre con Escape en todos los modales.

---

## 🟡 SEVERIDAD BAJA — pulido, deuda técnica

- **B1 · `animales.id` TEXT sin validación** (`schema.sql:63`): acepta `''`, espacios; `'t01'`≠`'T01'`; ids JS `'T-'+Date.now()` chocan si dos dispositivos registran en el mismo ms. → CHECK de formato + sufijo aleatorio.
- **B2 · Matching de vaca por `startsWith`** (`app.js:819-820,896,903,925,973,1072,1090`): id `10` matchea `104`. → comparar `numDe()` exacto.
- **B3 · Animales creados en móvil no clicables** hasta recargar (`app.js:670,1044`, flag `0`). → flag `1`.
- **B4 · Undo de alta reusa IDs** (`app.js:1058`: `altaSeq--` tras otra alta → PK duplicada). → recalcular siguiente libre desde `animalesPorIdM`.
- **B5 · Índice compuesto faltante en ordenos**: crear `(animal_id, turno, fecha DESC)` — sirve al upsert y al `leche_ultima` de la vista. A 2-3 años (~30k filas) se nota.
- **B6 · Dos fórmulas para el parto estimado**: `rules.js:35` (`fechaParto`, además con año 2026 hardcodeado — en 2027 el formato de fechas cambia) vs `v_animales.parto_estimado_calc`. → UI siempre lee la vista; parametrizar el año.
- **B7 · Código muerto/confuso**: fallbacks de columnas eliminadas en `animalFromDB` (`store.js:57-64`: `r.del`, `r.leche_ayer`…); `diaOverrides/editDiaCell` descableado (`escritorio.js:636-664`); `fichas={}` siempre vacío pero se escribe en él (`escritorio.js:1505,2149`); `secaInfo/secaNoAplica/partoInfo` móviles ahora siempre vacíos (candidatos a eliminarse con su lógica).
- **B8 · Edge function `login-pin` huérfana con debilidades** (`supabase/edge-functions/login-pin/index.ts`): JWT_SECRET cae a la service_role key, rate-limit burlable por `device_id` del cliente, mensajes que permiten enumerar usuarios. → archivar hasta que vuelva el login; corregir antes de desplegar.
- **B9 · `GRANT ALL` incluye `profiles`/`outbox`/`login_attempts`** (`schema.sql:336-339`): hashes de PIN legibles con la anon key. → `REVOKE` sobre esas tablas.
- **B10 · Comentario del esquema miente sobre `turno`** (`schema.sql:123` dice am/pm/null; el código usa `'dia'` y las vistas filtran `turno='dia'` — un dato am/pm sería invisible). → actualizar comentario + CHECK + decidir agregación am+pm.
- **B11 · Snacks se pisan** (un solo `snackTimer`): el "Deshacer" puede ser tapado por el snack siguiente (p.ej. `escritorio.js:487`). → cola de snacks o no pisar los que tienen acción.
- **B12 · Snack ruidoso al cargar** (`escritorio.js:1975` "Hato actualizado desde la base (N)" en cada apertura). → mostrar solo en la primera carga o quitar.
- **B13 · `cargarPotrerosDesdeSupabase` corre aunque `POTREROS_VISIBLE=false`** (`escritorio.js:2541`) y `renderPotreros` conserva textos tipo "día 2" (`escritorio.js:2529,2535`). → condicionar a la bandera; derivar textos de datos.
- **B14 · CSS duplicado** entre `styles.css` y `escritorio.css` (tokens, chips, badges, snackbar). → extraer `core/tokens.css`.
- **B15 · Archivos monolíticos en scope global**: `escritorio.js` 2550 líneas, `app.js` 1120; colisiones ya obligan a sufijos `M` y cuidado con TDZ. → ES modules por página (sin bundler es viable con `<script type="module">`).
- **B16 · Un solo test** (`test/smoke.js`, contratos en Node); cero pruebas de UI y sin CI que lo corra. → GitHub Action que ejecute el smoke + un smoke de DOM con Playwright (ya vendorizado en el repo de trabajo).
- **B17 · `model.js` confunde**: dataset demo interno (Lucero, `hoy:'2026-06-13'`) que ya NO se carga en la app — es fixture del smoke test. → renombrar a `test/fixtures/model.js` o comentar en cabecera "solo tests".
- **B18 · README desalineado con la realidad**: promete offline-first (no hay), multi-rol (no hay login), 5 unidades productivas (solo leche está viva), potreros con aforo (pantalla placeholder). → sección "estado actual vs visión".
- **B19 · Deploy atado a la rama de trabajo** (`.github/workflows/pages.yml` publica desde `claude/youthful-cannon-l903re`): cualquier push publica a producción sin revisión. → rama `main` como fuente de Pages + PRs.

---

## ⚠️ Pendientes operativos del dueño (no son código)

1. **Correr en Supabase SQL Editor** (en este orden, si no se ha hecho):
   `migracion-vacunaciones.sql` → `migracion-zona-horaria.sql` → opcionalmente `limpiar-datos.sql` (borra TODOS los datos; hacer respaldo antes — y ojo con A2: el respaldo actual trunca a 1000 filas).
2. **No correr `migracion-color.sql` ni `migracion-desnormalizar.sql` de nuevo** — ya aplicadas y la primera es destructiva fuera de orden (A4).
3. Configurar respaldo externo periódico (M17) mientras A2/A3 no estén arreglados.

## 🗺️ Orden de trabajo sugerido

| Fase | Ítems | Por qué primero |
|---|---|---|
| 1. Red de seguridad | A2, A3, M17 | Sin respaldo confiable, cualquier otro error es irreversible |
| 2. Instalabilidad | A4, A5 | Poder reconstruir la base desde el repo |
| 3. No perder registros | A6, A9, A10, A7 (u honestidad en el copy), A11 | Integridad de lo que se captura en campo |
| 4. Seguridad | A8 (esc), A1 (auth+RLS), B8, B9 | El XSS es barato de arreglar; auth es proyecto aparte |
| 5. Integridad BD | M1, M2, M3, M18, B5, B10 | Una sola migración de constraints |
| 6. Consistencia UI | M5, M6, M7, M9, M12, M13 | Estado consistente sin recargar |
| 7. Producto | M10, M11, M8, M20 | Capacidades que faltan |
| 8. Deuda técnica | M14, M15, M16, B* | Mantenibilidad a futuro |

> **Regla al arreglar:** verificar SIEMPRE en navegador real (headless sirve) las
> dos superficies + `node prototipo/test/smoke.js`; para SQL, validar en un
> Postgres local antes de tocar la base viva. Mantener el principio de
> "derivar, no guardar" y la zona horaria de la finca.
