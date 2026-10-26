# Dinou vs Next.js — Resultados oficiales del benchmark

> Comparación de **Dinou 8.1.2**, **Dinou 9.0.0** y **Next.js 16.4.2** (los tres con React 19.3.1) en una misma app con páginas idénticas: SSG, ISR, SSR con Suspense, PPR y SSR con lectura de disco.

---

## 1. Resumen

> **Fecha oficial:** 26 de octubre de 2026 · **Entorno:** 4 vCPU dedicadas / 8 GB RAM (DigitalOcean CPU-Optimized)

Con 200 conexiones concurrentes, 30 s por ejecución, 3 ejecuciones por ruta:

| Ruta | Tipo | Dinou 9.0.0 | Next.js 16.4.2 | Ventaja req/s | Ventaja p99 |
| :--- | :--- | ---: | ---: | :---: | :---: |
| `/ppr` | PPR | **638 req/s** · p99 388 ms | 202 req/s · p99 6.030 ms | **3,2×** | **15× menor** |
| `/messages` | SSR (I/O de disco) | **482 req/s** · p99 870 ms | 197 req/s · p99 5.776 ms | **2,4×** | **6,6× menor** |
| `/dashboard` | SSR + Suspense | **460 req/s** · p99 574 ms | 195 req/s · p99 7.947 ms | **2,4×** | **14× menor** |
| `/` | SSG | **1.722 req/s** · p99 138 ms | 806 req/s · p99 380 ms | **2,1×** | **2,8× menor** |
| `/items/42` | ISR (en caché) | **1.732 req/s** · p99 145 ms | 1.311 req/s · p99 177 ms | **1,3×** | 1,2× menor |

- En las rutas dinámicas y PPR, Dinou sirve entre **2,4 y 3,2 veces más peticiones por segundo** y su latencia p99 es **hasta 15 veces menor**.
- En **ISR los dos sirven desde caché** y la diferencia es pequeña (1,3×).
- **Dinou 8.1.2 y 9.0.0 rinden de forma equivalente** (las diferencias entran en un ±5 %), sin mostrar regresiones medibles en este benchmark.

---

## 2. Entorno

| Parámetro | Valor |
| :--- | :--- |
| Máquina | DigitalOcean CPU-Optimized, 4 vCPU dedicadas (`Intel Xeon Platinum 8168 @ 2.70GHz`), 8 GB RAM |
| Sistema operativo | Ubuntu 24.04 LTS, kernel `6.8.0-142-generic` |
| Node.js | `v22.23.4` |
| Gestor de paquetes | `pnpm 12.15.0` |
| Cliente de carga | `autocannon 8.0.0` (mismo host) |
| `ulimit -n` / `somaxconn` | `65535` / `65535` |
| Versiones | Dinou 8.1.2 · Dinou 9.0.0 · Next.js 16.4.2 · React 19.3.1 |

---

## 3. Metodología

- **Builds de producción** de las tres apps (`build` + `start`), nunca en modo dev.
- **200 conexiones**, **30 s por ejecución**, **3 ejecuciones por ruta**: Todas las métricas de carga representan tráfico concurrente sostenido.
- **Calentamiento de 5 s con las mismas 200 conexiones** antes de medir cada ruta.
- **Percentiles**: cada percentil publicado es la **mediana de ese percentil en las 3 ejecuciones**. autocannon no calcula el p95 exacto, así que donde aparezca "p95" en realidad es el **p97,5**.
- **req/s**: mediana de las 3 ejecuciones. En `results/load.json` también se guardan el mínimo y el máximo.
- **TTFB**: 30 peticiones secuenciales **sin carga**, entre el calentamiento y la medición. Es el tiempo base del servidor y no se debe comparar con la latencia bajo carga.
- **Keep-alive igual en las tres apps**: `keepAliveTimeout` de 65 s. Dinou además fija `headersTimeout` en 66 s. Next no permite configurarlo y lo deja en 60 s, el valor por defecto de Node.
- **Timeout de autocannon de 30 s o más.** Una petición que tarda mucho cuenta como **latencia**, no como timeout.
- **Ninguna instrumentación activa** durante la pasada oficial.

