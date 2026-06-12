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
| ⚡ **Captura en < 30 segundos** | Si registrar el ordeño toma más de medio minuto, nadie lo hará dos veces al día. |
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
│   │   ├── Producción (ordeños AM/PM)
│   │   ├── Reproducción (celos, servicios, partos)
│   │   └── Salud (tratamientos, vacunas ICA)
│   │
│   ├── 🌿 Potreros y pastoreo
│   │   ├── Mapa de potreros
│   │   ├── Plan de rotación
│   │   └── Aforos y salud del suelo
│   │
│   ├── 🌽 Maíz
│   │   ├── Lotes y ciclos de siembra
│   │   ├── Labores culturales
│   │   └── Cosecha y destino (venta / silo / alimento)
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

---

## 4. Módulos en detalle

### 4.1 🐄 Ganadería de leche

- **Ficha por animal:** número/nombre, foto, raza, fecha de nacimiento, genealogía
  (madre/padre), estado (lactante, seca, novilla, ternera), potrero actual.
- **Ordeño:** registro AM/PM por vaca o por hato total (configurable). Litros,
  destino (venta, terneras, autoconsumo) y novedades (mastitis, retención).
- **Reproducción:** detección de celo → servicio (monta o IA) → confirmación de
  preñez → fecha probable de parto → parto. El sistema calcula alertas: secado
  (60 días antes del parto), parto próximo, vaca vacía > 120 días.
- **Salud:** tratamientos con **periodo de retiro** (la app bloquea/alerta que la
  leche de esa vaca no se puede vender X días), ciclos de vacunación ICA
  (aftosa, brucelosis) y desparasitación.

**KPIs:** litros/vaca/día, intervalo entre partos, % de preñez, células somáticas
(si hay datos del comprador), costo por litro.

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

### 4.3 🌽 Maíz

- **Ciclos de cultivo por lote:** semestre A/B (calendario bimodal colombiano),
  variedad, fecha de siembra, densidad.
- **Labores:** preparación, siembra, fertilización (orgánica/mineral), control de
  arvenses y plagas (gusano cogollero), riego. Cada labor registra jornales e insumos → costo.
- **Cosecha:** kg cosechados y **destino**: venta, silo/ensilaje para las vacas
  (se cruza con ganadería como alimento producido en finca) o autoconsumo.

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

### 6.2 Flujo estrella: registrar ordeño (< 30 segundos)

1. Toque en **🥛 Ordeño** → el sistema ya sabe si es AM o PM por la hora.
2. Lista de vacas lactantes con teclado numérico grande; valor anterior pre-cargado
   como sugerencia (un toque si fue igual).
3. Swipe en una vaca para marcar novedad (mastitis, celo visto en el ordeño —
   ¡momento real donde se detectan los celos!).
4. **Guardar** → total del ordeño en pantalla, queda en cola offline si no hay señal.

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
