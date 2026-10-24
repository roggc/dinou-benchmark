# dinou-benchmark

Banco de pruebas reproducible que compara **Dinou 8.0.1** con **Next.js 16.4.2** ejecutando **la misma aplicación**, con los mismos datos locales, los mismos componentes y el mismo CSS. El objetivo no es "ganar": es medir con un método explícito y dejar por escrito todo lo que **no** se puede igualar entre dos frameworks distintos.

> **Aviso de honestidad.** Los resultados que se incluyen en `results/` (si los hay) se han generado en un contenedor compartido de un solo núcleo. Sirven para comprobar que el arnés funciona, **no** para publicar comparativas. Cualquier cifra publicable debe salir de `pnpm bench` ejecutado en el hardware descrito en `infra/` y con el generador de carga aislado.

---

## 1. Qué se compara

Una sola app, implementada de forma idiomática en cada framework:

| Ruta | Estrategia | Qué hace |
| --- | --- | --- |
| `/` | SSG | Listado de 50 items leídos de un JSON local, generado una vez en build |
| `/items/[id]` | ISR 60 s | 100 rutas prerenderizadas (`getStaticPaths` / `generateStaticParams`), revalidación cada 60 s |
| `/dashboard` | SSR dinámico | Shell por petición + tres huecos `<Suspense>` con 200 ms de retardo artificial cada uno, en paralelo |
| `/ppr` | PPR | Shell estático + un hueco dinámico de 200 ms que se streamea en la misma respuesta |
| `/messages` | SSR + mutación | Server Function / Server Action que escribe en un JSON local y revalida la ruta |

Sin red externa, sin base de datos, sin CDN: todo el coste medido es del framework.

## 2. Versiones fijadas

| Paquete | Versión |
| --- | --- |
| `dinou` | **8.0.1** |
| `next` | **16.4.2** |
| `react` / `react-dom` | **19.3.1** (idénticas en las dos apps) |
| `typescript` | 5.9.3 |
| `@types/react` | 19.2.7 |
| `@types/react-dom` | 19.2.3 |
| `@types/node` | 22.20.0 |
| `autocannon` | 8.0.0 |
| `playwright` | 1.64.1 |
| `pnpm` (campo `packageManager`) | 12.15.0 |

Versiones exactas, sin rangos: `pnpm-lock.yaml` está incluido, así que dos personas obtienen el mismo árbol de dependencias.

## 3. Estructura

```
dinou-benchmark/
├── apps/
│   ├── dinou/                  # app idiomática en Dinou (src/, page_functions.ts)
│   └── next/                   # app idiomática en Next (src/app/)
├── shared/                     # fuente única de verdad
│   ├── components/             # componentes React idénticos
│   ├── lib/                    # datos + almacén JSON local
│   ├── data/                   # items.json y messages.json
│   └── styles/global.css       # el mismo CSS para ambos
├── scripts/
│   ├── sync-shared.mjs         # copia shared/ a cada app y verifica igualdad byte a byte
│   ├── build.mjs               # tiempo de build + tamaño de salida
│   ├── verify.mjs              # 13 comprobaciones funcionales por framework
│   ├── dev-start.mjs           # arranque en frío del dev server
│   ├── hmr.mjs                 # edición real en Chromium → tiempo hasta el DOM
│   ├── bundle.mjs              # JS de cliente en gzip y brotli
│   ├── load.mjs                # TTFB, req/s, p50/p99 con autocannon
│   ├── memory.mjs              # RSS en reposo y bajo carga
│   ├── report.mjs              # results/REPORT.md + charts.svg
│   └── bench.mjs               # orquestador de todo lo anterior
├── results/                    # JSON por ejecución + informe generado
├── bench.config.mjs            # ÚNICO fichero acoplado a frameworks
├── infra/droplet-setup.sh      # droplet de DigitalOcean (CPU dedicada)
└── .github/workflows/bench.yml # validación en CI (sin publicar resultados)
```

### Añadir un framework

`bench.config.mjs` es el único punto de acoplamiento. Para añadir Waku, por ejemplo:

