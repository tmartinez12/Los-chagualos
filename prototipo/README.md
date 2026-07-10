# Prototipo — mapa de archivos

Separado por responsabilidad para buscar rápido y no cargar todo de una vez.
Dos UIs (móvil + escritorio) sobre un núcleo compartido `core/` que es la única
puerta a Supabase. La fuente Work Sans vive en un solo `.woff2` compartido.

## App móvil (operario)
| Archivo | Qué contiene |
|---|---|
| `index.html` | Estructura: íconos SVG, pantallas (`scr-inicio`, `scr-ordeno`, `scr-potreros`, `scr-hato`, `scr-repro`, `scr-vaca`, `scr-sanitario`, `scr-grupo`), nav y hojas inferiores |
| `styles.css` | Todos los estilos móviles (variables de color, componentes: `.alert`, `.kpi`, `.list-item`, `.cow-tile`, `.sheet`…) |
| `app.js` | Lógica móvil: `go()` navegación, `grupos`/`openGroup()` drill-down del hato (incluye `bajas` · histórico), registro de leche (`cows`/`saveMilk`), reproducción (`savePalp`/`saveParto`…), ficha (`renderFicha`) |

## App escritorio (administradora)
| Archivo | Qué contiene |
|---|---|
| `escritorio.html` | Estructura de la vista de escritorio (páginas `pg-*`) |
| `escritorio.css` | Estilos del escritorio (mantener tokens en paralelo con `styles.css`) |
| `escritorio.js` | Lógica del escritorio: hato/filtros, registro semanal de leche, reproducción, sanidad, ficha (`goVaca`), flujos `save*` |

## Núcleo compartido (`core/`)
| Archivo | Qué contiene |
|---|---|
| `core/rules.js` | `LCRules` — lógica PURA compartida (fechas de finca, `curvaLactancia` Wood, espejos de las fórmulas de `v_animales`, `esc()` para HTML, `idUnico`). Cargable en Node (tests) |
| `core/store.js` | `LCStore` — ÚNICA capa de acceso a Supabase (mapea snake_case↔camelCase, paginación `_paginado`, caché 30 s, respaldo/restauración). La UI jamás llama a Supabase directo |
| `core/acciones.js` | `LCAcciones.ejecutarConDeshacer()` — coreografía compartida de los 6 flujos de guardado (aplicar local → BD → snack con "Deshacer" que compensa) |
| `core/vendor/supabase-js-2.110.0.js` | supabase-js vendorizado con versión fija — NO editar; para subir de versión, reemplazar el archivo y actualizar los 3 HTML |

## Otros
| Archivo | Qué contiene |
|---|---|
| `conexion.html` | Página de diagnóstico de conexión con la base |
| `fonts/worksans.woff2` | Tipografía Work Sans variable (latin), referenciada por ambos `@font-face` |
| `test/smoke.js` | 18 verificaciones de contrato UI↔núcleo↔esquema (corre en CI) |
| `test/integracion.js` | Paginación + (con Postgres local) RPCs, restauración, derivaciones, idempotencia de migraciones, contrato de respaldo |
| `test/fixtures/model.js` | Fixture de datos para `smoke.js` — NO es la app; los datos reales vienen de Supabase |
| `test/sql/*.sql` | Aserciones SQL (parto transaccional, restauración, derivaciones de `v_animales`) |

## Notas
- **Correr localmente:** `cd prototipo && python3 -m http.server 8099` →
  `/index.html` (móvil) y `/escritorio.html` (admin). Los `?v=dev` de los HTML
  los reemplaza `pages.yml` con el SHA del commit al publicar (cache-busting).
- **Deploy:** no hay build ni comando — `git push` a la rama de trabajo publica
  `prototipo/` a GitHub Pages. Push = producción.
