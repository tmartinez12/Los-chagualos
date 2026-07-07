# GAPS.md — Auditoría sin anestesia

> Estado real del proyecto a julio 2026, DESPUÉS de tres rondas de correcciones
> (ver `AUDITORIA.md` para el historial). Esto es lo que sigue mal, frágil o
> feo, dicho sin diplomacia. Complementa a `AUDITORIA.md`: aquello es el
> inventario de arreglos; esto es la foto cruda de las debilidades que quedan.

---

## 1. Deuda técnica

**La arquitectura de estado del frontend es contabilidad manual.** No hay una
fuente de estado: el escritorio mantiene en paralelo `hato`, `animalesPorId`,
`milkCows`, `ordenosDiaMap`, `_partosRaw`, `_ultimoParto`, `_partosPorMadre`,
`partosRecientes`, `proximosPartos`, `vacasVacias`, `tratamientos`,
`_palpaciones`, `_vacunaciones` — y cada acción (parto, baja, secado) debe
acordarse de actualizar **cada uno a mano**, y su "Deshacer" de revertirlos a
mano. Los parches de M7 taparon los huecos conocidos, pero el patrón garantiza
que la próxima feature olvide alguno. La solución real es un estado único con
re-render (o re-fetch dirigido), no más parches.

**Los flujos de guardado siguen duplicados móvil/escritorio.** `saveParto`,
`savePalp`, `saveSeca`, `saveBaja`, `saveMilk`, `saveTrata` existen dos veces
con la misma coreografía (estado local → BD → snack con undo → compensación) y
detalles distintos. Ya se unificaron las derivaciones (`deriveReproFicha`,
`fmtNacimiento`, `PROTOCOLO_SAN`), pero el corazón — las acciones — no.
Cada bug de consistencia se arregla dos veces o queda a medias (M14 sigue
"parcial" por esto).

**Archivos monolíticos en scope global.** `escritorio.js` ~2.650 líneas,
`app.js` ~1.250, cero módulos, todo en `window`. Las colisiones ya obligaron a
la convención del sufijo `M` y a comentarios anti-TDZ. Un typo en un nombre
global no falla: pisa.

**`onclick` en strings por todas partes.** Los handlers se arman concatenando
HTML (`onclick="openCow('...')"`) en vez de listeners. Es la razón por la que
el XSS solo está mitigado a medias (ver §4) y hace imposible una CSP estricta.

**Duplicación de conocimiento del esquema en 3 lugares.** La lista de tablas y
columnas vive en `schema.sql`, en `store.js` (`TABLAS_RESPALDO` +
`COLUMNAS_RESPALDO`) y en `.github/scripts/respaldo.js` (`TABLAS`). Agregar
una columna exige tocar tres archivos; olvidarlo no da error, da un respaldo
incompleto en silencio.

**Código muerto y fantasmas restantes:** `fichas={}` en escritorio (siempre
vacío pero `saveTrata`/`aplicarTratamientos` le escriben historia que nadie
lee); `diaOverrides`/`editDiaCell` descableados; `partoInfo={}` móvil (siempre
vacío); la edge function `login-pin` huérfana con debilidades conocidas (B8);
`PLAN-arquitectura.md` y `PLAN-backend.md` describen un diseño que ya divergió
de la realidad. `estadoBase()` está copiada idéntica en los dos JS (ironía:
se creó para un fix y nació duplicada).

**Cache-busting manual.** `?v=20260707` hay que acordarse de subirlo en cada
deploy. El día que se olvide, los usuarios ejecutan JS viejo contra la BD
nueva y nadie se entera.

## 2. Cobertura de tests — casi cero

**Hay UN test (`prototipo/test/smoke.js`) y es estático.** Verifica que los
exports existen, que las columnas del seed calzan con el esquema y que las
funciones puras de rules.js responden. **No ejecuta ni un solo flujo real.**
El CI (nuevo) corre sintaxis + ese smoke. Nada más.

**Rutas críticas SIN NINGÚN test:**
- `registrarPartoCompleto` (RPC + fallback) — el flujo más complejo de la app.
  Se probó a mano contra Postgres local una vez; ninguna regresión lo atrapará.
