# NOTES.md — Observaciones durante la reorganización (no arregladas a propósito)

> Regla de la sesión: solo mover/renombrar; lo que se encuentre se anota aquí.

## Fase 1 (docs/)
- `docs/PLAN-arquitectura.md` y `docs/PLAN-backend.md` están DESACTUALIZADOS
  (describen actions.js, login por PIN y outbox que no existen). Se movieron
  tal cual; candidatos a archivo o reescritura, no a borrado silencioso.
- Varios comentarios dentro de `supabase/migracion-*.sql` citan "AUDITORIA.md"
  por NOMBRE (no por ruta). Se dejaron intactos: son texto de comentario, no
  enlaces, y la regla es no tocar contenido movido ni lógica.
