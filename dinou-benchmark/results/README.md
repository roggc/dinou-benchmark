# results/

Aquí escribe `pnpm bench` sus salidas:

| Fichero | Contenido |
| --- | --- |
| `build.json` | tiempo de build y tamaño de salida por framework |
| `verify.json` | las 13 comprobaciones funcionales por framework |
| `dev-start.json` | arranque en frío del dev server |
| `hmr.json` | edición → DOM en Chromium |
| `bundle.json` | JS de cliente en crudo, gzip y brotli |
| `load.json` | TTFB, req/s y latencias por ruta |
| `memory.json` | RSS en reposo y bajo carga |
| `REPORT.md` | tablas comparativas generadas |
| `charts.svg`, `ttfb.svg`, `bundle.svg` | gráficas generadas |

Los JSON están ignorados por git: se regeneran en cada ejecución. El informe
tampoco se versiona salvo que lo decidas explícitamente.

Los resultados que puedas encontrar en este directorio tras un clon vienen de un
contenedor compartido de un solo núcleo y **no son publicables**.

