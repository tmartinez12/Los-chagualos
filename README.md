# 🌱 Los Chagualos — Sistema de Gestión para Granja Regenerativa

Sistema integral de gestión para una granja regenerativa en Colombia que integra
cinco unidades productivas: **ganadería de leche, potreros, maíz, miel y café**.

> Este documento es el diseño fundacional del producto: visión, arquitectura de la
> información, módulos, modelo de datos y experiencia de usuario.

---

## 1. Visión y principios de diseño

**Visión:** una sola fuente de verdad para toda la finca, donde cada decisión
(qué potrero pastorear, cuándo cosechar café, qué vaca secar) se toma con datos
y no con memoria.

**Principios:**

| Principio | Qué significa en la práctica |
|---|---|
| 📱 **Mobile-first** | El 90% de los registros se hacen en campo, de pie, con una mano, a veces con guantes. Botones grandes, mínimo tipeo. |
| 📴 **Offline-first** | La conectividad rural en Colombia es intermitente. Todo se registra local y sincroniza cuando hay señal. |
| ⚡ **Lo diario toma < 30 segundos** | El registro de todos los días (leche y lluvia) son 1-2 números en total. Punto. |
| 📝 **Registro por excepción** | Si no se anota nada, todo está normal. Solo se registran las *novedades* (una vaca enferma, un celo visto). |
| 🔄 **Visión regenerativa** | No solo producción: el sistema mide salud del suelo, días de descanso de potreros, cobertura vegetal y diversidad. |
| 🇨🇴 **Contexto colombiano** | Unidades locales (litros, arrobas, cargas de café de 125 kg), calendario bimodal de lluvias, normativa ICA, precio de leche por resolución MinAgricultura. |
| 👥 **Multi-rol** | El administrador ve finanzas y reportes; el operario de campo solo ve sus tareas y formularios de captura. |

---

## 2. Usuarios y roles

| Rol | Quién es | Qué necesita |
|---|---|---|
| **Administrador** | Dueño/a de la finca | Panorama completo, finanzas, reportes, decisiones |
| **Mayordomo** | Encargado general | Planear tareas, rotación de potreros, supervisar registros |
| **Operario** | Ordeñador, recolector, apicultor | Capturar datos rápido: ordeño, labores, cosechas |
| **Veterinario / Agrónomo** (invitado) | Asesor externo | Consultar historial sanitario / de lotes, dejar recomendaciones |

---

## 3. Arquitectura de la información

El sistema se organiza en **5 módulos productivos + 4 transversales**:

```
LOS CHAGUALOS
│
├── 🏠 INICIO (dashboard del día)
│
├── MÓDULOS PRODUCTIVOS
│   ├── 🐄 Ganadería de leche
│   │   ├── Hato (fichas de animales)
│   │   ├── Producción (ordeño diario)
│   │   ├── Reproducción (celos, servicios, partos)
│   │   └── Salud (tratamientos, vacunas ICA)
│   │
│   ├── 🌿 Potreros y pastoreo
│   │   ├── Mapa de potreros
│   │   ├── Plan de rotación
│   │   └── Aforos y salud del suelo
│   │
│   ├── 🌽 Maíz (alimento del hato)
│   │   ├── Lotes y ciclos de siembra
│   │   ├── Labores culturales
│   │   └── Cosecha y ensilaje → suplementación de las vacas
│   │
│   ├── 🐝 Miel
│   │   ├── Apiarios y colmenas
│   │   ├── Revisiones
│   │   └── Cosechas de miel
│   │
│   └── ☕ Café
│       ├── Lotes cafeteros
│       ├── Floraciones y cosecha (pases)
│       └── Beneficio (despulpado → fermentación → secado)
│
└── MÓDULOS TRANSVERSALES
    ├── ✅ Tareas y labores (asignación al equipo)
    ├── 📦 Inventario (insumos, herramientas, producto terminado)
    ├── 💰 Finanzas (ingresos/gastos por unidad productiva)
    └── 📊 Reportes y clima
```

**Regla de oro de la IA (arquitectura de la información):** todo registro de campo
pertenece a una *unidad productiva* y a una *ubicación* (potrero o lote). Eso permite
cruzar cualquier dato: "¿cuánto cuesta producir un litro de leche?" o "¿qué lote de
café es más rentable por hectárea?".

### 3.1 El modelo de captura: tres capas

