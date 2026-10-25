# results/

Output directory populated by `pnpm bench`:

| File | Content |
| --- | --- |
| `build.json` | Build duration and output directory size per framework |
| `verify.json` | The 13 functional verification checks per framework |
| `dev-start.json` | Dev server cold-start duration |
| `hmr.json` | Real-browser edit-to-DOM HMR measurement |
| `bundle.json` | Client-side JavaScript bundle sizes (raw, gzip, brotli) |
| `load.json` | TTFB, req/s throughput, and latency percentiles per route |
| `memory.json` | RSS memory consumption (idle and peak under load) |
| `REPORT.md` | Generated comparative Markdown report |
| `charts.svg`, `ttfb.svg`, `bundle.svg` | Generated vector benchmark charts |

The JSON files are git-ignored by default: they are regenerated on each run.
