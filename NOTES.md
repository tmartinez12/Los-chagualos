# NOTES.md — Observaciones durante la reorganización (no arregladas a propósito)

> Regla de la sesión: solo mover/renombrar; lo que se encuentre se anota aquí.

## Fase 1 (docs/)
- `docs/PLAN-arquitectura.md` y `docs/PLAN-backend.md` están DESACTUALIZADOS
  (describen actions.js, login por PIN y outbox que no existen). Se movieron
  tal cual; candidatos a archivo o reescritura, no a borrado silencioso.
- Varios comentarios dentro de `supabase/migracion-*.sql` citan "AUDITORIA.md"
  por NOMBRE (no por ruta). Se dejaron intactos: son texto de comentario, no
  enlaces, y la regla es no tocar contenido movido ni lógica.

## Fase 2 (fixture del test)
- `core/model.js` → `test/fixtures/model.js` (git mv, contenido idéntico).
  Actualizadas SOLO las rutas que apuntan a él: el `require()` de
  `test/smoke.js`, el `node --check` de `ci.yml`, y las menciones de ruta en
  CLAUDE.md/PROJECT.md.
- Comentarios desactualizados que NO toqué (son texto, no rutas; regla: no
  cambiar contenido movido ni lógica):
  - `test/fixtures/model.js:2` — la cabecera aún dice "(core/model.js)".
  - `prototipo/escritorio.js:1926` — comentario menciona "core/model" como
    concepto (forma canónica), no como archivo a importar.