El error clásico de los software de finca es pedir demasiado dato. Con 26 vacas en
ordeño, registrar litros vaca por vaca dos veces al día serían **52 anotaciones
diarias** — nadie sostiene eso más de una semana. Por eso la captura se organiza
en tres capas según su frecuencia real:

```
CAPA 1 · DIARIO (obligatorio, < 30 segundos)
├── 🥛 Leche total del ordeño (1 vez al día): ___ litros (o cantinas de 40 L)
└── 🌧️ Lluvia del día: ___ mm (si llovió)
    → 1-2 números al día. Nada más es obligatorio.

CAPA 2 · POR EVENTO (solo cuando pasa algo)
├── 🐄 Parto, celo visto, servicio, secado, venta, muerte
├── 💊 Tratamiento a un animal (activa periodo de retiro)
├── 🐄 Movimiento del hato a otro potrero
├── 🌽☕🐝 Labores y cosechas
└── 📦 Compra de insumos / venta de producto
    → Se registra en el momento, sobre el animal/lote específico.

CAPA 3 · PERIÓDICO (programado; el sistema lo recuerda con una tarea)
├── 🥛 Pesaje de leche individual: 1 vez al mes (las 26 vacas, ese día sí
│      una por una) → identifica las mejores/peores productoras y
│      sustenta decisiones de secado y descarte
├── ⚖️ Peso/condición corporal de novillas y terneras: mensual
├── 🌿 Aforo de potreros: antes de cada entrada o quincenal
└── 🐝 Revisión de colmenas: cada 15-21 días
    → El sistema genera la tarea y guía la captura ese día.
```

**Por qué funciona:** el dato diario es trivial de llenar (el total que ya miden en
la cantina o el tanque), y el detalle por animal se obtiene del *pesaje mensual* —
la práctica estándar de control lechero — que da suficiente resolución para decidir
sin esclavizar a nadie.

---

## 4. Módulos en detalle

### 4.1 🐄 Ganadería de leche

**El hato se gestiona por grupos, no animal por animal.** Con ~80 animales, la
pantalla principal del hato es un resumen por categoría — el detalle individual
solo se abre cuando hace falta:

```
MI HATO (80)
├── 🥛 Vacas en ordeño ......... 26
├── 🤰 Vacas horras (secas) ....  9
├── 🐄 Novillas de vientre ..... 14
├── 🌱 Hembras de levante ...... 18
├── 🍼 Terneras ................ 11
└── 🐂 Machos / toros ..........  2
```

- Los animales **cambian de grupo automáticamente por eventos**: un parto pasa la
  vaca de "horras" a "ordeño"; un secado la devuelve a "horras"; la edad sugiere
  pasar terneras a levante. Nadie reclasifica a mano.
- **Ficha por animal** (se consulta, casi nunca se edita): número/nombre, foto,
  raza, nacimiento, genealogía (madre/padre), grupo actual y su línea de tiempo
  de eventos.
- **Ordeño diario = 1 número:** se ordeña una vez al día, así que el registro es
  el total de litros (o cantinas) de ese ordeño. El detalle por vaca sale del
  **pesaje mensual** (capa 3), no del día a día.
- **Reproducción por eventos:** celo visto → servicio (monta o IA) → confirmación
  de preñez → parto. El sistema deriva las alertas: secar a los 7 meses de preñez,
  parto próximo, vaca vacía > 120 días posparto.
- **Salud:** tratamientos con **periodo de retiro** (alerta de que la leche de esa
  vaca no se puede vender X días — y descuenta esos litros del estimado de venta),
  ciclos de vacunación ICA (aftosa, brucelosis) y desparasitación por grupo.

**KPIs:** litros totales/día y litros/vaca en ordeño, curva de cada vaca con los
pesajes mensuales, intervalo entre partos, % de preñez, costo por litro.

### 4.2 🌿 Potreros y pastoreo (corazón del modelo regenerativo)

- **Mapa de potreros:** croquis o mapa GPS con área (ha), tipo de pasto, aguadas y cercas.
- **Rotación:** el módulo central. Cada movimiento del hato registra: potrero de
  entrada, fecha, # animales. El sistema calcula **días de ocupación** y
  **días de descanso** de cada potrero y sugiere el próximo (el de mayor descanso
  con aforo suficiente).
- **Aforo:** medición de kg de forraje verde/m² antes de entrar al potrero.
- **Salud del suelo:** registros periódicos de cobertura, presencia de escarabajos
  estercoleros, compactación, materia orgánica (si hay análisis de laboratorio).

