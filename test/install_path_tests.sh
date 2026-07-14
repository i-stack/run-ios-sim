#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

project_dir="$tmp_dir/project"
stub_dir="$tmp_dir/bin"
mkdir -p "$project_dir" "$stub_dir"

printf 'name: install_path_test\n' > "$project_dir/pubspec.yaml"
printf '{"flutter": "3.41.7"}\n' > "$project_dir/.fvmrc"
cat > "$project_dir/.run_ios_sim.conf" <<'EOF'
DEVICE_TYPE=sim
DEVICE_UUID=497AEB7D-0C98-4F13-A597-0DF8162897E5
DEVICE_LABEL=iPhone Test
EOF

cat > "$stub_dir/open" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$stub_dir/open"

cat > "$stub_dir/xcrun" <<'EOF'
#!/usr/bin/env bash
if [ "${1:-}" = "simctl" ] && [ "${2:-}" = "boot" ]; then
  exit 0
fi
if [ "${1:-}" = "simctl" ] && [ "${2:-}" = "list" ]; then
  echo "    iPhone Test (497AEB7D-0C98-4F13-A597-0DF8162897E5) (Booted)"
  exit 0
fi
exit 0
EOF
chmod +x "$stub_dir/xcrun"

cat > "$stub_dir/fvm" <<'EOF'
#!/usr/bin/env bash
if [ "${1:-}" = "list" ]; then
  echo "3.41.7"
  exit 0
fi
if [ "${1:-}" = "flutter" ]; then
  shift
  echo "FVM_FLUTTER_CALLED $*"
  exit 0
fi
exit 0
EOF
chmod +x "$stub_dir/fvm"

RUN_IOS_SIM_RAW="file://$ROOT_DIR" bash "$ROOT_DIR/install.sh" "$project_dir" >/dev/null

output="$(cd "$project_dir" && PATH="$stub_dir:$PATH" ./run_ios_sim.sh 2>&1)"

if ! grep -q 'Flutter   : 3.41.7' <<< "$output"; then
  echo "installed run_ios_sim.sh did not parse .fvmrc version correctly" >&2
  echo "$output" >&2
  exit 1
fi

if grep -q '"flutter": "3.41.7"' <<< "$output"; then
  echo "installed run_ios_sim.sh leaked raw .fvmrc assignment into summary" >&2
  echo "$output" >&2
  exit 1
fi

if ! grep -q 'FVM_FLUTTER_CALLED run -d 497AEB7D-0C98-4F13-A597-0DF8162897E5' <<< "$output"; then
  echo "installed run_ios_sim.sh did not reach flutter run" >&2
  echo "$output" >&2
  exit 1
fi

echo "install_path_tests passed"
