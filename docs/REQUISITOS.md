# REQUISITOS.md — Los Chagualos

> Requisitos de la aplicación, escritos contra el código real (julio 2026).
> Complementos: `PROJECT.md` (arquitectura y decisiones), `GAPS.md` (deuda y
> riesgos), `supabase/README.md` (base de datos), `docs/AUDITORIA*.md`
> (historial de auditorías). Este documento dice QUÉ hace y debe hacer el
> sistema; los otros dicen CÓMO y QUÉ falta.

---

## 1. Propósito y alcance

Sistema de gestión de una **finca lechera regenerativa en Colombia**
("Los Chagualos"). Cubre: hato (inventario animal con ficha), ordeño diario,
reproducción (palpaciones, preñeces, partos, secados), sanidad (tratamientos
con retiro de leche, vacunaciones), pesajes, bajas y respaldo de datos.

**En alcance hoy:** solo la unidad de lechería. **Fuera de alcance** (visión
futura documentada en el README): otras unidades productivas, operación
offline real (outbox), login multi-rol.

## 2. Usuarios y superficies

| Usuario | Superficie | Uso |
|---|---|---|
| **Administradora** (dueña, no técnica) | `prototipo/escritorio.html` | Analizar y corregir: tablas, KPIs, fichas, exports, respaldo. |
| **Operarios de campo** (eventual) | `prototipo/index.html` (móvil) | Capturar en segundos: ordeño, parto, palpación. Botones grandes. |

Ambas superficies operan sobre los **mismos datos** (Supabase) y deben
mantenerse funcionalmente coherentes (mismos campos, mismos flujos).
**Directriz vigente:** el desarrollo activo es sobre el escritorio; el móvil
se mantiene pero no recibe features nuevas hasta nueva orden.

## 3. Requisitos funcionales

### RF-1 · Hato (inventario de animales)

- **RF-1.1** Registrar animal **comprado** o **nacido en la finca** (mismo
  formulario; el origen decide procedencia/valor vs. madre). Campos: número
  (chapeta, autoasignable), nombre, raza (chips + "otra"), color, tipo/grupo,
  sexo, **fecha de nacimiento obligatoria** (la edad SIEMPRE se deriva de
  ella), madre/padre (deben existir — FK), peso, nota; si es comprado:
  procedencia y valor (ocultos si es nacido).
- **RF-1.2** Los terneros nacidos por **parto registrado** se crean dentro del
  flujo de parto, no por el alta.
- **RF-1.3** Cada animal tiene **ficha**: hero con foto + número·nombre +
  edad·raza·grupo; sección "Datos del animal" **plegada** en el hero que al
  expandir muestra TODAS las filas (— en vacíos) y se **edita en el lugar**
  (lápiz → la tarjeta se vuelve formulario, sin modal). KPIs (último ordeño,
  DEL, próximo parto o días abiertos, partos), alertas reproductivas con CTA,
  historial de etapas, partos, palpaciones, pesajes, producción por lactancia
  y detalle mensual colapsable, curva de lactancia, sanidad.
- **RF-1.4** El número/nombre de una vaca es **clicable hacia su ficha** desde
  las listas (p.ej. registro de leche).
- **RF-1.5** **Ciclo de vida por grupos:** cría (ambos sexos al nacer) →
  levante (≥8 meses) → novilla (hembra ≥3 años) / machos (macho ≥3 años) →
  ordeño ⇄ horra. Las transiciones NO son automáticas: el sistema **avisa** y
  la administradora **confirma** (patrón aviso + confirmar), quedando el
  movimiento con su fecha en el historial de etapas.
- **RF-1.6** **Baja** con motivo (venta/muerte/descarte/pérdida), fecha, valor
  y nota; reversible ("Revertir baja"). Un animal de baja no aparece en
  listas operativas.
- **RF-1.7** Genealogía: madre, padre y crías visibles en la ficha; un toro
  marcado "reproductor" cuenta sus hijas.

### RF-2 · Producción de leche

- **RF-2.1** Registro diario de litros por vaca (solo grupo ordeño), con
  corrección posterior y "Deshacer".
- **RF-2.2** Derivados automáticos: último ordeño, promedio 7 días, DEL (días
  en leche desde inicio de lactancia), producción mensual, producción **por
  lactancia** (de parto a parto), curva de lactancia (modelo de Wood, pico
  típico ~DEL 55).
