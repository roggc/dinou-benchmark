# results_run2/ (Official Cloud Run 2 Archive — `timeout = 60s`)

Untouched, machine-generated telemetry archive from **Official Cloud Run 2** (`6,048s` total execution on the 4 Dedicated Intel Xeon vCPU / 8 GB RAM DigitalOcean CPU-Optimized Droplet, `autocannon` `timeout = 60s = 2 × duration`, `0` timeouts across all 12 routes). These files are the **authoritative source of truth** emitted directly by `pnpm bench` and `scripts/verify.mjs` without any AI processing or manual modification:

| File | Content |
| --- | --- |
| `build.json` | Build duration and output directory size per framework |
| `verify.json` | The 36 functional & rigorous 3D caching verification checks per framework (`10` runs) |
| `dev-start.json` | Dev server cold-start duration |
| `hmr.json` | Real-browser edit-to-DOM HMR measurement |
| `bundle.json` | Client-side JavaScript bundle sizes (raw, gzip, brotli) |
| `load.json` | TTFB, req/s throughput, and latency percentiles per route (`timeout = 60s`, `0` timeouts) |
| `memory.json` | RSS memory consumption (idle and peak under 200-connection load) |
| `REPORT.md` | Auto-generated comparative Markdown report (`scripts/report.mjs`) |
| `charts.svg`, `ttfb.svg`, `bundle.svg` | Auto-generated vector benchmark charts |
| `env.txt`, `bench-run.log` | Exact hardware/kernel/runtime fingerprint and complete console execution log |

For the narrative analysis of this run, see [`../report-run2-results.md`](../report-run2-results.md) and [`../report-run1-run2-comparison.md`](../report-run1-run2-comparison.md).
