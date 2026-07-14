# Auditoría — flujos crear/editar animal (comprada · nacida · editar)

> Julio 2026. Comparación de los tres flujos × dos superficies contra las
> columnas fuente de `animales`, y correcciones de coherencia aplicadas en la
> misma sesión.

## Los tres flujos

- **Comprada / Nacida** = mismo formulario de *alta* (escritorio `saveCompra`,
  móvil `saveAlta`); un chip de origen decide procedencia/valor vs. madre.
- **Nacida por parto** = el ternero se crea dentro del flujo de *parto*
  (`saveParto` → RPC `registrar_parto_completo`), no por el alta.
- **Editar** = `guardarEditarVaca` (escritorio) / `saveEditVaca` (móvil).

## Incoherencias encontradas (antes) y corregidas

| Campo | Alta esc. | Alta móv. | Editar esc. | Editar móv. | Acción |
|---|:-:|:-:|:-:|:-:|---|
| **padre** | ❌ | ❌ | ✅ | ❌ | **añadido a las 3** (alta ×2, editar móvil) |
| **peso** | ❌ | ❌ | ✅ | ✅ | **añadido al alta ×2** |
| **nota** | ❌ | ❌ | ✅ | ✅ | **añadido al alta ×2** |
| **color** | ✅ | ❌ | ✅ | ✅ | **añadido al alta móvil** |
| **madre** | ✅ | ❌ | ✅ | ✅ | **añadido al alta móvil** |
| **sexo** | (deriva del tipo) | (deriva) | ✅ | ❌ | **añadido al editar móvil** |
| **rol de toro** | ❌ | ❌ | ✅ | ❌ | **añadido al editar móvil** |
| **origen** | ✅ | ✅ | ✅ | ❌ | **añadido al editar móvil** |
| **procedencia/valor** | ✅ cond. | ✅ **siempre** | ✅ | ❌ | móvil alta: **ahora condicional** a comprada; añadido al editar móvil |

Resultado: **alta ≈ editar** en campos (alta = editar + número + partos
históricos), y **móvil ≈ escritorio** en ambos flujos.

## Lo que se decidió NO cambiar (con criterio)

- **Comprada preñada:** el alta no captura estado reproductivo/preñez a
  propósito — la **palpación es la única fuente de verdad** de la
  reproducción (regla del proyecto). Una comprada preñada se registra con una
  palpación después de crearla. (Candidato futuro: un atajo "llegó preñada".)
- **Parto — padre y raza del ternero:** no se autocompletan. El padre del
  ternero es el toro que preñó a la madre, que el modelo no conoce con certeza
  (la madre puede tener varios servicios); forzarlo sería adivinar. La raza
  depende del cruce. Ambos quedan para *editar* la ficha del ternero.
- **edad (stepper) vs. fecha de nacimiento:** el alta ofrece ambos (usa la
  fecha si está; si no, estima desde la edad). El editar solo tiene fecha —
  es correcto: al editar ya no se "adivina" la edad, se corrige la fecha.
## Coherencia del editar (seguimiento)

- **Raza en el editar móvil:** era texto libre; se unificó a **chips + "otra
  raza"** (paridad con el editar del escritorio y el alta). Una raza heredada
  fuera de la lista cae en "otra"; chip y "otra" son mutuamente excluyentes.
- **Orden de campos del editar móvil:** se reordenó para seguir el mismo flujo
  del escritorio (identidad → clasificación → nacimiento → origen/genealogía →
  peso → lactancia → nota).

## Verificación

Chromium, los 3 flujos × 2 superficies: alta comprada del escritorio guarda
padre/peso/nota/color/procedencia/valor; alta móvil guarda color/madre/padre/
peso/nota y oculta procedencia/valor salvo comprada; editar móvil guarda
sexo/rol_toro/padre/origen/procedencia/valor. `smoke.js` en verde.
