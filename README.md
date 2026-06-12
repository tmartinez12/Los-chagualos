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

El modelo real de la finca: **cada unidad productiva la lleva una persona
distinta**, y la administradora ve el conjunto.

| Rol | Quién es | Su vista de la app |
|---|---|---|
| **Administradora** | Tatiana | Toda la finca: inicio global, todas las unidades, Decisiones y el **Diario de la finca** (quién registró qué hoy y qué falta) |
| **Trabajador de unidad** | Ordeñador/a, cafetero, apicultor, quien lleva el maíz | **Su unidad completa**: registra Y consulta su historial, curvas y calendarios — pero solo de su unidad |
| **Asesor invitado** | Veterinario, agrónomo | Solo lectura de lo suyo (historial sanitario, lotes) + dejar recomendaciones |

**Identidad flexible (la realidad es mixta):** quien tiene celular propio usa su
cuenta; donde no, un **dispositivo compartido de la finca** pregunta "¿quién
registra?" antes de capturar. Todo evento queda firmado por su autor.

**Supervisión por bitácora, no por aprobación:** los registros cuentan de
inmediato (sin trámite de aprobación), y la administradora supervisa con el
**Diario de la finca**: un resumen diario de qué se registró, quién lo hizo y
qué falta ("el apiario 2 no se revisó esta semana", "ayer nadie anotó el
ordeño").

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
    ├── 📒 Diario de la finca (quién registró qué · qué falta — vista de la admin)
    ├── 📦 Inventario (insumos, herramientas, producto terminado)
    └── 📊 Reportes y clima
    (💰 Finanzas: pospuesto por decisión — solo quedan las cuentas operativas
     pegadas a producción, como la cuenta del mes por lechero)
```

### 3.0 Una app, una vista por rol

La finca se piensa **por unidades productivas** y cada unidad la lleva una
persona → la app refleja exactamente eso: la **unidad productiva es el espacio
de trabajo**. Al entrar, cada quien ve su mundo completo y nada más:

```
🧑‍🌾 ORDEÑADOR/A → unidad LECHE
   Barra: Inicio · Ordeño · Potreros · Hato
   (la vista que ya está prototipada)

☕ CAFETERO → unidad CAFÉ
   Barra: Inicio · Lotes · Cosecha · Beneficio

🐝 APICULTOR → unidad MIEL
   Barra: Inicio · Apiarios · Revisiones · Cosechas

🌽 QUIEN LLEVA EL MAÍZ → unidad MAÍZ
   Barra: Inicio · Lotes · Labores · Silo

👩‍💼 ADMINISTRADORA → toda la finca
   Barra: Inicio · Unidades · Decidir · Diario de la finca
   "Unidades" abre cualquiera de las 4 vistas anteriores en modo completo.
```

- El **Inicio de cada rol** muestra solo sus alertas y su rutina; el Inicio de
  la administradora agrega el pulso de toda la finca.
- Los trabajadores **consultan, no solo registran**: el cafetero ve sus curvas
  de cosecha y su historial de lotes — el dato le sirve a quien lo captura, o
  dejará de capturarlo.
- Mismo motor, misma base de datos: una vista por rol es un filtro, no una app
  distinta.

**Regla de oro de la IA (arquitectura de la información):** todo registro de campo
pertenece a una *unidad productiva* y a una *ubicación* (potrero o lote). Eso permite
cruzar cualquier dato: "¿cuánto cuesta producir un litro de leche?" o "¿qué lote de
café es más rentable por hectárea?".

### 3.1 El modelo de captura: tres capas

El error clásico de los software de finca es pedir demasiado dato — o pedirlo de
forma lenta. Aquí lo diario se reduce a lo que de verdad se usa, y el registro más
exigente (la leche **vaca por vaca**, como se hace en la finca) se diseña para
tomar 2-3 minutos:

```
CAPA 1 · DIARIO (obligatorio, < 5 minutos en total)
├── 🥛 Ordeño POR VACA (1 vez al día): las 26 aparecen en el orden en que
│      entran al ordeño, con el valor de ayer pre-cargado →
│      ¿dio igual? un toque ✓ · ¿cambió? 2 dígitos y ✓ (~2-3 min las 26)
│      El total del día se suma solo.
├── 🚚 Entrega a los lecheros: litros entregados a cada uno (2-3 números)
├── 🐄 Movimiento del hato: ¿a qué potrero entraron hoy? (1-2 toques —
│      con ocupación de 1 día, máx 2, esto es rutina diaria, no evento)
└── 🌧️ Lluvia del día: ___ mm (si llovió)
    → Ordeño + entregas + potrero + lluvia. Nada más es obligatorio.

CAPA 2 · POR EVENTO (solo cuando pasa algo)
├── 🐄 Parto, celo visto, servicio, secado, venta, muerte
├── 💊 Tratamiento a un animal (activa periodo de retiro)
├── 🌽☕🐝 Labores y cosechas
└── 📦 Compra de insumos / venta de producto
    → Se registra en el momento, sobre el animal/lote específico.

CAPA 3 · PERIÓDICO (programado; el sistema lo recuerda con una tarea)
├── ⚖️ Peso/condición corporal del ganado: mensual
├── 🌿 Aforo de potreros: antes de cada entrada o quincenal
└── 🐝 Revisión de colmenas: cada 15-21 días
    → El sistema genera la tarea y guía la captura ese día.
```

**Por qué funciona:** registrar 26 vacas una por una solo es viable si la app sigue
el **orden real en que entran al ordeño** (se configura una vez) y pre-carga el
valor de ayer: confirmar es un toque, corregir son 2 dígitos. Y ese esfuerzo compra
mucho: la **curva de lactancia diaria de cada vaca** y la **alerta temprana de
caídas** — una vaca que baja ~25% de un día a otro suele estar enferma, en celo o
mal alimentada, y la app la señala esa misma mañana.

### 3.2 Dos ritmos de lectura: operar a diario, gerenciar al mes

Así como la captura tiene capas, la **lectura** tiene ritmos. Mezclarlos es el
error de diseño más común: un dashboard diario lleno de indicadores financieros
que nadie necesita a las 6 a.m., o decisiones de fondo tomadas con el dato suelto
de un solo día.

```
📆 DIARIO — pantalla INICIO (operar la finca, lectura en 30 segundos)
   Solo lo que puede cambiar una acción HOY:
   ├── Litros de hoy vs ayer — y qué vaca cayó
   ├── Dónde está el hato y qué día de ocupación lleva (¿toca mover?)
   ├── Retiros de leche activos (¿qué leche NO se vende hoy?)
   ├── Eventos de la semana: parto próximo, secado programado, vacuna
   ├── Tareas de hoy del equipo
   └── Lluvia
   ✗ Aquí NO van: costo por litro, rentabilidad, DEL promedio, % preñez.
     Son ruido a las 6 a.m. — nada de eso cambia lo que harás hoy.

🗓️ MENSUAL — pantalla DECISIONES (gerenciar, la "reunión de finca")
   Agregados y tendencias que sustentan decisiones de fondo:
   ├── Producción del mes vs mes anterior y vs mismo mes del año pasado
   ├── Litros/vaca y DEL promedio del hato (¿está "envejecido"?)
   ├── Costo por litro y rentabilidad (cuando se activen las finanzas — pospuesto)
   ├── Ranking de vacas con DEL → secados, servicios, descartes
   ├── % de preñez, vacas vacías >120 DEL, calendario de partos
   ├── Días de silo, avance de cultivos, lluvia acumulada vs histórico
   └── Salud del suelo: descanso promedio real de los potreros en el mes
```

**Las dos reglas que conectan los ritmos:**

1. **Promoción por umbral:** un dato mensual solo aparece en el diario cuando
   cruza un umbral y se convierte en alerta accionable. El silo no se mira a
   diario — pero el día que baja de 50 días, aparece en Inicio como
   "⚠ sembrar ya". Cruzado el umbral es operativo; antes, es ruido.
2. **Agregación automática:** todo lo mensual se construye solo con los datos
   diarios y de eventos — la reunión de fin de mes no requiere capturar nada
   adicional, ya está lista cuando llegas.

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
- **Inventario completo del hato — los 80 a la vista:** además del resumen por
  grupos, una lista de **todos los animales** con búsqueda por número/nombre y
  filtros combinables (grupo, preñadas, vacías, en tratamiento, por edad). Cada
  fila muestra lo esencial sin abrir la ficha: `042 Lucero · ordeño · 5,2 años ·
  preñada 6m · ayer 18 L`. Es el censo vivo de la finca: sirve para el conteo
  físico, los ciclos ICA (la lista ES el soporte de vacunación) y para responder
  en segundos "¿qué animales tengo y en qué estado está cada uno?". Exportable
  a Excel/PDF.
- **Los grupos se exploran (drill-down):** tocar "vacas horras" abre la lista de
  las 9 con su dato relevante al lado (meses de preñez y fecha probable de parto,
  ordenadas por quién pare primero); tocar una abre su ficha. La jerarquía
  completa es `hato → grupo → animal → evento`, siempre a un toque de distancia,
  y cada grupo ordena su lista por lo que importa en ese grupo: las horras por
  fecha de parto, las de ordeño por orden de ordeño, las novillas por peso.
- **Altas y bajas — el censo siempre cuadra:**
  - *Nacimiento:* registrar el parto **crea automáticamente la cría** como nuevo
    animal, vinculada a su madre (y la vaca arranca su lactancia en DEL 0).
  - *Compra:* formulario corto de alta — número, raza, edad, procedencia y precio
    (el gasto va solo a finanzas).
  - *Venta, muerte o descarte:* la baja pide el motivo. Venta → precio e ingreso
    a finanzas; muerte → causa (alimenta la estadística sanitaria). El animal
    **no se borra**: queda en el histórico con su vida completa, para trazabilidad
    y para los números del año.
#### La ficha del animal: todo lo de una vaca en una pantalla

La ficha se **consulta** mucho y se **edita** poco: los datos generales se cargan
una vez, y todo lo demás lo van construyendo los eventos.

```
┌──────────────────────────────────────────┐
│ 📷  VACA 042 · "Lucero"                  │
│ Holstein × Gyr · 5,2 años · En ordeño    │
├──────────────────────────────────────────┤
│ 🤰 PREÑADA · 6 meses (palpación 02 may)  │
│    Parto probable: ~12 sep               │
│    ⚠️ Secar: ~12 jul                     │
├──────────────────────────────────────────┤
│ 🥛 Ayer: 18 L · DEL 152 (parto 11 ene)   │
│ ⚖️ Peso: 480 kg (abr) · ver historial    │
│ 🍼 Partos: 3 · Crías: 038, 051, 064      │
│ 👪 Madre: 017 · Padre: toro "Sansón"     │
├──────────────────────────────────────────┤
│ 💊 SALUD                                 │
│ • Aftosa: ✅ may 2026 (ciclo ICA)        │
│ • Mastitis (mar 2026): tratada, ok       │
│ • Sin retiro de leche activo             │
├──────────────────────────────────────────┤
│ HISTORIA ▾ (línea de tiempo de eventos)  │
│ [+ Registrar evento]                     │
└──────────────────────────────────────────┘
```

- **Datos generales (se cargan una vez):** número/nombre, foto, raza, fecha de
  nacimiento (la **edad se calcula sola**), genealogía (madre/padre), procedencia
  (nacida en finca o comprada). El **peso** es un evento periódico (capa 3): cada
  registro construye el historial y la curva de crecimiento de las jóvenes.
- **Ordeño diario por vaca:** se ordeña una vez al día y se anota cada vaca. La
  app presenta las 26 en el orden en que entran al ordeño con el valor de ayer
  pre-cargado (igual = un toque ✓, distinto = 2 dígitos); el total del día se
  suma solo y cada vaca construye su **curva de lactancia real**.
- **Alerta de caída de producción:** si una vaca baja bruscamente frente a su
  promedio de la semana (p. ej. −25%), la app la marca esa misma mañana — es el
  primer síntoma de mastitis, celo o problema de alimentación.
- **Venta de leche — entregas por lechero (precio fijo):** el precio se configura
  una vez y solo se toca cuando cambie. Lo que se registra a diario es lo que ya
  se anota hoy en la finca: **cuántos litros se le entregaron a cada lechero**.
  Con eso el sistema arma solo:
  - el **balance del día**: producida − entregada − terneras = casa/diferencia
    (y avisa si no cuadra — fugas de leche visibles de inmediato);
  - la **cuenta del mes por lechero**: litros acumulados × precio = lo que debe
    cada uno, lista para cobrar sin cuaderno ni calculadora;
  - el cruce con los retiros: si hay vacas en tratamiento, la app recuerda
    cuántos litros NO podían entregarse ese día.
- **DEL (días en leche) — el reloj de cada lactancia:** se calcula solo desde el
  parto (cero captura) y acompaña a la vaca en toda la app: junto a sus litros en
  el ordeño, en su ficha y en los rankings. Es el contexto que hace interpretables
  los litros (5 L a DEL 400 es normal; a DEL 100 es un problema) y dispara las
  ventanas de manejo: **servicio entre DEL 60-90**, revisión de vacas vacías a
  DEL 120+, y alerta de **lactancia muy larga (DEL > 305)** sin preñez confirmada.
- **Reproducción — la palpación como evento central:** el día que viene el
  veterinario a palpar, la app entra en *modo palpación*: pasa la lista de vacas
  y para cada una se marca el resultado en un toque — `preñada (+ meses)`,
  `vacía` o `problema`. Con los meses de preñez el sistema calcula solo la fecha
  probable de parto, la fecha de secado (~2 meses antes) y arma el **calendario
  de partos** de la finca. La reproducción es **monta natural — el toro anda con
  el hato** — así que registrar servicios es opcional (un celo o una monta vista
  se anotan si se ven) y **la palpación es la fuente de verdad**. Alertas
  derivadas: secar pronto, parto próximo, vaca vacía > 120 días posparto.
  Y la alerta clave de la monta natural: **consanguinidad** — con la genealogía
  ya capturada, la app avisa cuando las hijas del toro llegan a edad de servicio
  ("4 novillas son hijas de Sansón → toca rotar o cambiar de toro").
- **Salud — enfermedades, medicinas y vacunas:**
  - **Enfermedad:** se registra qué tiene (mastitis, cojera, fiebre…) con foto
    opcional; queda "en tratamiento" hasta marcar recuperación.
  - **Medicina:** medicamento (sale del inventario), dosis y **periodo de
    retiro** — la app alerta que la leche de esa vaca no se puede vender X días
    y descuenta esos litros del estimado de venta.
  - **Vacunas y desparasitación por grupo:** se aplican en una sola acción —
    "vacunar hato" marca los 80 de una vez, sin abrir 80 fichas (con excepciones:
    se destildan los animales que no se vacunaron y se anota por qué).

#### Reproducción con toro — consanguinidad y la regla de los 21 días

Con monta natural el toro hace su trabajo solo; lo que el sistema aporta es la
**memoria y la genética** que el ojo no alcanza a llevar:

- **El toro como entidad:** ficha del toro activo (edad, años en el hato, # de
  hijas vivas en la finca). Es el dato que sustenta la decisión más importante
  de la monta natural: **cuándo cambiarlo**.
- **Alerta de consanguinidad:** la app cruza la genealogía con la edad/peso de
  las hembras jóvenes y avisa con meses de anticipación: *"4 novillas hijas de
  Sansón llegan a edad de servicio → no deben quedar con su padre"*. Opciones
  que sugiere: rotar o cambiar el toro, separar el lote de novillas, prestar
  toro de otra finca. Sin esta alerta, en una finca con un solo toro la
  consanguinidad llega sola en 2-3 años.
- **La regla de los 21 días:** el ciclo de la vaca dura ~21 días. Si se vio un
  celo o una monta y se anotó, la app programa la revisión: *"Mona: celo visto
  el 3 jun → observar ~24 jun; si no repite celo, probablemente quedó preñada"*.
  Las que no repiten van solas a la lista de palpación.
- **La lista para el veterinario se arma sola:** el día de la palpación, el
  *modo palpación* ya sabe a quién revisar: vacas con celo sin repetir, vacas
  >60 días posparto sin celo visto, y las que salieron vacías la vez pasada.
  El veterinario no pierde tiempo y no se le escapa ninguna.

**KPIs reproductivos:** % de preñez del hato, intervalo entre partos, vacas
vacías >120 DEL, # de hijas del toro activo.

#### Plan sanitario anual — la memoria sanitaria de la finca

Nadie debería tener que acordarse de una vacuna. El plan sanitario es un conjunto
de **protocolos configurables** (qué producto, a quién, cada cuánto, qué retiro
deja) que el sistema vigila y convierte en tareas. Hay **dos tipos de disparador**:

| Disparador | Cómo funciona | Ejemplos |
|---|---|---|
| **Por calendario** | Fecha o frecuencia fija; la tarea se crea sola con anticipación | Aftosa en los ciclos ICA (may/nov) · desparasitación cada 3 meses · baño garrapaticida en época seca |
| **Por edad del animal** | La app cruza el inventario con la regla y avisa **qué animales entran en ventana** | Brucelosis a hembras de 3-8 meses (una vez en la vida): "las terneras 064 y 071 entran en ventana este mes" |

Cómo se comporta:

- **Se programa solo:** cada protocolo genera su tarea con la **lista de animales
  que tocan** ya armada. Aplicar es una acción por grupo, no 80 registros.
- **Deja rastro en todo:** queda en la ficha de cada animal, descuenta el frasco
  del inventario y suma el costo a ganadería.
- **Respeta los ritmos de lectura (§3.2):** el plan vive en su propia vista
  (calendario de 12 meses); solo aparece en Inicio cuando la fecha se acerca.
- **Es el soporte oficial:** la lista de animales de cada ciclo de vacunación,
  exportable, ES el soporte para el ICA.

**KPIs:** litros totales/día, litros/vaca/día con su curva de lactancia (eje en
DEL), **DEL promedio del hato** (si sube de ~180-200, el hato está "envejecido" en
lactancia: faltan partos recientes), intervalo entre partos, % de preñez, costo
por litro.

### 4.2 🌿 Potreros y pastoreo (corazón del modelo regenerativo)

**La regla de manejo de la finca: ocupación de 1 día, máximo 2.** Eso convierte la
rotación en la rutina diaria más importante después del ordeño, y define cómo se
diseña este módulo:

- **El movimiento diario es de 2 toques:** cada mañana la app ya sabe dónde está el
  hato y cuánto lleva ahí; propone el siguiente potrero (el de más días de descanso
  con aforo suficiente) → confirmas o eliges otro. Listo.
- **Alarma de sobre-ocupación:** si el hato amanece su **segundo día** en el mismo
  potrero, la alerta del día es *"último día en el potrero 7 — mover mañana sin
  falta"*. Al tercer día la alerta es roja: la regla de la finca se está rompiendo.
- **El descanso se planifica solo:** con ocupación de 1 día, el descanso de cada
  potrero ≈ (número de potreros − 1) días. El sistema muestra la **secuencia
  proyectada de la rotación** (a dónde irá el hato los próximos 7-15 días) y avisa
  si la vuelta está quedando muy corta para la época (en seca el pasto necesita
  más días de recuperación que en lluvias).
- **Mapa de potreros:** croquis o mapa GPS con área (ha), tipo de pasto, aguadas y
  cercas (incluye divisiones con cerca eléctrica móvil si se usan franjas).
- **Aforo:** medición de kg de forraje verde/m² antes de entrar al potrero
  (capa 3 — periódico, no diario).
- **Salud del suelo:** registros periódicos de cobertura, presencia de escarabajos
  estercoleros, compactación, materia orgánica (si hay análisis de laboratorio).
  Con el historial de rotación, el sistema responde la pregunta regenerativa clave:
  *¿cada potrero está descansando lo suficiente, en todas las épocas del año?*

**Vista clave (UX):** una grilla de tarjetas de potreros con semáforo y los días
de descanso en grande: 🟢 listo para pastorear · 🟡 en recuperación · 🔴 ocupado
o recién pastoreado. La tarjeta del potrero actual muestra "día 1 de 2".

**Escala real (definido jun 2026): la finca tiene 30+ potreros.** La grilla no
puede ser plana: se ordena **por estado** (listos primero, luego recuperando,
los recién pastoreados al final y atenuados) y se agrupa **por zonas de la
finca** si las hay. Con 30+ potreros y ocupación de 1 día, la vuelta da
descansos de ~30+ días — coherente con lo que el pasto necesita incluso en
época seca.

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
│ • Hato: día 2 en potrero 7         │
│   → mover hoy · sugerido: P4 (35d) │
│ • Vaca 042: secar (parto en 60d)   │
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

### 6.2 Flujo estrella: el ordeño vaca por vaca (~2-3 minutos las 26)

1. Toque en **🥛 Ordeño** → aparece la **primera vaca del orden del ordeño**
   (el orden se configura una vez, arrastrando) con su valor de ayer pre-cargado
   en grande y su contexto: *"042 Lucero · DEL 152 · ayer 18 L"*.
2. **¿Dio igual que ayer? → un toque en ✓.** ¿Cambió? → 2 dígitos en el teclado
   grande y ✓. La app pasa sola a la siguiente vaca.
3. En cualquier vaca: botón **"+ Novedad"** para marcar mastitis o celo visto en
   el ordeño — ¡el momento real donde se detectan los celos!
4. Al terminar: **el total del día se suma solo**, comparación contra ayer y
   alerta de las vacas que cayeron frente a su semana. Todo queda en cola offline.

### 6.3 Flujo: mover el hato (rutina de cada mañana, 2 toques)

1. **🐄 Mover hato** → la app muestra dónde está el hato ("potrero 7, día 2 — hay
   que mover hoy") y el **potrero sugerido** (más descanso + aforo suficiente).
2. **Confirmar** (o tocar otro potrero en la grilla si decides distinto) →
   registra salida/entrada y reinicia los contadores de descanso.

Si a las 9 a.m. no se ha registrado movimiento y el hato lleva 2 días en el mismo
potrero, la app lo recuerda con una notificación.

### 6.4 Visualización de datos

**Principios para gráficos de finca en celular:**

1. **Un gráfico = una pregunta.** El título es la respuesta, no el nombre del dato:
   ❌ "Producción láctea mensual" → ✅ "La leche subió 8% este mes".
2. **Número grande primero, gráfico después.** En el dashboard solo el dato clave y
   una mini-curva (sparkline); el gráfico completo se abre al tocar.
3. **Siempre comparado.** Un número solo no dice nada: vs ayer, vs mes pasado y
   **vs el mismo mes del año pasado** — esencial en Colombia, donde el clima bimodal
   hace que abril nunca sea comparable con agosto.
4. **Solo 3 tipos de gráfico en toda la app** — se aprenden una vez:
   línea (evolución), barras (comparación/ranking) y semáforo-mapa (estado).
5. **Los eventos se anotan sobre la curva.** Una caída de leche sin contexto asusta;
   con la marca "💊 3 vacas en retiro" o "🌿 cambio a potrero pobre", se entiende.

**Las visualizaciones clave por módulo:**

```
🥛 LECHE — curva diaria con lluvia de fondo
  L/día                          ▌= lluvia (mm)
  200┤      ╭──╮        ╭───●  184 L hoy
  160┤ ╭────╯  ╰───╮╭───╯       ▲ 8% vs mayo
  120┤─╯     💊    ╰╯⬆silo
     └▌▌──▌────▌▌▌──▌──▌▌──
      1    8     15     22   30
  → La relación lluvia→pasto→leche, visible de un vistazo.
  → Eventos anotados explican cada caída o subida.

🐄 POR VACA — ranking diario de las 26 en ordeño (registro de cada día)
  Lucero 042  ████████████████ 18 L · DEL 152
  Mona 038    ██████████████ 16 L · DEL 98
  ...
  Pinta 029   ████ 5 L · DEL 412  🔴 vacía 150d → ¿descarte?
  → Litros junto a los DEL: 5 L a DEL 400 es lo esperado al final de la
    lactancia; 5 L a DEL 100 es un problema. El ranking se lee con contexto.
  → Las de abajo en rojo si además están vacías: decisión a un vistazo.

📈 CURVA DE LACTANCIA — por vaca, eje X en DEL (días en leche)
  L/día
   20┤    ╭───╮ pico (DEL 40-60)
   14┤  ╭─╯   ╰──────╮___
    8┤ ╭╯               ╰──╮ hoy: DEL 152 · 18 L
     └─┴────┴────┴────┴────┴──
       0   60   120  180  240  DEL
  → Cada lactancia de la vaca se superpone: ¿esta lactancia viene mejor
    o peor que la anterior a los mismos DEL?

📅 PARTOS — línea de tiempo de los próximos 9 meses
  jul ●● 2   ago ● 1   sep ●●●● 4   oct ● 1 ...
  → Cuántas vacas entran al ordeño cada mes = leche futura.

🌿 POTREROS — el mapa semáforo ES el gráfico
  ┌────┬────┬────┐  🟢 listo (días de descanso en grande)
  │ 1🔴│ 2🟡│ 3🟢│  🟡 recuperando
  │ 4🟢│ 5🟡│ 6🔴│  🔴 ocupado / muy pastoreado
  └────┴────┴────┘
  → Tocar un potrero: su historial de descansos y aforos.

🌽 SILO — una sola barra de combustible
  Comida del hato: ██████████░░░░░░ 45 días restantes
  ⚠️ El próximo ciclo tarda 120 días → sembrar ya
  → No es un gráfico de producción: es un tanque de gasolina.

💰 FINANZAS — barras por unidad productiva (mes/año)
  Leche  ████████████│██████ ingresos vs costos
  Café   ██████████│███
  Miel   ███│█
  → De un vistazo: qué unidad da plata y cuál está costando.
```

### 6.5 Navegación y flujos

**Mapa de 3 niveles — todo a máximo 3 toques:**

```
NIVEL 1 · Barra inferior (ordenada por frecuencia de uso, no por organigrama)
  Inicio · Ordeño · Potreros · Hato · Decidir

NIVEL 2 · Secciones de módulo (a 1 toque del nivel 1)
  Hato    → Reproducción · Plan sanitario · Grupos · Inventario
  Inicio  → Rutina de la mañana · Decisiones · Tareas
  Ordeño  → Entregas a lecheros

NIVEL 3 · Detalle
  Grupo → Ficha del animal → registrar evento
```

**Reglas de navegación:**

1. **"Atrás" vuelve por donde viniste** (pila de navegación); la barra inferior
   teletransporta y resetea la pila.
2. **El botón "+" siempre está visible y es contextual:** en la ficha de Lucero
   registra un evento *de Lucero*; en Reproducción sugiere celo/monta; en
   Inicio, novedad general.
3. **Toda alerta es un deep-link:** "mover hato hoy" no te lleva a un menú,
   te lleva a la pantalla de mover con el potrero ya sugerido.

**El flujo central: la rutina de la mañana (encadenada, con progreso).**
Las tres capturas diarias no son botones sueltos sino una secuencia guiada
en Inicio — `1 Ordeño → 2 Entregas → 3 Mover hato` — que se va marcando sola:
al terminar el ordeño, la app sugiere las entregas; al confirmarlas, el
movimiento del hato. "Rutina 3 de 3" = el día operativo está completo.

**Dónde vive la lluvia:** no en la rutina de leche — su relación causal es
`lluvia → pasto → rotación`, así que se registra en **Potreros** (y el
encabezado de Inicio siempre muestra la última lluvia como contexto).

### 6.6 Lenguaje visual

- **Una pantalla = una pregunta; el detalle vive a un toque.** Inicio responde
  "¿qué hago hoy?", Ordeño "registrar", Hato "¿qué animales tengo?", Decisiones
  "¿cómo vamos y qué cambio?". Las tendencias y rankings viven en Decisiones
  (ritmo mensual), no en las pantallas diarias.
- **Lo normal no se muestra — solo las excepciones.** Si la sanidad de una vaca
  está al día, es una línea ("Sanidad al día ✓"), no una lista de tres ítems;
  el retiro de leche solo aparece cuando hay uno activo.
- Tarjetas con **semáforos y colores de estado**, no tablas densas.
- Tipografía grande (mínimo 16px en campo), alto contraste para uso bajo sol directo.
- Iconografía por unidad productiva consistente en todo el sistema: 🐄 🌿 🌽 🐝 ☕.
- Español colombiano rural en el copy: "aforo", "novilla", "pases de cosecha",
  "carga de café" — el vocabulario del usuario, no del desarrollador.

---

## 7. El sistema como copiloto de decisiones

**Principio:** los datos no se capturan para tener datos — se capturan para decidir.
Cada reporte del sistema responde una pregunta concreta de la finca; si un dato no
alimenta ninguna decisión, no se pide. El soporte a decisiones funciona en tres
niveles según el horizonte de tiempo:

```
NIVEL 1 · HOY (alertas — el sistema te avisa, tú actúas)
NIVEL 2 · ESTE MES (rankings y semáforos — comparar para elegir)
NIVEL 3 · ESTE AÑO (proyecciones — anticiparse)
```

### 7.1 Las decisiones concretas que soporta

| Decisión | El sistema responde con… |
|---|---|
| 🐄 **¿Qué vacas seco, sirvo o descarto?** | Producción diaria leída con sus DEL + estado reproductivo: "Pinta da 5 L a DEL 412 y está vacía hace 150 días — candidata a descarte"; "Mona está en DEL 75: ventana ideal de servicio". |
| 🌿 **¿A cuál potrero muevo el hato hoy?** | Sugerencia automática: el potrero con más días de descanso y aforo suficiente. |
| 🌿 **¿Aguanta la finca más vacas?** | Carga animal actual vs. capacidad según aforos e historial de lluvia. |
| 🌽 **¿Cuándo siembro el próximo maíz?** | Inventario de silo ÷ consumo diario del hato = "quedan **45 días** de comida; el ciclo tarda 120 — siembra ya". |
| 🌽 **¿Producir maíz o comprar concentrado?** | Costo real del kg de silo producido vs. precio del concentrado en el mercado. |
| ☕ **¿Cuándo y cuántos recolectores contrato?** | Proyección de cosecha desde la fecha de floración + kg de pases anteriores. |
| ☕ **¿Vendo el pergamino ya o espero?** | Inventario valorizado + factor de rendimiento por lote (qué microlotes valen más como cafés especiales). |
| 🐝 **¿Divido colmenas o refuerzo?** | Semáforo de fortaleza por colmena en las revisiones quincenales. |
| 💰 **¿Qué unidad productiva me da plata?** | Rentabilidad por unidad y por hectárea — con la leche al costo real por litro (incluyendo el maíz). |
| 📅 **¿Cómo viene la leche los próximos meses?** | Calendario de partos (de las palpaciones) → proyección de vacas en ordeño mes a mes. |

> Nota: las decisiones que dependen de finanzas (costo por litro, rentabilidad
> por unidad, producir vs comprar) quedan **en pausa** hasta que se active el
> módulo financiero — decisión de alcance tomada en jun 2026.

### 7.2 Cómo se ve en la app

- **Las alertas del dashboard son accionables:** no dicen "dato registrado", dicen
  *"Potrero 4 listo (35 días de descanso) → [Mover hato]"* — la decisión y el botón
  para ejecutarla en el mismo lugar.
- **Pantalla "Decisiones del mes"** (para ti como administradora): un resumen
  mensual con las 3-5 decisiones que los datos sugieren revisar — vacas candidatas
  a secado/descarte, días de silo restantes, proyección de partos, rentabilidad
  acumulada. Es la reunión mensual de la finca, en una pantalla.
- **Toda recomendación muestra su porqué:** "sugerimos secar la 042" viene con el
  dato detrás (preñada 7 meses, palpación del 2 de mayo). El sistema recomienda,
  **tú decides** — y si decides distinto, el sistema aprende el contexto (puedes
  anotar el motivo).

---

## 8. Roadmap propuesto

| Fase | Alcance | Valor |
|---|---|---|
| **MVP (fase 1)** | Hato + ordeño diario + rotación de potreros + tareas | El 80% del trabajo diario es vacas y pasto |
| **Fase 2** | Salud/reproducción con alertas + clima + finanzas básicas | Decisiones con datos, costo por litro |
| **Fase 3** | Café (cosecha + beneficio + trazabilidad) y maíz | Cosechas estacionales bajo control |
| **Fase 4** | Miel + inventario completo + reportes regenerativos | Finca completa, métricas de suelo |

**Stack (definido):** **PWA** — en la finca hay mezcla de Android y iPhone, y
una PWA corre igual en ambos sin tiendas de aplicaciones. React + IndexedDB
para offline, backend ligero (Supabase/PostgreSQL) y sincronización por cola
de eventos — el modelo de "todo es un evento" lo hace natural.

### 8.1 Decisiones de producto tomadas (jun 2026)

| Tema | Decisión |
|---|---|
| Ordeño | 1 vez al día, **registro por vaca** (orden del ordeño, valor de ayer pre-cargado) |
| Venta de leche | Precio fijo · se registra la **entrega diaria a cada lechero** |
| Reproducción | **Monta natural** con toro · la palpación es la fuente de verdad |
| Alimentación | **Sin seguimiento** por ahora (pospuesto) |
| Finanzas | **Pospuestas** — solo cuentas operativas por lechero |
| Maíz | 100% alimento del hato, sin ventas |
| Organización | Por **unidades productivas** · una vista por rol · cada trabajador ve su unidad completa |
| Equipo | 3-5 personas · identidad mixta (cuenta propia o dispositivo compartido) |
| Supervisión | **Bitácora** (Diario de la finca), sin flujo de aprobación |
| Potreros | **30+** · ocupación 1 día (máx 2) · grilla ordenada por estado |
| Lluvia | Se registra en **Potreros** (lluvia → pasto), no en la rutina de leche |
| Dispositivos | Mezcla Android/iPhone → **PWA** |
| Datos iniciales | **Importación desde cuaderno/Excel**: plantilla de censo (animales, potreros, lecheros) que se llena una vez y se importa |

---

## 9. Backlog de ganadería (pendientes priorizados)

Lo ya diseñado: inventario por grupos con drill-down, ficha del animal, ordeño
diario por vaca con DEL, reproducción completa con palpación, salud con retiros
y vacunas, altas/bajas y decisiones de secado/descarte. Lo que falta:

| # | Pendiente | Por qué importa |
|---|---|---|
| ✅ | ~~Balance y venta de leche~~ | **Ya diseñado** (sección 4.1): entregas diarias por lechero a precio fijo, balance del día y cuenta del mes por lechero. |
| ✅ | ~~Plan sanitario anual~~ | **Ya diseñado** (sección 4.1): protocolos por calendario y por edad, aplicación por grupo, soporte ICA exportable. |
| ✅ | ~~Reproducción con toro~~ | **Ya diseñado** (sección 4.1): ficha del toro, alerta de consanguinidad, regla de los 21 días y lista de palpación auto-armada. |
| 1 | **Crianza de terneras** | Protocolo de leche por ternera, destete, curva de crecimiento vs meta (~500 g/día). Las terneras de hoy son el ordeño en 3 años. |
| 2 | **Trazabilidad oficial ICA** | Guías de movilización, identificación oficial, reportes listos para trámites. |
| 3 | **Hoja de vida exportable (PDF)** | La vida completa del animal demostrable → mejor precio al vender. |
| ⏸ | ~~Alimentación y suplementación~~ | **Pospuesto** — hoy no se hace seguimiento de alimentación en la finca. Cuando se quiera medir el costo por litro completo, se activa. |

**Orden recomendado:** 1 (terneras), luego 2 y 3.

---

## 10. Próximos pasos

1. Validar este mapa de módulos con quienes trabajan la finca (¿qué capturarían a diario, de verdad?).
2. Priorizar el MVP (recomendado: leche + potreros).
3. Prototipo navegable de los 3 flujos clave (ordeño, mover hato, tareas).
4. Definir stack y comenzar desarrollo iterativo.