1. crea `apps/waku` con la app equivalente (mismas rutas y mismos componentes desde `shared/`),
2. añade una entrada a `frameworks` con sus comandos `dev`/`build`/`start`, su puerto, sus directorios de salida y el fichero que edita el test de HMR.

Ni `verify.mjs`, ni `load.mjs`, ni `report.mjs` cambian.

## 4. Cómo reproducir

### Local

```bash
pnpm install
pnpm shared          # copia shared/ a ambas apps y comprueba igualdad byte a byte
pnpm bench           # pipeline completo
```

Fases sueltas:

```bash
pnpm bench:build
pnpm bench:verify    # 13 comprobaciones por framework
pnpm bench:dev       # arranque en frío del dev server
pnpm bench:hmr       # HMR medido en navegador real
pnpm bench:bundle
pnpm bench:load
pnpm bench:memory
pnpm bench:report    # solo regenera el informe desde results/*.json
```

Filtra un framework con `--only=`:

```bash
pnpm bench:verify --only=dinou
```

La carga se puede acortar (útil para humo, no para publicar):

```bash
LOAD_DURATION=5 LOAD_RUNS=2 LOAD_CONNECTIONS=50 pnpm bench:load
BUILD_RUNS=1 DEV_RUNS=1 HMR_RUNS=1 pnpm bench
```

> En Linux/macOS. Los scripts de arranque de Next usan `sh -c` para expandir `PORT`; en Windows nativo usa WSL.

### GitHub Actions

`.github/workflows/bench.yml` ejecuta instalación, build de ambas apps y `verify`. **No publica resultados**: es una puerta de validación, porque un runner compartido no es un entorno de medida.

### Droplet (cifras publicables)

```bash
scp -r dinou-benchmark root@<ip>:/opt/
ssh root@<ip> 'bash /opt/dinou-benchmark/infra/droplet-setup.sh'
ssh root@<ip> 'cd /opt/dinou-benchmark && pnpm bench'
```

`infra/droplet-setup.sh` está pensado para un droplet **CPU-Optimized con CPU dedicada** (no "Regular", cuyas vCPU son compartidas). Para cifras serias, usa **dos droplets**: uno sirve la app y otro genera la carga, ambos en la misma región y VPC; si solo tienes uno, el script explica cómo fijar núcleos con `taskset` (servidor en 0-1, autocannon en 2-3).

## 5. Metodología

- **Siempre producción.** Ninguna métrica de rendimiento se toma en `dev`. `load` y `memory` hacen `build` + `start` antes de medir.
- **Warmup.** Cada ruta recibe 3 s de carga previa antes de la primera ronda medida.
- **Repetición.** `load` ejecuta 3 rondas de 10 s con 50 conexiones y reporta la **mediana** entre rondas, no la mejor.
- **TTFB aparte.** El TTFB se muestrea con 30 peticiones secuenciales (mediana y p95), porque la latencia de autocannon mide la respuesta completa.
- **PPR medido en streaming.** `verify` mide el primer chunk y el total por separado: el shell debe llegar rápido y el hueco ~200 ms después, en la misma respuesta.
- **HMR real.** Se abre Chromium, se edita un fichero fuente y se cronometra hasta que el texto nuevo aparece en el DOM, sin recargar.
- **Bundle.** Se recorren los assets de cliente de la salida del build y se comprime cada uno con gzip (-9) y brotli (-11). Es una aproximación al peso transferido, no una simulación de red.
- **Memoria.** RSS del árbol de procesos del servidor: en reposo (5 muestras) y pico durante carga.

### Comprobaciones (`pnpm bench:verify`)

13 comprobaciones por framework, y las 13 deben pasar antes de mirar ningún número: estado 200 de cada ruta, 50 items en el listado, HTML estable en SSG e ISR, 404 en rutas inexistentes, dashboard realmente dinámico, tres huecos streameados, shell PPR rápido + hueco tardío, y una mutación visible en un navegador real (formulario → Server Function → recarga → mensaje presente).

> Nota: autocannon no expone un p95 exacto; se usa su p97.5 como cota superior y así se etiqueta en el informe.

## 6. Diferencias entre frameworks que **no** se han podido eliminar

