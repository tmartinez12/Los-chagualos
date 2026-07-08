/* =============================================================================
 * Los Chagualos · COREOGRAFÍA COMPARTIDA DE ACCIONES  (core/acciones.js)
 * -----------------------------------------------------------------------------
 * M14 (Fase 6, piloto): app.js y escritorio.js repetían, en cada save* (parto,
 * palpación, secado, baja, leche, tratamiento), el mismo patrón:
 *   1) aplicar el cambio en memoria y pintar YA (optimista)
 *   2) escribir en la BD en paralelo (no bloquea el pintado)
 *   3) si la escritura falla: snack HONESTO (nunca solo console.warn)
 *   4) el snack de éxito ofrece "Deshacer" cuando la acción tiene forma de
 *      revertirse: revierte memoria + pintado y compensa en la BD (esperando
 *      a que la escritura original termine); si no la tiene, snack simple
 * Esta función extrae ESE control de flujo a un solo lugar. NO decide qué
 * pintar ni qué guardar — eso lo sigue dando cada página por closures (según
 * la regla del proyecto: "la UI nunca llama a Supabase directo", y aquí,
 * "la coreografía no conoce el estado de ninguna página").
 *
 * Compatible con <script> (window.LCAcciones) y Node (module.exports), para
 * poder probar su control de flujo con node --test / integracion.js sin DOM.
 * ===========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.LCAcciones = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  /* o.aplicar()      — muta el estado local optimista y pinta (síncrono, YA)
   * o.escribir        — () => Promise; escribe en la BD (opcional; si falta,
   *                      no hay persistencia y tampoco hay snack de error)
   * o.avisoError(e)   — texto del snack si escribir() falla (opcional; hay
   *                      un texto genérico de respaldo)
   * o.mensaje         — texto del snack de éxito
   * o.deshacerLabel   — texto del botón de deshacer (default 'Deshacer')
   * o.revertir()      — deshace exactamente lo que hizo aplicar() (memoria +
   *                      pintado); se llama ANTES de esperar la compensación
   *                      en la BD, para que la UI reaccione al toque.
   *                      OPCIONAL: si no se da, la acción queda sin "Deshacer"
   *                      (snack simple) — para los casos que de verdad no
   *                      tienen forma de revertirse (p.ej. una anotación libre
   *                      sin cambio de estado reproductivo claro).
   * o.compensarBD     — () => Promise; revierte en la BD (opcional, solo tiene
   *                      sentido si hay revertir). Se encadena DESPUÉS de que
   *                      la escritura original termine (si se deshace antes de
   *                      que la escritura original resuelva, espera y luego
   *                      compensa — nunca corren en paralelo, para no pisarse).
   * o.snack           — snack(texto, labelBoton, fn) de la página (inyectada;
   *                      escritorio.js y app.js comparten ese contrato) */
  function ejecutarConDeshacer(o) {
    o.aplicar();
    let pEscritura = Promise.resolve();
    if (o.escribir) {
      pEscritura = o.escribir().catch(e => {
        console.warn('Acción no guardada en la base:', e && e.message || e);
        o.snack(o.avisoError ? o.avisoError(e) : '⚠ NO se guardó en la base — revisa la conexión y reintenta');
      });
    }
    if (!o.revertir) { o.snack(o.mensaje); return; }
    o.snack(o.mensaje, o.deshacerLabel || 'Deshacer', () => {
      o.revertir();
      /* esperar a que la escritura original TERMINE antes de compensar: si se
       * deshace apenas se pintó, disparar la reversa en paralelo podía llegar
       * a la BD antes que la escritura original y quedar pisada por ella. */
      if (o.compensarBD) {
        pEscritura.then(() => o.compensarBD())
          .catch(e => console.warn('No se pudo revertir en la base:', e.message || e));
      }
    });
  }

  return { ejecutarConDeshacer };
});
