#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# DigitalOcean droplet preparation script for rigorous, reproducible benchmarks.
#
# Designed for a **CPU-Optimized droplet with Dedicated vCPUs** (DigitalOcean
# "CPU-Optimized" category: c2/c4, dedicated vCPUs). "Regular" droplets share
# vCPUs with other tenants, making their results noisy and non-reproducible.
#
#   Usage:        bash infra/droplet-setup.sh
#   Recommended:  4 Dedicated vCPUs / 8 GB RAM on Ubuntu 24.04 LTS.
# ---------------------------------------------------------------------------
set -euo pipefail

echo "==> Base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates git build-essential jq unzip htop sysstat linux-tools-common >/dev/null

echo "==> Node.js 22 LTS"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v

echo "==> pnpm 12.15.0 (via corepack, pinned in package.json)"
corepack enable
corepack prepare pnpm@12.15.0 --activate
pnpm -v

echo "==> autocannon (load generator) and k6 (alternative)"
npm install -g autocannon@8.0.0 >/dev/null
if ! command -v k6 >/dev/null 2>&1; then
  curl -fsSL https://github.com/grafana/k6/releases/download/v0.54.0/k6-v0.54.0-linux-amd64.tar.gz \
    | tar -xz -C /usr/local/bin --strip-components=1 k6-v0.54.0-linux-amd64/k6 || true
fi

echo "==> Network and file descriptor tuning (reproducible measurements)"
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

echo "==> Repository validation"
if [ ! -d /opt/dinou-benchmark ]; then
  echo "    Copy the repository to /opt/dinou-benchmark before proceeding:"
  echo "    scp -r dinou-benchmark root@<ip>:/opt/"
  exit 1
fi
cd /opt/dinou-benchmark
pnpm install --frozen-lockfile
pnpm shared
pnpm exec playwright install --with-deps chromium

cat <<'NOTES'

-----------------------------------------------------------------------
Next steps:
-----------------------------------------------------------------------
1) AUTOMATED BENCHMARK (Recommended)
   Runs all 3 frameworks sequentially across all 8 phases:
   (Dinou 8.1.2 on port 3101, Dinou 9.0.0 on 3103, and Next.js 16.4.2 on 3102)

     cd /opt/dinou-benchmark && pnpm bench

2) MANUAL TESTS WITH CPU PINNING (Optional)
   If you wish to run manual load tests isolating server and load generator:
     # Dinou 8.1.2 (port 3101)
     taskset -c 0,1 pnpm --dir apps/dinou-8 run start &
     taskset -c 2,3 autocannon -c 50 -d 30 http://127.0.0.1:3101/

     # Dinou 9.0.0 (port 3103)
     taskset -c 0,1 pnpm --dir apps/dinou-9 run start &
     taskset -c 2,3 autocannon -c 50 -d 30 http://127.0.0.1:3103/

     # Next.js 16.4.2 (port 3102)
     taskset -c 0,1 pnpm --dir apps/next run start &
     taskset -c 2,3 autocannon -c 50 -d 30 http://127.0.0.1:3102/

Methodology guidelines:
  - 3 runs per route; report the median, never cherry-picked best.
  - Cooldown pause between frameworks to allow OS TCP stack recovery.
  - Do not run background tasks on the droplet while measuring.
  - Store results/*.json along with the measured git commit.
-----------------------------------------------------------------------
NOTES