Estas diferencias son intrínsecas. Se documentan para que quien lea los números sepa qué está comparando.

1. **Modelo de caché.** Dinou declara la estrategia con `export const revalidate` (segundos) en `page_functions.ts`. Next 16 con `cacheComponents` ya no acepta `revalidate` ni `dynamicParams` a nivel de segmento: el ISR se expresa con `'use cache'` + `cacheLife({ revalidate: 60 })` y el 404 con `notFound()`. La semántica es equivalente; el mecanismo, no.
2. **PPR.** Dinou lo activa por segmento con `export const ppr = true`. En Next 16 el PPR dejó de ser `experimental.ppr` y llega vía `cacheComponents: true`, con huecos delimitados por `connection()` dentro de `<Suspense>` (`/ppr` aparece como `◐ Partial Prerender` en la tabla del build). Además, activar `cacheComponents` obliga a declarar las rutas totalmente dinámicas con `export const instant = false`.
3. **`defineConfig` roto en Dinou 8.0.1.** `dinou.config.mjs` con `import { defineConfig } from "dinou"` falla con `ERR_UNKNOWN_FILE_EXTENSION` al cargar la configuración. Solución aplicada: no usar fichero de configuración y declarar `ppr` en `page_functions.ts` (el nivel de mayor prioridad). Es un bug de la versión, no una decisión de diseño del benchmark.
4. **pnpm y Dinou.** Dinou resuelve dependencias hermanas (`react-server-dom-webpack`, babel, rollup, postcss) desde `node_modules` planos: con el linker aislado no arranca. El repo fija `nodeLinker: hoisted` en `pnpm-workspace.yaml`. Esto afecta al tamaño en disco de `node_modules`, no a los bundles.
5. **Server Functions como prop.** En Dinou 8.0.1 pasar una Server Function como prop a un componente de cliente devuelve HTTP 400. En ambas apps el componente de cliente **importa** la función directamente.
6. **Formularios.** Cada app tiene su propio `MessageForm.tsx` (~40 líneas) porque el import del router y de la acción son distintos (`dinou` + `dinou/server` vs `next/navigation` + `next/cache`). La lógica es línea por línea la misma; el resto de componentes se comparten sin cambios.
7. **Entrega del CSS.** El mismo `global.css` se sirve como estático desde `public/` en las dos apps (Dinou con `<link>` explícito en el layout; Next con un `<link>` que React 19 eleva al `<head>`), para no comparar un CSS empaquetado contra uno suelto.
8. **Runtime de Next.** Next 16 usa Turbopack para el build de producción; Dinou usa esbuild + su orquestador Node. Es parte de lo que se está midiendo.
9. **`dotenv`/entorno.** Ninguna de las dos apps lee variables de entorno más allá de `PORT`; no hay servicios externos que puedan introducir latencia de red.

## 7. Qué **no** mide este benchmark

- No mide CDN, caché de borde ni latencia de red: todo es `127.0.0.1`.
- No mide hidratación ni métricas de campo (LCP/INP); el bundle se mide en bytes, no en tiempo de ejecución.
- No compara calidad de DX ni ergonomía de API, solo tiempos y bytes.
- Un solo núcleo en el contenedor de referencia: los números absolutos de req/s están limitados por la máquina, no por el framework.
- **RAM en gVisor.** Si el contenedor corre sobre gVisor, `/proc/<pid>/status` no contabiliza memoria por proceso y el RSS sale inflado (varios GB). `memory.mjs` detecta el kernel y marca la entrada con `"reliable": false`; el informe lo advierte. Esas cifras hay que tomarlas en el droplet, con kernel Linux normal.

## 8. Resultados

`pnpm bench` escribe:

- `results/*.json` — una entrada por framework y ejecución,
- `results/REPORT.md` — tablas comparativas,
- `results/charts.svg`, `results/ttfb.svg`, `results/bundle.svg` — gráficas generadas sin dependencias.

Los JSON están en `.gitignore` a propósito: se regeneran. El informe se versiona solo si lo decides explícitamente.

## 9. Licencia

MIT. Las apps son código de ejemplo; los frameworks pertenecen a sus autores.