### Datos de las rutas

| Ruta | Qué hace |
| :--- | :--- |
| `/` | SSG, listado de 50 items |
| `/items/42` | ISR, `revalidate: 60` |
| `/dashboard` | SSR dinámico con 3 bloques Suspense de 200 ms (`await sleep(200)`) |
| `/ppr` | Shell estático y un hueco dinámico de 200 ms |
| `/messages` | SSR con `fs.promises.readFile` sobre un JSON local (en cada app, sin caché) |

---

## 4. Resultados completos

### Dinou 8.1.2

| Ruta | TTFB (sin carga) | req/s | p50 | p99 | Errores |
| :--- | ---: | ---: | ---: | ---: | :---: |
| `/` | 1,28 ms | 1.752,3 | 106 ms | 144 ms | 0 |
| `/items/42` | 0,92 ms | 1.697,4 | 106 ms | 137 ms | 0 |
| `/dashboard` | 2,70 ms | 470,0 | 407 ms | 559 ms | 0 |
| `/ppr` | 1,97 ms | 647,5 | 302 ms | 382 ms | 0 |
| `/messages` | 2,27 ms | 481,8 | 401 ms | 928 ms | 0 |

### Dinou 9.0.0

| Ruta | TTFB (sin carga) | req/s | p50 | p99 | Errores |
| :--- | ---: | ---: | ---: | ---: | :---: |
| `/` | 1,17 ms | 1.722,4 | 109 ms | 138 ms | 0 |
| `/items/42` | 0,90 ms | 1.731,8 | 106 ms | 145 ms | 0 |
| `/dashboard` | 2,61 ms | 459,5 | 414 ms | 574 ms | 0 |
| `/ppr` | 2,04 ms | 638,2 | 303 ms | 388 ms | 0 |
| `/messages` | 2,11 ms | 481,6 | 400 ms | 870 ms | 0 |

### Next.js 16.4.2

| Ruta | TTFB (sin carga) | req/s | p50 | p99 | Errores |
| :--- | ---: | ---: | ---: | ---: | :---: |
| `/` | 2,64 ms | 805,5 | 188 ms | 380 ms | 0 |
| `/items/42` | 1,93 ms | 1.310,7 | 139 ms | 177 ms | 0 |
| `/dashboard` | 7,22 ms | 194,7 | 909 ms | 7.947 ms | 0 |
| `/ppr` | 3,01 ms | 202,3 | 900 ms | 6.030 ms | 0 |
| `/messages` | 6,12 ms | 196,7 | 937 ms | 5.776 ms | 0 |

---

## 5. Reproducibilidad

Esta pasada coincide con una anterior (200 conexiones, 30 s × 3, sin calentamiento a plena concurrencia): **todas las cifras de req/s están dentro de un ±5 %**.

| Ruta | Dinou 9: anterior → oficial | Next 16: anterior → oficial |
| :--- | :--- | :--- |
| `/` | 1.658 → 1.722 (+4 %) | 846 → 806 (−5 %) |
| `/items/42` | 1.699 → 1.732 (+2 %) | 1.362 → 1.311 (−4 %) |
| `/dashboard` | 436 → 460 (+5 %) | 187 → 195 (+4 %) |
| `/ppr` | 624 → 638 (+2 %) | 200 → 202 (+1 %) |
| `/messages` | 491 → 482 (−2 %) | 195 → 197 (+1 %) |

Además, un cliente de carga distinto (Grafana k6, 200 VUs, 30 s, ruta `/`) dio la misma relación: **1.441,6 frente a 771,3 req/s (1,87×)** y un p95 de **141 frente a 261 ms**, con 0 fallos en los dos.

---

## 6. Cómo leer estos resultados

### "0 errores" es efecto del timeout de 30 s
En pasadas anteriores, con el timeout de 10 s que autocannon usa por defecto, aparecían algunos timeouts, sobre todo en Next. Con 30 s, esas peticiones cuentan como **latencia**. Por eso las cifras de errores no se pueden comparar directamente con las pasadas anteriores.