- Todas las compensaciones de "Deshacer" (leche/trata/seca/baja/parto ×2
  superficies). Es exactamente el tipo de lógica que se rompe al refactorizar.
- `exportarTodo`/`restaurarTodo` — la red de seguridad de la finca no tiene
  test. Un bug aquí = pérdida de datos real.
- La paginación (`_paginado`, `_bajarTablaCompleta`) — nadie probó qué pasa con
  exactamente 1000/1001 filas.
- Los cálculos de la vista SQL (edad, DEL, retiro, secar en días) — validados a
  mano en la sesión, sin arnés repetible.
- Idempotencia de migraciones — se probó manualmente; el CI no lo hace.
- `esc()`/XSS — sin test de regresión; el próximo `innerHTML` nuevo entra sin
  escape y nadie lo nota.
- El workflow `respaldo.yml` nunca ha corrido de verdad (se escribió y pusheó;
  la primera ejecución real será en producción — eso no es un plan de respaldo,
  es una esperanza). **Dispararlo a mano una vez (workflow_dispatch) es urgente.**
- Cero tests de DOM/UI en ambas superficies (hay Playwright vendorizado en el
  entorno de desarrollo; no se dejó ningún test escrito).

## 3. Bordes frágiles

- **Concurrencia entre dispositivos: last-write-wins sin detección.** Dos
  teléfonos editando la misma vaca se pisan sin aviso (`updateAnimalCampos` no
  compara `updated_at`). El upsert del ordeño sobrescribe el litro del otro
  ordeñador en silencio (es "corrección", pero nadie se entera de que pasó).
- **IDs por `Date.now()`.** `'P-'+Date.now()`, `'T-'+Date.now()`: dos
  dispositivos en el mismo milisegundo = colisión de PK. Improbable, no
  imposible; sin sufijo aleatorio (B1 sigue abierto).
- **Secuencias locales de chapeta.** `criaNum`/`altaSeq` se siembran del máximo
  al cargar: dos teléfonos abiertos a la vez asignan el MISMO número a dos
  crías distintas; el segundo insert falla y el flujo local ya avanzó.
- **La ventana de "Deshacer" (5s) vs red lenta.** Las compensaciones esperan
  `pSave.then(...)`, pero si el guardado FALLÓ, el undo igual dispara deletes
  sobre filas que no existen (inofensivo hoy, ruido en consola, frágil mañana).
- **`restaurarTodo` sigue siendo merge no-transaccional** (A3 parcial): fallo a
  mitad = base mezclada; filas creadas después del respaldo sobreviven a la
  "restauración". Y no hay límite de tamaño: un .json gigante congela la pestaña.
- **Offline sigue sin existir.** El contador "pendientes" es un entero en RAM
  que muere al recargar. El copy ya es honesto, la capacidad sigue faltando
  (README lo promete como visión).
- **Escala:** `v_animales` corre 4 subconsultas correlacionadas por animal en
  cada carga (mitigado con índice, no medido con volumen real); `getAnimales()`
  baja el hato completo con caché de solo 3s — con 200+ animales y varias
  pantallas, eso es re-descargar todo constantemente.
- **Reloj del dispositivo.** El CHECK bloquea fechas futuras (>hoy+1), pero un
  celular con fecha atrasada registra ordeños de "ayer" sin ninguna alerta.
- **`getOrdenosFecha`/semana** asumen `turno='dia'` en todo; si algún día se
  usan am/pm (el CHECK los permite), producción mensual y "última leche" los
  ignoran silenciosamente (B10 documentado, no resuelto de fondo).

## 4. Seguridad

