# Auditoría UX/UI — Ficha del animal (ambas superficies)

> Julio 2026. Método: render en Chromium de `pg-vaca` (escritorio, 1280px) y
> `scr-vaca` (móvil, 440px) con un animal completamente poblado (preñada 3m,
> 3 partos, palpaciones, tratamiento terminado, vacuna, nota de manejo,
> etapas). Solo hallazgos — sin cambios de código.

## Orden actual de las secciones

| # | Escritorio | Móvil |
|---|---|---|
| 1 | Barra: Volver · Editar · ← vaca → · **＋ Registrar evento** | Hero (foto · nombre · **Editar**) |
| 2 | Hero (foto · nombre · raza/edad/grupo) | Alerta repro (con CTA "Programar secado") |
| 3 | Alerta repro (sin CTA) | KPIs ×4 (ordeño · DEL · **peso** · partos) |
| 4 | KPIs ×4 (ordeño · DEL · **días abiertos** · partos) | Datos/genealogía |
| 5 | Datos/genealogía · Etapas (línea suelta) | Etapas (línea suelta) |
| 6 | Sanidad (estado + historial) | Curva de lactancia |
| 7 | Curva de lactancia | Sanidad |
| 8 | Tabla: producción por lactancia | **Historia** (timeline unificada) |
| 9 | Tabla: producción mensual | **CTA "＋ Registrar evento" (al FONDO)** |
| 10 | Tabla: partos · Tabla: palpaciones | (FAB "+" global flotante, tapa la curva) |

---

## Hallazgos, por prioridad

### P1 · CTAs en conflicto o fuera de alcance

1. **Móvil: el CTA principal está al fondo de todo.** "＋ Registrar evento en
   esta vaca" queda después de la historia completa — hay que scrollear toda
   la ficha para registrar algo. Y además convive con el **FAB "+" global**
   (que abre el menú general, no el de esta vaca), que **tapa la esquina de
   la curva de lactancia**. Tres problemas en uno: CTA lejos del pulgar,
   duplicación de "+", y oclusión de contenido.
   *Propuesta:* dentro de la ficha, el FAB pasa a ser contextual (abre el
   menú de ESTA vaca) y se elimina el botón del fondo — un solo "+", siempre
   visible, siempre contextual.
2. **Escritorio: dos "＋ Registrar" apilados.** El top bar global tiene
   "＋ Registrar" y 40px más abajo la ficha tiene "＋ Registrar evento" —
   idéntico verbo, distinto alcance (general vs. esta vaca). Confusión
   directa sobre cuál usar.
   *Propuesta:* dentro de la ficha, renombrar el contextual a
   "＋ Evento de {nombre}" (o atenuar el global mientras hay ficha abierta).

### P2 · Agrupación: la reproducción quedó partida (escritorio)

3. La pregunta reproductiva se responde arriba (alerta "Preñada · 3 meses"),
   pero su evidencia —**partos y palpaciones— está al fondo, después de DOS
   tablas de producción**. Quien abre la ficha por reproducción salta toda la
   sección de leche. El móvil resuelve esto mejor con una "Historia" única.
   *Propuesta:* juntar Partos + Palpaciones inmediatamente después de la
   curva (o colapsar "Producción mensual", ver #4), manteniendo el orden
   producción-primero que refleja el uso diario.
4. **"Producción mensual" crece sin tope.** Tabla siempre expandida; con
   años de datos serán 12+ filas por año. Ya existe el selector de año
   global, pero aun así es la sección menos consultada ocupando el centro.
   *Propuesta:* colapsable ("Ver detalle mensual") o límite con "ver más".
5. **La mitad de la ficha es irrelevante para quien no ordeña.** Para una
   cría, novilla o macho: curva de lactancia + 2 tablas de leche + KPI de
   ordeño = ~50% de la ficha vacía o sin sentido.
   *Propuesta:* ocultar el bloque de producción cuando `grupo` no es
   ordeño/horra (la horra conserva su historial de lactancias).

### P3 · Duplicaciones y ruido

6. **Título de página y hero repiten lo mismo** (escritorio): "Ficha: 042 ·
   Lucero / Jersey · 5,2 años · En ordeño" y 30px abajo "042 · Lucero /
   Jersey · Café claro · 5,2 años · En ordeño · Nació en finca".
   *Propuesta:* dejar el título de página genérico ("Ficha del animal") y
   que el hero sea la única identidad — o al revés.
7. **KPI "Días abiertos: —" cuando está preñada** (escritorio): un guión no
   informa. *Propuesta:* KPI condicional — preñada → "Parto en ~N días";
   vacía → días abiertos.
8. **KPIs inconsistentes entre superficies:** escritorio muestra días
   abiertos; móvil muestra peso (que ADEMÁS se repite en la card de datos).
   *Propuesta:* mismo set en ambas; peso solo en datos.
9. **"Crías: sin crías registradas"** (móvil) — línea negativa vacía; el
   escritorio ya aplica "solo lo que existe". *Propuesta:* ocultarla.
10. **"Etapas:" es una línea huérfana** entre dos cards (ambas superficies)
    — sin card, sin section-label, parece un descuido. *Propuesta:* moverla
    dentro de la card de datos, o como primer evento de la Historia (móvil).
11. **La nota de manejo se pierde.** "patea al ordeño" es información de
    seguridad para quien ordeña, y hoy es el último fragmento de una línea
    de datos. *Propuesta:* badge visible junto al estado (⚠ nota de manejo)
    o en el hero.
12. **Copy interno visible** (móvil): el subtítulo "Se consulta mucho, se
    edita poco" es una nota de diseño, no información para la usuaria.
    *Propuesta:* reemplazar por algo útil (grupo · DEL) o quitar.
13. **Inconsistencias menores entre superficies:** la alerta de preñada
    tiene CTA "Programar secado" en móvil pero no en escritorio; sanidad va
    antes de la curva en escritorio y después en móvil. *Propuesta:* unificar
    (CTA de secado también en escritorio; sanidad en la misma posición).

## Lo que ya está bien (no tocar)

- Estado reproductivo arriba: es LA pregunta al abrir una ficha. ✓
- La "Historia" unificada del móvil (timeline con partos/palpaciones/
  tratamientos/vacunas mezclados por fecha) es el patrón correcto — el
  escritorio debería aprenderle, no al revés.
- Navegación ← anterior / siguiente → entre vacas (escritorio). ✓
- Curva de lactancia con "hoy" marcado y curva típica de referencia. ✓
- "solo lo que existe" en la card de datos del escritorio + "completar
  datos" como enlace. ✓
- Volver contextual ("Volver a producción" si venías de leche). ✓

## Orden de ataque sugerido

1. **#1 + #2** (CTAs) — es lo que confunde a diario y es barato.
2. **#3 + #4 + #5** (agrupación/colapso/ocultar por grupo) — reorganización
   media del escritorio.
3. **#6–#13** (limpieza) — una pasada corta de detalles en ambas.
