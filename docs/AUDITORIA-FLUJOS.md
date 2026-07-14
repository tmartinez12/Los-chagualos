# Auditoría de flujos — crear vaca · ficha · editar vaca (+ los demás)

> Julio 2026. Rastreo de punta a punta en ambas superficies (escritorio y
> móvil) + verificación en navegador de la ficha con un animal completamente
> poblado. Referencias: `saveCompra` escritorio.js:2523, `saveAlta` app.js:1110,
> `guardarEditarVaca` escritorio.js:2161, `saveEditVaca` app.js:194,
> ficha escritorio escritorio.js:957/972, ficha móvil app.js:120.

## Veredicto general

- **Crear → ficha (escritorio): coherente.** Todo lo que captura el formulario
  llega a la base (incluidos color, madre validada y las fechas de partos
  históricos, que sí se insertan en la tabla `partos`), y la ficha lo muestra
  de inmediato y tras recargar. Verificado en navegador: la ficha de
  escritorio muestra 11/11 campos de prueba; la móvil mostraba 10/11
  (faltaban procedencia/valor de compra — **ya corregido** en `9ba5fe7`).
- **Editar: ya casi en paridad con crear** (tras el commit `44d794e`), con
  huecos puntuales: sexo y rol de toro no son editables en ninguna parte.
- **El alta móvil es el flujo más pobre** y crea fichas "huérfanas".

## Campos × etapas — los huecos que quedan

| Campo | Problema |
|---|---|
| **sexo** | Se deriva del tipo al crear y NINGÚN editor lo expone: un error de sexo es incorregible desde la UI. |
| **rol_toro** | No hay forma de marcar un toro como reproductor desde ninguna pantalla — la lógica de "hijas del toro" nunca puede activarse. |
| **baja (motivo/fecha/valor/nota)** | Las UIs solo capturan motivo (fecha forzada a hoy: no puedes registrar una muerte de la semana pasada); `baja_valor`/`baja_nota` son columnas que nadie llena; y **ninguna ficha muestra los datos de baja** — el valor de venta se pierde. |
| **partos históricos** | Solo se cargan al CREAR (escritorio); no existe "agregar/corregir parto histórico" desde la ficha. La ficha móvil muestra solo el conteo, no la lista. |
| **inicio_lactancia** | Se edita pero no se VE como fecha en ninguna ficha (solo el DEL derivado). |
| **fecha_peso** | Siempre forzada a hoy: no se puede registrar un pesaje pasado. Ficha móvil no la muestra. |
| **ganancia_dia_g** | Columna muerta: existe en BD y modelo, ninguna UI la muestra, captura ni edita. Implementar (derivarla de pesajes) o eliminarla por migración. |
| **unidad / especie** | Sin UI (multi-finca futura; aceptable por ahora). |

## Problemas priorizados

1. **P1 · Vaca nueva "en ordeño" no entra a la lista de leche.** `saveCompra`
   (escritorio.js:2554-2588) no actualiza `milkCows` y `saveAlta` móvil no toca
   `cows`: la vaca creada no aparece para registrarle ordeño hasta recargar.
   Viola la regla 7 de CLAUDE.md. *(El editor sí lo hace bien — copiar ese patrón.)*
2. **P2 · Alta móvil huérfana.** Sin chapeta manual, sin nombre (queda
   `'(compra)'`), sin nacimiento, sin madre, origen fijo `'comprado'`, sin
   partos históricos → compra en ordeño queda con DEL "—" hasta editarla en
   escritorio. Además `toroSeq` no se re-siembra del máximo real (app.js:421):
   el segundo toro comprado en otra sesión choca la PK con `T01`.
3. **P3 · Baja incompleta e invisible** (ver tabla). Pedir fecha/valor/nota,
   mostrar sección "Baja" en ambas fichas, y una acción "corregir baja" más
   allá del Deshacer de 5 s.
4. **P4 · Sexo y rol_toro incorregibles** (ver tabla).
5. **P5 · Parto solo acepta madres del grupo Horra** (escritorio.js:2316,
   app.js:673): una vaca mal clasificada exige moverla de grupo primero. Y la
   cría no se puede nombrar/numerar en el momento.
6. **P6 · Mensajes engañosos restantes:** `saveCompra` (escritorio.js:2585) y
   `saveSeca` escritorio (2304) aún dicen "guardado local, falta sincronizar"
   — no hay outbox; debe ser el snack honesto "NO se guardó — reintenta".
7. **P7 · Fechas del navegador:** `saveCompra` calcula edad/DEL con
   `new Date()` (escritorio.js:2542,2561) y el "ordeño de ayer" usa hora del
   dispositivo — deben pasar por `hoyFinca()`.
8. **P8 · Ficha móvil pobre vs escritorio:** sin días abiertos, sin fecha de
   peso, sin lista de partos/lactancias, historia casi vacía (3 eventos
   genéricos, app.js:156-163).

## Los demás flujos — fricción y mejora puntual

| Flujo | Fricción hoy | Mejora |
|---|---|---|
| **Ordeño** | Solo fecha de hoy; meter el de ayer es un truco escondido ("leche de ayer" del editor). Topes distintos (60 E / 99 M). | Selector de fecha (máx. hoy) en el modal y tope unificado. |
| **Parto** | Sólido (transaccional, con fecha). Solo madres Horra; cría sin nombre/chapeta elegible. | Campos opcionales de cría; permitir otras madres adultas con advertencia. |
| **Palpación** | Escritorio completo; el móvil no permite fecha ni nota (siempre hoy). | Input de fecha en el sheet móvil; pasar `fecha` a `registrarPalpacion`. |
| **Secado** | Escritorio valida preñez; móvil solo aconseja. El secado no queda en ningún historial (solo borra inicio_lactancia). | Validar igual en móvil; registrar el secado como evento consultable. |
| **Tratamiento** | Escritorio solo trata vacas EN ORDEÑO (una ternera enferma solo se trata desde el móvil); sin fecha de inicio ni texto libre de dosis/nota. | Candidatas = todo el hato; fecha editable; campo libre. |
| **Vacunación** | Móvil sin fecha; ninguna captura `proxima`/`nota` (el store las soporta); animal individual sin validar contra el hato. | Fecha + próxima dosis en ambas; validar el número; mostrarla fechada en la sanidad de la ficha. |
| **Baja** | Ver P3. | Ver P3. |

## Orden de implementación sugerido

1. **P1** (bug real de caché — pequeño y urgente) y **P6/P7** (honestidad y
   hora de la finca — mecánicos).
2. **P2**: llevar el formulario completo de alta al móvil (o mínimo: chapeta,
   nombre, nacimiento, origen).
3. **P3 + P4**: baja completa y visible; sexo/rol_toro editables (escritorio).
4. **P5 + palpación/vacunación móviles con fecha** (paridad de captura).
5. **P8 + partos históricos desde la ficha** (ficha móvil rica).
6. Decidir `ganancia_dia_g` (derivar de pesajes o migración que la elimine).
