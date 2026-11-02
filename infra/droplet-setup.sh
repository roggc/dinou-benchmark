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

if [ ! -f /swapfile ] && [ "$(free -m | awk '/^Swap:/ {print $2}')" -eq 0 ]; then
  echo "==> Configuring 4 GB swap file"
  fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

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

echo "==> Repository setup"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ ! -f "$REPO_DIR/package.json" ]; then
  if [ -d /opt/dinou-benchmark ]; then
    REPO_DIR="/opt/dinou-benchmark"
  else
    echo "    Repository not found. Please clone the repository first:"
    echo "    git clone <repo-url> /opt/dinou-benchmark"
    exit 1
  fi
fi

cd "$REPO_DIR"
pnpm install --frozen-lockfile
pnpm shared
pnpm exec playwright install --with-deps chromium

cat <<NOTES

-----------------------------------------------------------------------
Next steps:
-----------------------------------------------------------------------
1) OFFICIAL CLOUD BENCHMARK WORKFLOW (Recommended)
   Evaluates all 3 targets sequentially across all 8 phases:
   (Dinou 9.0.3 Vendorized on port 3121, Dinou 9.0.3 Unvendorized on 3131,
    and Next.js 16.4.3 on port 3111)

     cd $REPO_DIR
     mkdir -p results
     { date -u; uname -a; lscpu; free -h; df -h; node -v; pnpm -v; } > results/env.txt
     ulimit -n 65535
     node scripts/verify.mjs --only=dinou-9,next --runs=10
     node scripts/bench.mjs --skip=verify

2) SINGLE-COMMAND PIPELINE (With 1 Verify Pass)
     cd $REPO_DIR && ulimit -n 65535 && pnpm bench

Methodology guidelines:
  - 5 runs per route (200 connections, 30s duration, 5s warmup, 60s timeout);
    reports the median across runs, never cherry-picked best.
  - 10 consecutive passes of all 36 E2E verification checks (360 executions/framework).
  - Run WITHOUT taskset on 4 dedicated vCPUs so the Linux scheduler places the
    server Event Loop, autocannon, libuv workers, and V8 GC across all 4 cores.
  - Do not run background tasks on the droplet while measuring.
  - Store results/*.json and results/env.txt along with the measured git commit.
-----------------------------------------------------------------------
NOTES