**Vista clave (UX):** una grilla de tarjetas de potreros con semáforo:
🟢 listo para pastorear · 🟡 en recuperación · 🔴 ocupado o sobre-pastoreado.

### 4.3 🌽 Maíz — alimento del hato (no se vende)

El maíz de la finca se cultiva **exclusivamente para alimentar las vacas**, así
que el módulo no maneja ventas: es un módulo de **producción de alimento** que
conecta directo con ganadería.

- **Ciclos de cultivo por lote:** semestre A/B (calendario bimodal colombiano),
  variedad, fecha de siembra, densidad.
- **Labores:** preparación, siembra, fertilización (orgánica/mineral), control de
  arvenses y plagas (gusano cogollero). Cada labor registra jornales e insumos → costo.
- **Cosecha y ensilaje:** kg cosechados → entran al **inventario de alimento**
  (silo, maíz molido o forraje verde).
- **Suministro al hato:** el consumo se descuenta del inventario (kg/día estimado
  por grupo, sin pesar baldes), lo que permite proyectar **cuántos días de silo
  quedan** y cuándo hay que sembrar el próximo ciclo para no quedarse sin comida.

**El cruce que importa:** todo el costo del ciclo de maíz se traslada a ganadería
como costo de alimentación → entra al **costo real por litro de leche** y permite
comparar contra comprar concentrado.

### 4.4 🐝 Miel

- **Apiarios** (ubicación, flora cercana — ¡el café y sus floraciones son flujo de néctar!)
  y **colmenas** numeradas con estado: reina (edad, origen), fortaleza, # alzas.
- **Revisiones:** checklist rápido por colmena — postura de reina, celdas reales
  (riesgo de enjambrazón), varroa, reservas, alimentación suministrada.
- **Cosecha:** kg de miel por colmena/apiario, % humedad, lote de envasado para trazabilidad.

### 4.5 ☕ Café

- **Lotes cafeteros:** variedad (Castillo, Cenicafé 1, Geisha…), # árboles, año de
  siembra, altitud, sombrío.
- **Floraciones:** registrar fecha de floración principal → el sistema proyecta la
  cosecha (~32 semanas después) y la ventana de riesgo de broca.
- **Cosecha por pases:** kg de cereza recogidos por lote y por recolector
  (para pago al kilo, práctica estándar en Colombia).
- **Beneficio (trazabilidad por micro-lote):**
  `cereza → despulpado → fermentación (horas) → lavado → secado (días, % humedad) → pergamino seco`.
  El sistema calcula el **factor de rendimiento** (kg cereza → kg pergamino) y
  registra ventas en cargas de 125 kg o como microlotes especiales.

### 4.6 Transversales

