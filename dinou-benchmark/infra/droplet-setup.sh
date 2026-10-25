#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Preparación de un droplet de DigitalOcean para medir de verdad.
#
# Pensado para un droplet **CPU-Optimized con CPU dedicada** (categoría
# "CPU-Optimized" de DigitalOcean: c2/c4, vCPU dedicadas). Los droplets
# "Regular" comparten vCPU y sus números no son reproducibles.
#
#   Uso:  bash infra/droplet-setup.sh
#   Recomendado: 4 vCPU / 8 GB en Ubuntu 24.04, misma región para los dos
#   droplets (servidor y generador de carga).
#
# Dos escenarios:
#   A) DOS DROPLETS (recomendado): uno sirve la app, otro lanza autocannon.
#      Así el generador de carga no roba CPU al servidor.
#   B) UN SOLO DROPLET: hay que fijar núcleos con taskset (ver final del script).
# ---------------------------------------------------------------------------
set -euo pipefail

echo "==> Paquetes base"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates git build-essential jq unzip htop sysstat linux-tools-common >/dev/null

echo "==> Node.js 22 LTS"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v

echo "==> pnpm 12.15.0 (vía corepack, la versión que fija package.json)"
corepack enable
corepack prepare pnpm@12.15.0 --activate
pnpm -v

echo "==> autocannon (generador de carga) y k6 (alternativa)"
npm install -g autocannon@8.0.0 >/dev/null
if ! command -v k6 >/dev/null 2>&1; then
  curl -fsSL https://github.com/grafana/k6/releases/download/v0.54.0/k6-v0.54.0-linux-amd64.tar.gz \
    | tar -xz -C /usr/local/bin --strip-components=1 k6-v0.54.0-linux-amd64/k6 || true
fi

echo "==> Ajustes de red y ficheros (mediciones estables)"
cat >/etc/sysctl.d/99-bench.conf <<'EOF'
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 10240 65000
net.ipv4.tcp_tw_reuse = 1
fs.file-max = 2097152
EOF
sysctl --system >/dev/null

cat >/etc/security/limits.d/99-bench.conf <<'EOF'
* soft nofile 1048576
* hard nofile 1048576
EOF

echo "==> Repo"
if [ ! -d /opt/dinou-benchmark ]; then
  echo "    Copia el repositorio a /opt/dinou-benchmark antes de seguir:"
  echo "    scp -r dinou-benchmark root@<ip>:/opt/"
  exit 1
fi
cd /opt/dinou-benchmark
pnpm install --frozen-lockfile
pnpm shared
pnpm exec playwright install --with-deps chromium

cat <<'NOTES'

-----------------------------------------------------------------------
Siguiente paso
-----------------------------------------------------------------------
A) DOS DROPLETS (recomendado)
   Servidor  (este):      cd /opt/dinou-benchmark && pnpm bench:build && pnpm bench:load
   Generador (el otro):   autocannon -c 50 -d 30 http://<ip-privada-servidor>:3101/

   Para que `pnpm bench:load` apunte al servidor remoto en vez de a
   localhost, ejecútalo desde el droplet generador con el repo copiado y
   cambia `port`/host en bench.config.mjs, o lanza autocannon a mano
   contra la IP privada. Mantén los dos droplets en la misma región y VPC.

B) UN SOLO DROPLET (cpu pinning o ejecución automatizada)
   El benchmark automatizado prueba los 3 frameworks secuencialmente
   (Dinou 8.1.2 en puerto 3101, Dinou 9.0.0 en 3103 y Next.js en 3102):

     cd /opt/dinou-benchmark && pnpm bench

   Si prefieres lanzar pruebas manuales con taskset para separar servidor y carga:
     # Dinou 8.1.2 (puerto 3101)
     taskset -c 0,1 pnpm --dir apps/dinou-8 run start &
     taskset -c 2,3 autocannon -c 50 -d 30 http://127.0.0.1:3101/

     # Dinou 9.0.0 (puerto 3103)
     taskset -c 0,1 pnpm --dir apps/dinou-9 run start &
     taskset -c 2,3 autocannon -c 50 -d 30 http://127.0.0.1:3103/

     # Next.js 16.4.2 (puerto 3102)
     taskset -c 0,1 pnpm --dir apps/next run start &
     taskset -c 2,3 autocannon -c 50 -d 30 http://127.0.0.1:3102/

Recomendaciones de método
  - 3 rondas por ruta y mediana, nunca la mejor.
  - Deja 60 s entre frameworks para que se enfríe la máquina.
  - No ejecutes nada más en el droplet mientras mides.
  - Guarda `results/*.json` junto al commit medido.
-----------------------------------------------------------------------
NOTES