- **RF-2.3** Alertas de bajón de producción y de vacas por secar.
- **RF-2.4** La leche NO se edita desde la ficha ni el editar: solo por su
  flujo de registro (fuente de verdad = ordeños).

### RF-3 · Reproducción

- **RF-3.1 Palpación** (fuente de verdad del estado reproductivo):
  - Picker de vaca = **dropdown con buscador** (soporta 30+ por palpar),
    prioritarias (servida/vacía) primero con su motivo; elegibles = TODAS las
    hembras de ordeño/horra/novilla (no exige estado previo).
  - Captura **100% estructurada** (sin texto libre interpretado): resultado
    por chips (Preñada / Vacía—lista / En celo / Posible preñez CL / En
    observación con detalle / Recién servida / Recién parida); si preñada,
    **días de preñez** (1–300) con parto estimado en vivo; **tratamiento
    aplicado** siempre ESCRITO con **sugerencias de lo ya usado** en la finca
    (nombres consistentes); nota opcional solo informativa.
  - Un **resumen visible es exactamente lo que se guarda**; Guardar se
    habilita solo con resultado válido. El historial guarda el texto legible.
  - Preñada actualiza estado + parto estimado + fecha de secado derivada;
    vacía actualiza estado y días vacía; observaciones solo fechan la última
    palpación (el estado no cambia sin resultado concluyente).
- **RF-3.2 Parto:** registro transaccional (cría + parto + madre pasa a
  ordeño: o entra todo o nada). Sexo, peso al nacer, tipo (normal/asistido),
  estado (viva/mortinato). Corrección posterior desde la ficha (lápiz por
  fila): **solo fecha y cría vinculada** (vincular/cambiar/quitar — al salir,
  el animal pierde la madre) + eliminar el parto; si la vaca llevaba su
  lactancia desde ese parto, corregir la fecha arrastra el inicio de
  lactancia. Partos sin cría permiten **vincular un animal existente** como
  cría (excluye los que ya son cría de otro parto — único por cría).
- **RF-3.3 Secado:** programa el secado de vacas preñadas (~2 meses antes del
  parto); avisa si no figura preñada. La vaca pasa a horras.
- **RF-3.4 Listas derivadas:** próximos partos, candidatas a palpar (por
  confirmar), vacías por decidir (≥120 días abiertos → evaluar descarte).
  KPI meta: **parir cada 12–13 meses**.

### RF-4 · Sanidad

- **RF-4.1 Tratamientos:** medicamento (obligatorio), problema opcional,
  días de **retiro de leche** (con alerta "no vender su leche" mientras
  aplique), activo/terminado, nota. Lo aplicado en palpación se registra con
  retiro 0 (lo que tenga retiro va por el flujo de Tratamiento).
- **RF-4.2 Vacunaciones:** por lista EXACTA de animales (checkboxes con
  filtro por grupo + "Todas"), producto, lote, fecha, próxima dosis, con
  soporte para registro ICA. La cobertura la manda la lista (un animal nuevo
  no aparece vacunado por eventos anteriores).
- **RF-4.3** Ventana de brucelosis: aviso de crías hembra entre 3–8 meses.

### RF-5 · Pesajes

- **RF-5.1** Cada pesaje se registra **con su fecha** (acción "⚖️ Pesaje" en
  la ficha) y queda en un historial (tabla propia con ganancia en g/día entre
  pesajes). El peso "actual" del animal es copia rápida del más reciente; un
  pesaje con fecha vieja no la pisa.
- **RF-5.2** **Peso al nacer** separado del peso actual: manda el del parto
  donde el animal quedó como cría; si no hay parto registrado, es editable a
  mano en la ficha.
- **RF-5.3** Regla derivada: novilla con **≥330 kg** queda "lista para
  servicio".

### RF-6 · Datos y respaldo

- **RF-6.1** Exportación completa de la base a JSON y **restauración
  transaccional** (o entra todo o nada). El contrato de columnas del respaldo
  se verifica automáticamente contra el esquema real.
- **RF-6.2** Respaldo automático 2×/semana (GitHub Actions) — única red de
  seguridad mientras no haya login.
- **RF-6.3** Toda pantalla que lee tablas **pagina de a 1000** con orden
  determinista (PostgREST corta en 1000 en silencio).

