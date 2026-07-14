#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/run_ios_sim.lib.sh"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

PROJECT_ROOT="$tmp_dir"
printf '{"flutter": "3.41.7"}\n' > "$PROJECT_ROOT/.fvmrc"
actual="$(default_flutter_version)"
if [ "$actual" != "3.41.7" ]; then
  echo "default_flutter_version parsed '$actual', expected '3.41.7'" >&2
  exit 1
fi

path_dir="$tmp_dir/bin"
mkdir -p "$path_dir"
cat > "$path_dir/fvm" <<'EOF'
#!/usr/bin/env bash
if [ "${1:-}" = "list" ]; then
  echo "3.41.7"
fi
EOF
chmod +x "$path_dir/fvm"

PATH="$path_dir:$PATH"
actual="$(fvm_cache_dir)"
if [ -n "$actual" ]; then
  echo "fvm_cache_dir returned '$actual', expected empty fallback when Cache Directory is absent" >&2
  exit 1
fi

echo "run_ios_sim_lib_tests passed"
