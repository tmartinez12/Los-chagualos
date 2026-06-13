# Prototipo — mapa de archivos

El prototipo está separado por responsabilidad para buscar rápido y no cargar
todo de una vez. La fuente Work Sans vive en un solo `.woff2` compartido (sigue
funcionando offline).

## App móvil (operario)
| Archivo | Qué contiene |
|---|---|
| `index.html` | Estructura: íconos SVG, pantallas (`scr-inicio`, `scr-ordeno`, `scr-potreros`, `scr-hato`, `scr-repro`, `scr-vaca`, `scr-decisiones`, `scr-sanitario`, `scr-grupo`), nav y hojas inferiores |
| `styles.css` | Todos los estilos (variables de color, componentes: `.alert`, `.kpi`, `.list-item`, `.cow-tile`, `.sheet`…) |
| `app.js` | Lógica: `go()` navegación, `grupos`/`openGroup()` drill-down del hato, rutina de la mañana (`markRutina`), registro de leche (`cows`/`saveMilk`), `datosMaiz`/`aplicarMaiz()` |

## App escritorio (administradora)
| Archivo | Qué contiene |
|---|---|
| `escritorio.html` | Estructura de la vista de escritorio |
| `escritorio.css` | Estilos del escritorio |
| `escritorio.js` | Lógica del escritorio |

## Compartido
| Archivo | Qué contiene |
|---|---|
| `fonts/worksans.woff2` | Tipografía Work Sans variable (latin), referenciada por ambos `@font-face` |

## Notas
- **Inicio (móvil):** solo muestra Leche, Potreros y Maíz. El bloque de Maíz se
  oculta si no hay datos del cultivo — en `app.js` pon `datosMaiz = null` para
  simularlo.
- Para abrir: cualquier `.html` directo en el navegador (no necesita servidor).