## 4. Reglas de negocio (invariantes)

- **RN-1 Derivar, no guardar.** Todo valor calculable (edad, DEL, retiro,
  parto estimado, secado, días vacía, conteo de partos, ganancia diaria) se
  deriva en `v_animales`/reglas compartidas; nunca se persiste → no hay dos
  verdades.
- **RN-2 La hora de la finca es ley.** Fechas en `America/Bogota`
  (`hoy_finca()` / `LCStore.hoyFinca()`); jamás UTC para fechar registros.
- **RN-3 La palpación es la única fuente de verdad reproductiva.** Nada más
  cambia preñez/vacía (una comprada preñada se registra con palpación).
- **RN-4 Fecha de nacimiento obligatoria** al registrar: la edad se deriva y
  avanza sola (no existe "edad aproximada" congelada).
- **RN-5 Una cría pertenece a UN solo parto** (índice único en la base).
- **RN-6 Lo que se guarda es lo que se ve.** Ningún registro depende de
  interpretar texto libre invisible; las capturas son estructuradas y el
  resumen previo es exactamente lo persistido.
- **RN-7 Registros no futuros:** fechas de eventos ≤ hoy (finca).
- **RN-8 Ningún dato de producción/reproducción se pierde en silencio:** todo
  guardado fallido muestra aviso honesto ("NO se guardó — reintenta").

## 5. Requisitos no funcionales

- **RNF-1 UX optimista con Deshacer:** cada acción aplica local al instante,
  guarda en BD en paralelo, y ofrece "Deshacer" (5 s) que revierte pantalla
  **y** base (compensación tras confirmarse la escritura original).
- **RNF-2 Idioma:** toda la UI y el código nuevo en español.
- **RNF-3 Seguridad (estado MVP consciente):** sin login, RLS desactivado,
  anon key pública — riesgo CRÍTICO documentado (GAPS §4); mitigación:
  respaldos automáticos. Todo texto libre de la BD pasa por `LCRules.esc()`
  antes de innerHTML (anti-XSS).
- **RNF-4 Sin build:** HTML/CSS/JS vanilla; deploy = push a la rama (GitHub
  Pages publica `prototipo/` tal cual, **sin staging**). Cache-busting
  automático por SHA de commit.
- **RNF-5 Rendimiento:** caché de animales 30 s con invalidación por evento
  tras cada escritura; lecturas paginadas; pensada para un hato de ~100–300
  animales con años de historia.
- **RNF-6 Calidad:** CI en cada push (sintaxis + smoke de 18 verificaciones);
  test de integración con Postgres real (RPCs, restauración, derivaciones,
  idempotencia de migraciones, contrato de respaldo). Todo cambio de esquema
  = migración idempotente nueva + `schema.sql`, validados en Postgres 16
  local ANTES de correrse en Supabase.
- **RNF-7 Resiliencia de esquema:** si una vista/RPC aún no está migrada en
  producción, el store cae a la tabla base o a la secuencia clásica
  (fallbacks ante 42P01/404), nunca a una pantalla rota.

## 6. Restricciones técnicas

- Stack fijo: vanilla JS + Supabase (Postgres/PostgREST) + GitHub Pages/
  Actions; `supabase-js` vendorizado con versión fija.
- Una sola frontera con la base: `core/store.js` (la UI jamás llama a
  Supabase directo). Lógica pura compartida en `core/rules.js`; coreografía
  de guardado compartida en `core/acciones.js`.
- BD en snake_case, modelo JS en camelCase (mapea el store). Updates
  parciales SIEMPRE con `updateAnimalCampos` (el update total no existe a
  propósito).

## 7. Pendientes conocidos (a la fecha)

- Migraciones **#4** (tratamiento genérico) y **#5** (pesajes + peso al
  nacer + restaurar_respaldo actualizado) están **pendientes de correr en
  Supabase** por la administradora (ver `supabase/README.md`).
- El móvil quedó congelado en paridad hasta la directriz "solo escritorio":
  no tiene pesajes, ni edición en el lugar, ni la palpación estructurada
  (conserva su sheet estructurado simple preñada/vacía).
- Sin test automatizado de las compensaciones de "Deshacer" (verificadas a
  mano en cada cambio — hueco de cobertura documentado en GAPS §2).