| Severidad | Problema |
|---|---|
| **CRÍTICA** | **Sin autenticación + RLS desactivado + `GRANT ALL` a `anon` + anon key pública en el repo.** Cualquiera con la URL lee, modifica o borra TODO (incluye `restaurarTodo` y `deleteAnimal`). Todo lo demás de esta tabla es secundario frente a esto. Mitigación actual: oscuridad de la URL + respaldos 2×/semana. (A1) |
| **ALTA** | **XSS mitigado solo a medias.** `esc()` cubre listas/fichas/tablas principales, pero quedan `innerHTML` sin escapar (p.ej. mensajes de `snack()` que interpolan nombres, headers de grupos) y todos los `onclick` en strings interpolan ids sin sanear. Con la BD abierta a escritura anónima (fila de arriba), esto es explotable en cadena: quien escribe un nombre malicioso en la BD ejecuta JS en el navegador de la administradora. (A8 parcial) |
| **MEDIA** | La anon key no se puede rotar sin redesplegar (está en `store.js` y `respaldo.js`, hardcodeada dos veces). |
| **MEDIA** | `restaurarTodo` acepta cualquier JSON del disco del usuario: valida estructura, no contenido semántico ni tamaño. Un archivo manipulado puede reescribir el hato entero (aunque con la BD abierta, el atacante no necesita este vector). |
| **MEDIA** | `login-pin` (edge function huérfana): si alguien la despliega tal cual, JWT firmado con la service_role key por defecto, rate-limit burlable por `device_id` del cliente, enumeración de usuarios. Archivar o arreglar antes de usar. (B8) |
| **BAJA** | Sin CSP (imposible con los `onclick` inline actuales). Sin límites de tasa en nada. Los artefactos de respaldo en GitHub Actions son visibles para cualquiera con acceso al repo — verificar que el repo sea privado. |

## 5. Inconsistencias internas

- **Tres representaciones del mismo enum `grupo`.** La BD usa `'ordeño'` (con
  ñ); el escritorio guarda en sus filas locales el DISPLAY (`'En ordeño'`) y
  lo mapea de vuelta con `GRUPO_MODELO`; el móvil usa claves propias
  (`'ordeno'` sin ñ) vía `GRUPO_KEY`. `_normGrupo()` en store.js existe solo
  para sobrevivir a esta torre de Babel.
- **Cinco formatos de ID conviviendo:** chapetas numéricas `'042'`, toros
  `'T01'`, UUIDs (ordeños/palpaciones/vacunaciones), `'P-'+timestamp` (partos
  de la app), `'P-hist-*'` (partos de migración). Ninguna validación los
  distingue; el CHECK de formato solo aplica a `animales.id`.
- **Español e inglés mezclados sin criterio:** `saveParto` pero
  `registrarParto`, `cow` pero `vaca`, `hato` pero `milkCows`,
  `guardarCeldaSemana` pero `renderMilk`. Duplica la carga mental de buscar
  algo por nombre.
- **Tres nociones de "hoy":** `HOY_LC` (congelado al cargar, aún usado en
  cálculos de meses), `isoHoy()` (ahora delega en la finca), `hoyFinca()`
  (canónica). La recarga a medianoche lo mitiga, pero tres verdades siguen ahí.
- **Manejo de errores no uniforme:** la mayoría de catches ya muestran snack
  honesto, pero quedan `console.warn` mudos (compensaciones de undo, potreros,
  vacunaciones al cargar) y estilos distintos de mensaje.
- **Dos sistemas de diseño CSS.** `styles.css` y `escritorio.css` repiten
  tokens y componentes (chips, badges, snackbar) con valores que ya divergieron
  una vez (el contraste se corrigió en ambos a mano — otra vez contabilidad
  manual).
- **Convención `M` a medio camino:** tras extraer las derivaciones a rules.js,
  quedan pares `renderSanCalendario/renderSanCalendarioM`, `isoHoy/isoHoyM`,
  `snapshotReproDB/M`, etc. Mitad compartido, mitad clonado — el peor punto
  intermedio para navegar el código.
- **Documentación que se contradice:** README ya tiene la sección "estado
  actual vs visión" (bien), pero `PLAN-arquitectura.md` y `PLAN-backend.md`
  siguen describiendo `core/actions.js` (no existe), auth por PIN (no existe)
  y outbox (no existe) como si fueran el plan vigente.

---

## Si solo se pueden hacer tres cosas

1. **Auth + RLS** (la fila CRÍTICA). Todo lo demás es decorar una casa sin puerta.
2. **Disparar `respaldo.yml` a mano hoy** y verificar el artefacto — la red de
   seguridad nunca ha corrido.
3. **Un test de integración real** (Postgres local + los 6 flujos de guardado
   con sus undos) antes del próximo refactor, porque el patrón de estado manual
   (§1) garantiza regresiones y hoy nada las detendría.
