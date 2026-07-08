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

## Fase 3 (docs de supabase + edge function huérfana)
- supabase/GUIA-IMPORTACION.md y PRUEBA-DE-HUMO.md → supabase/docs/ (git mv,
  contenido idéntico). La referencia cruzada GUIA→PRUEBA sigue válida (mismo dir).
- supabase/edge-functions/ → supabase/edge-functions-archivadas/ (login-pin es
  huérfana, ver GAPS B8). Actualizada la ruta concreta en docs/AUDITORIA.md.
- Menciones CONCEPTUALES de "login-pin" NO tocadas (describen el diseño/gap, no
  son rutas de import): GAPS.md:48,123; docs/AUDITORIA.md:92; docs/PLAN-backend.md:28,70.