### La ráfaga inicial de conexiones
Cada ejecución abre las 200 conexiones de golpe. Mientras el event loop está ocupado con las conexiones ya activas, unas pocas conexiones nuevas esperan en la cola del kernel hasta que Node las acepta. **Pasa en los dos frameworks y no es un fallo de ninguno.** Afecta sobre todo a la latencia **máxima**. Por eso se publican p50 y p99, y no el máximo.

- En Dinou afecta a ~0,04 % de las peticiones de `/`, así que su p99 no cambia (138 ms).
- En Next afecta a ~0,7 % de las peticiones de `/`. Esas peticiones se acercan al p99, y por eso su p99 en `/` sube a 380 ms aunque su p50 sea 188 ms.

La investigación completa está en [`analysis.md`](./analysis.md).

### En las rutas dinámicas, Next está saturado
En `/dashboard`, `/ppr` y `/messages`, el p50 de Next ronda los **900 ms** y su cola llega a **6-8 s**. Dinou se mantiene en **~300-400 ms de p50** y **menos de 1 s de p99**. Con el mismo tráfico, Dinou sigue respondiendo cerca del retardo de diseño de cada ruta (200 ms por hueco) y Next acumula cola.

### ISR: menor diferencia
Los dos sirven la página desde caché, así que la diferencia de framework se nota menos (1,3× en req/s, p99 parecido).

---

## 7. Otras métricas (misma máquina, pasada completa `pnpm bench`)

| Métrica | Dinou 9.0.0 | Next.js 16.4.2 | Diferencia |
| :--- | ---: | ---: | :--- |
| Build de producción | 4,6 s | 10,0–11,3 s | **2,2–2,5× más rápido** |
| Salida del build | 4,4 MB | 37,5 MB | **8,5× menor** |
| JS al cliente (brotli) | 76,9 KiB | 149,0 KiB | **~48 % menos** |
| Arranque en frío del dev server (mediana) | 1,37 s | 3,51 s | **2,6× más rápido** |
| HMR, edición → navegador (mediana) | 206 ms | 331 ms | **1,6× más rápido** |
| RAM en reposo | ~273 MB | ~232 MB | **Next usa menos** |
| RAM pico bajo carga | ~391 MB (+118) | ~474 MB (+242) | Dinou crece la mitad |

> El HMR se mide **de principio a fin**: desde que se guarda el fichero hasta que el cambio es visible en el navegador. No es el tiempo de rebuild del bundler.
> La memoria se midió en la pasada completa con 50 conexiones, no en la pasada oficial de 200.

---

## 8. Limitaciones

- El cliente de carga y el servidor comparten máquina. Con 4 vCPU la interferencia es pequeña, pero no es cero.
- Hay una sola pasada oficial (con 3 ejecuciones por ruta). Coincide con una pasada anterior dentro de un ±5 %.
- La app de prueba es sintética: los retardos de 200 ms simulan consultas a base de datos.
- Los resultados son de Node.js en un solo proceso. Con varios procesos (`node:cluster`) o detrás de un proxy, los números absolutos cambian.
- Next.js 16 ya no tiene `experimental.ppr`. En Next, el PPR y el ISR se hacen con `cacheComponents` (`cacheLife`, `connection()`).

---

## 9. Cómo reproducirlo

```bash
git clone https://github.com/roggc/dinou-benchmark
cd dinou-benchmark/dinou-benchmark
pnpm install --frozen-lockfile
pnpm shared

ulimit -n 65535
pnpm bench:build
{ node -v; pnpm -v; uname -r; nproc; free -h; } > results/env.txt

LOAD_CONNECTIONS=200 LOAD_DURATION=30 LOAD_WARMUP=5 LOAD_RUNS=3 pnpm bench:load
pnpm bench:report
```

Los resultados se guardan en `results/load.json` y `results/REPORT.md`.