- **✅ Tareas:** el mayordomo asigna labores ("mover hato al potrero 7", "revisar
  apiario 2") con fecha y responsable; el operario las ve en su pantalla de inicio
  y las marca con foto opcional.
- **📦 Inventario:** insumos (melaza, sal mineralizada, abonos, medicamentos con
  vencimiento), herramientas y producto terminado (miel envasada, café pergamino).
  Cada labor descuenta inventario automáticamente.
- **💰 Finanzas:** cada ingreso/gasto se etiqueta con unidad productiva y lote/potrero.
  Reporte estrella: **rentabilidad por unidad productiva y por hectárea**.
- **📊 Clima:** registro de lluvia diaria (pluviómetro) — cruza con producción de
  leche, aforos y proyección de cosechas.

---

## 5. Modelo de datos (entidades principales)

```
Finca ─┬─ Ubicacion (potrero | lote_maiz | lote_cafe | apiario)
       │     └─ tiene área, geometría/croquis, estado
       │
       ├─ Animal ──── EventoAnimal (ordeño, celo, servicio, parto,
       │              tratamiento, movimiento de potrero, secado, venta)
       │
       ├─ Colmena ─── EventoColmena (revisión, cosecha, alimentación, división)
       │
       ├─ CicloCultivo (maíz/café, por Ubicacion)
       │     └─ Labor (siembra, fertilización, cosecha…)
       │     └─ LoteBeneficio (solo café: trazabilidad post-cosecha)
       │
       ├─ Tarea (responsable, ubicación, estado, evidencia)
       ├─ ItemInventario ─── MovimientoInventario (entrada/salida, vence)
       ├─ Transaccion (ingreso/gasto, unidad productiva, ubicación)
       └─ RegistroClima (lluvia mm, observaciones)
```

**Patrón clave:** casi todo es un **evento con fecha, autor y ubicación** sobre una
entidad (animal, colmena, ciclo). Esto simplifica la app de captura (un solo motor
de formularios) y hace trivial la línea de tiempo de cualquier cosa: "historia de
la vaca 042", "historia del potrero 7", "historia del lote La Loma".

---

## 6. Diseño UX/UI

### 6.1 Pantalla de inicio (dashboard del día)

```
┌─────────────────────────────────────┐
│ ☀️ Los Chagualos · Jue 12 jun       │
│ 🌧️ Lluvia ayer: 12 mm               │
├─────────────────────────────────────┤
│ ⚠️ HOY (3 alertas)                  │
│ • Vaca 042: secar (parto en 60d)   │
│ • Potrero 4: listo (35d descanso)  │
│ • Retiro leche vaca 017: 2d más    │
├─────────────────────────────────────┤
│ REGISTRO RÁPIDO                     │
│ [🥛 Ordeño] [🐄 Mover hato]         │
│ [🌧️ Lluvia] [✅ Labor]              │
├─────────────────────────────────────┤
│ Leche hoy: 184 L  ▲ 4% vs ayer     │
│ Tareas pendientes: 5                │
└─────────────────────────────────────┘
```

- **Alertas accionables primero** (lo que la finca necesita HOY).
- **Botones de registro rápido**: las 4 capturas más frecuentes a un toque.
- Navegación inferior: `Inicio · Módulos · + Registrar · Tareas · Reportes`.

### 6.2 Flujo estrella: registrar el ordeño del día (< 30 segundos)

1. Toque en **🥛 Ordeño** → un solo campo grande: litros totales de hoy
   (con el valor de ayer visible como referencia y opción de anotar en cantinas).
2. Opcional, solo si pasó algo: botón **"+ Novedad"** para marcar sobre una vaca
   específica mastitis o celo visto en el ordeño — ¡el momento real donde se
   detectan los celos!
3. **Guardar** → muestra la comparación contra ayer y el promedio de la semana;
   queda en cola offline si no hay señal.

El día del **pesaje mensual** (capa 3), este mismo flujo cambia a modo lista:
las 26 vacas en ordeño una por una con teclado numérico grande. Es el único día
del mes que se anota por vaca.

### 6.3 Flujo: mover el hato de potrero

1. **🐄 Mover hato** → mapa/grilla de potreros con semáforo.
2. El sistema **sugiere** el potrero óptimo (más días de descanso + aforo).
3. Confirmar → registra salida/entrada y reinicia contadores de descanso.

### 6.4 Lenguaje visual

- Tarjetas con **semáforos y colores de estado**, no tablas densas.
- Tipografía grande (mínimo 16px en campo), alto contraste para uso bajo sol directo.
- Iconografía por unidad productiva consistente en todo el sistema: 🐄 🌿 🌽 🐝 ☕.
- Español colombiano rural en el copy: "aforo", "novilla", "pases de cosecha",
  "carga de café" — el vocabulario del usuario, no del desarrollador.

---

## 7. Roadmap propuesto

| Fase | Alcance | Valor |
|---|---|---|
| **MVP (fase 1)** | Hato + ordeño diario + rotación de potreros + tareas | El 80% del trabajo diario es vacas y pasto |
| **Fase 2** | Salud/reproducción con alertas + clima + finanzas básicas | Decisiones con datos, costo por litro |
| **Fase 3** | Café (cosecha + beneficio + trazabilidad) y maíz | Cosechas estacionales bajo control |
| **Fase 4** | Miel + inventario completo + reportes regenerativos | Finca completa, métricas de suelo |

**Stack sugerido:** PWA (React + IndexedDB para offline) o app móvil
(React Native / Flutter) con backend ligero (Supabase/PostgreSQL) y sincronización
por cola de eventos — el modelo de "todo es un evento" lo hace natural.

---

## 8. Próximos pasos

1. Validar este mapa de módulos con quienes trabajan la finca (¿qué capturarían a diario, de verdad?).
2. Priorizar el MVP (recomendado: leche + potreros).
3. Prototipo navegable de los 3 flujos clave (ordeño, mover hato, tareas).
4. Definir stack y comenzar desarrollo iterativo.
