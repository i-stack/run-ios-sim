# run_ios_sim.lib.sh — 纯函数库（无 shebang / 无 set / 不自动执行）
#
# 用法:
#   source run_ios_sim.lib.sh
#   然后调用 run_ios_sim_main "$@" 或单独复用下列函数:
#     list_simulators / list_real_devices / list_flutter_versions
#     select_device / select_flutter / menu_select / show_help ...
#
# 说明: 本库不依赖自身所在位置，而是通过向上查找 pubspec.yaml 定位 Flutter 工程根
#        （含 .fvmrc / ios/），因此可放在子目录（submodule / vendor）中；
#        运行配置保存到工程根目录 .run_ios_sim.conf，并自动加入 Git 仓库根 .gitignore。

# ---------- 路径（自动向上查找 Flutter 工程根目录 pubspec.yaml）----------
# 库可能被放在子目录（git submodule / vendor），因此不能依赖自身位置定位工程根，
# 而应从当前目录向上搜索 pubspec.yaml 来确定 Flutter 工程根。
find_project_root() {
  local dir="${1:-$PWD}"
  while [ -n "$dir" ]; do
    [ -f "$dir/pubspec.yaml" ] && { echo "$dir"; return 0; }
    [ "$dir" = "/" ] && break
    dir="${dir%/*}"
  done
  return 1
}

PROJECT_ROOT=""
CONFIG_FILE=""

# ---------- 默认/运行时变量 ----------
DEVICE_TYPE=""          # sim | real
DEVICE_UUID=""
DEVICE_LABEL=""
FLUTTER_VERSION=""
ARG_DEVICE_TYPE=""
ARG_DEVICE_UUID=""
CLEAN=0
RESELECT_DEVICE=0
RESELECT_FLUTTER=0
LIST_PROFILES=0
PROFILE_SELECTOR=""
PROFILE_APPLIED=0
FLUTTER_ARGS=()

# 正则表达式（放入变量，配合 [[ $x =~ $RE ]] 使用，规避 bash 3.2 字面量正则解析陷阱）
SIM_RE='^[[:space:]]+(.+)\ \(([0-9A-Fa-f-]{36})\)\ \((.+)\)[[:space:]]*$'
REAL_RE='^(.+)\ \([0-9]+(\.[0-9]+)*\)\ \(([^)]+)\)[[:space:]]*$'

# 从配置读取的“上次保存”值
SAVED_DEVICE_TYPE=""
SAVED_DEVICE_UUID=""
SAVED_DEVICE_LABEL=""
SAVED_FLUTTER_VERSION=""
PROFILE_LABELS=()
PROFILE_DEVICE_TYPES=()
PROFILE_DEVICE_UUIDS=()
PROFILE_FLUTTER_VERSIONS=()

# ---------- 配置读写 ----------
configure_config_paths() {
  CONFIG_FILE="$PROJECT_ROOT/.run_ios_sim.conf"
}

ensure_config_ignored() {
  local git_root prefix ignore_file config_pattern
  git_root="$(git -C "$PROJECT_ROOT" rev-parse --show-toplevel 2>/dev/null)" || return 0
  prefix="$(git -C "$PROJECT_ROOT" rev-parse --show-prefix 2>/dev/null || true)"
  ignore_file="$git_root/.gitignore"
  config_pattern="/${prefix}.run_ios_sim.conf"

  if [ -f "$ignore_file" ]; then
    grep -qxF "$config_pattern" "$ignore_file" && return 0
    if [ -z "$prefix" ] && grep -qxF ".run_ios_sim.conf" "$ignore_file"; then
      return 0
    fi
    printf '\n%s\n' "$config_pattern" >> "$ignore_file"
  else
    printf '%s\n' "$config_pattern" > "$ignore_file"
  fi
}

conf_value() {
  local name="$1"
  printf '%s' "${!name-}"
}

write_assignment() {
  local key="$1"
  local value="$2"
  local escaped="${value//\\/\\\\}"
  printf '%s=%s\n' "$key" "$escaped"
}

decode_config_value() {
  local raw="$1"
  local out="" i ch len

  len=${#raw}
  for ((i = 0; i < len; i++)); do
    ch="${raw:i:1}"
    if [ "$ch" = "\\" ] && [ $((i + 1)) -lt "$len" ]; then
      i=$((i + 1))
      out+="${raw:i:1}"
    else
      out+="$ch"
    fi
  done
  printf '%s' "$out"
}

set_config_value() {
  local key="$1"
  local value="$2"
  case "$key" in
    DEVICE_TYPE|DEVICE_UUID|DEVICE_LABEL|FLUTTER_VERSION|PROFILE_COUNT)
      printf -v "$key" '%s' "$value"
      ;;
    PROFILE_*_LABEL|PROFILE_*_DEVICE_TYPE|PROFILE_*_DEVICE_UUID|PROFILE_*_FLUTTER_VERSION)
      [[ "$key" =~ ^PROFILE_[0-9]+_(LABEL|DEVICE_TYPE|DEVICE_UUID|FLUTTER_VERSION)$ ]] || return 0
      printf -v "$key" '%s' "$value"
      ;;
  esac
}

read_config_file() {
  local file="$1"
  local line key raw value
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" == *=* ]] || continue
    key="${line%%=*}"
    raw="${line#*=}"
    value="$(decode_config_value "$raw")"
    set_config_value "$key" "$value"
  done < "$file"
}

reset_runtime_state() {
  DEVICE_TYPE=""
  DEVICE_UUID=""
  DEVICE_LABEL=""
  FLUTTER_VERSION=""
  ARG_DEVICE_TYPE=""
  ARG_DEVICE_UUID=""
  CLEAN=0
  RESELECT_DEVICE=0
  RESELECT_FLUTTER=0
  LIST_PROFILES=0
  PROFILE_SELECTOR=""
  PROFILE_APPLIED=0
  FLUTTER_ARGS=()
}

load_profiles_from_config() {
  PROFILE_LABELS=()
  PROFILE_DEVICE_TYPES=()
  PROFILE_DEVICE_UUIDS=()
  PROFILE_FLUTTER_VERSIONS=()
  local count="${PROFILE_COUNT:-0}"
  local i label dtype duuid fver
  for i in $(seq 1 "$count" 2>/dev/null); do
    label="$(conf_value "PROFILE_${i}_LABEL")"
    dtype="$(conf_value "PROFILE_${i}_DEVICE_TYPE")"
    duuid="$(conf_value "PROFILE_${i}_DEVICE_UUID")"
    fver="$(conf_value "PROFILE_${i}_FLUTTER_VERSION")"
    [ -n "$dtype" ] && [ -n "$duuid" ] || continue
    PROFILE_LABELS+=("${label:-$duuid}")
    PROFILE_DEVICE_TYPES+=("$dtype")
    PROFILE_DEVICE_UUIDS+=("$duuid")
    PROFILE_FLUTTER_VERSIONS+=("$fver")
  done
  PROFILE_COUNT="${#PROFILE_DEVICE_UUIDS[@]}"
}

profile_upsert() {
  local label="$1"
  local dtype="$2"
  local duuid="$3"
  local fver="$4"
  [ -n "$dtype" ] && [ -n "$duuid" ] || return 0
  [ -n "$label" ] || label="$duuid"

  local idx
  for idx in "${!PROFILE_DEVICE_UUIDS[@]}"; do
    if [ "${PROFILE_DEVICE_UUIDS[$idx]}" = "$duuid" ]; then
      PROFILE_LABELS[$idx]="$label"
      PROFILE_DEVICE_TYPES[$idx]="$dtype"
      PROFILE_FLUTTER_VERSIONS[$idx]="$fver"
      return 0
    fi
  done

  PROFILE_LABELS+=("$label")
  PROFILE_DEVICE_TYPES+=("$dtype")
  PROFILE_DEVICE_UUIDS+=("$duuid")
  PROFILE_FLUTTER_VERSIONS+=("$fver")
}

list_saved_profiles() {
  if [ "${#PROFILE_DEVICE_UUIDS[@]}" -eq 0 ]; then
    echo "未保存任何设备配置。"
    return 0
  fi
  local idx dtype_desc
  for idx in "${!PROFILE_DEVICE_UUIDS[@]}"; do
    dtype_desc="模拟器"
    [ "${PROFILE_DEVICE_TYPES[$idx]}" = "real" ] && dtype_desc="真机"
    printf '%2d) %s | %s | %s | Flutter: %s\n' \
      "$((idx + 1))" \
      "${PROFILE_LABELS[$idx]}" \
      "$dtype_desc" \
      "${PROFILE_DEVICE_UUIDS[$idx]}" \
      "${PROFILE_FLUTTER_VERSIONS[$idx]:-项目锁定}"
  done
}

apply_profile() {
  local selector="$1"
  local idx=""
  if [[ "$selector" =~ ^[0-9]+$ ]] && [ "$selector" -ge 1 ] && [ "$selector" -le "${#PROFILE_DEVICE_UUIDS[@]}" ]; then
    idx=$((selector - 1))
  else
    local i
    for i in "${!PROFILE_DEVICE_UUIDS[@]}"; do
      if [ "${PROFILE_DEVICE_UUIDS[$i]}" = "$selector" ] || [ "${PROFILE_LABELS[$i]}" = "$selector" ]; then
        idx="$i"
        break
      fi
    done
  fi

  [ -n "$idx" ] || { echo "未找到设备配置: $selector" >&2; exit 1; }
  DEVICE_LABEL="${PROFILE_LABELS[$idx]}"
  DEVICE_TYPE="${PROFILE_DEVICE_TYPES[$idx]}"
  DEVICE_UUID="${PROFILE_DEVICE_UUIDS[$idx]}"
  FLUTTER_VERSION="${PROFILE_FLUTTER_VERSIONS[$idx]}"
  PROFILE_APPLIED=1
}

load_config() {
  SAVED_DEVICE_TYPE=""
  SAVED_DEVICE_UUID=""
  SAVED_DEVICE_LABEL=""
  SAVED_FLUTTER_VERSION=""
  if [ -f "$CONFIG_FILE" ]; then
    read_config_file "$CONFIG_FILE"
    [ -n "$DEVICE_TYPE" ] && SAVED_DEVICE_TYPE="$DEVICE_TYPE"
    [ -n "$DEVICE_UUID" ] && SAVED_DEVICE_UUID="$DEVICE_UUID"
    [ -n "${DEVICE_LABEL:-}" ] && SAVED_DEVICE_LABEL="$DEVICE_LABEL"
    [ -n "$FLUTTER_VERSION" ] && SAVED_FLUTTER_VERSION="$FLUTTER_VERSION"
    load_profiles_from_config
  fi
  # 清空，稍后根据参数/交互重新决定
  DEVICE_TYPE=""; DEVICE_UUID=""; DEVICE_LABEL=""; FLUTTER_VERSION=""
}

save_config() {
  profile_upsert "$SAVED_DEVICE_LABEL" "$SAVED_DEVICE_TYPE" "$SAVED_DEVICE_UUID" "$SAVED_FLUTTER_VERSION"
  profile_upsert "$DEVICE_LABEL" "$DEVICE_TYPE" "$DEVICE_UUID" "$FLUTTER_VERSION"
  ensure_config_ignored
  {
    echo "# 由 run_ios_sim.sh 自动生成，可手动修改，已自动加入 .gitignore"
    write_assignment "PROJECT_ROOT" "$PROJECT_ROOT"
    write_assignment "DEVICE_TYPE" "$DEVICE_TYPE"
    write_assignment "DEVICE_UUID" "$DEVICE_UUID"
    write_assignment "DEVICE_LABEL" "$DEVICE_LABEL"
    write_assignment "FLUTTER_VERSION" "$FLUTTER_VERSION"
    write_assignment "PROFILE_COUNT" "${#PROFILE_DEVICE_UUIDS[@]}"
    local idx n
    for idx in "${!PROFILE_DEVICE_UUIDS[@]}"; do
      n=$((idx + 1))
      write_assignment "PROFILE_${n}_LABEL" "${PROFILE_LABELS[$idx]}"
      write_assignment "PROFILE_${n}_DEVICE_TYPE" "${PROFILE_DEVICE_TYPES[$idx]}"
      write_assignment "PROFILE_${n}_DEVICE_UUID" "${PROFILE_DEVICE_UUIDS[$idx]}"
      write_assignment "PROFILE_${n}_FLUTTER_VERSION" "${PROFILE_FLUTTER_VERSIONS[$idx]}"
    done
  } > "$CONFIG_FILE"
}

# ---------- 设备列表 ----------
# 输出 "名称 (状态)|UUID" 每行一个
list_simulators() {
  xcrun simctl list devices available 2>/dev/null | while IFS= read -r line; do
    line="${line%$'\r'}"   # 去除 xcrun 输出可能带有的回车符
    # 形如:     iPhone 16 (497AEB7D-0C98-4F13-A597-0DF8162897E5) (Booted)
    if [[ "$line" =~ $SIM_RE ]]; then
      printf '%s (%s)|%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[3]}" "${BASH_REMATCH[2]}"
    fi
  done
}

# 输出 "名称|UUID" 每行一个（仅物理设备）
list_real_devices() {
  local in_devices=0
  xcrun xctrace list devices 2>/dev/null | while IFS= read -r line; do
    line="${line%$'\r'}"   # 去除回车符，保证 -- 段标题判断与 UDID 提取准确
    if [[ "$line" == "== Devices ==" ]]; then in_devices=1; continue; fi
    if [[ "$line" == "== Devices Offline ==" || "$line" == "== Simulators ==" ]]; then in_devices=0; continue; fi
    [ "$in_devices" -eq 1 ] || continue
    # 形如: My iPhone (18.7.9) (00008101-001A2B3C4D5E6F7G)
    # 本机 Mac 通常没有 iOS 版本号括号，离线设备和模拟器在其它段落，均不应进入真机列表。
    # 真机 UDID 既可能是 40 位十六进制，也可能是 25 位新格式(含 G 等非 A-F 字符)，
    # 因此取行末最后一个括号对作为 UDID。
    if [[ "$line" =~ $REAL_RE ]]; then
      printf '%s|%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[3]}"
    fi
  done
}

# ---------- Flutter 版本列表 ----------
# 探测 fvm 的 SDK 缓存目录（不同机器/配置路径不同，故动态获取）
fvm_cache_dir() {
  local d=""
  if command -v fvm >/dev/null 2>&1; then
    d="$(fvm list 2>/dev/null | grep -i 'Cache Directory' | head -1 | sed -E 's/^[^:]*:[[:space:]]*//')"
  fi
  if [ -z "$d" ] && [ -n "${FVM_DIR:-}" ]; then d="$FVM_DIR/versions"; fi
  if [ -z "$d" ] && [ -d "$HOME/.fvm/versions" ]; then d="$HOME/.fvm/versions"; fi
  echo "$d"
}

list_flutter_versions() {
  local cache
  cache="$(fvm_cache_dir)"
  if [ -n "$cache" ] && [ -d "$cache" ]; then
    local d
    for d in "$cache"/*; do
      [ -x "$d/bin/flutter" ] && basename "$d"
    done
  fi
  command -v flutter >/dev/null 2>&1 && echo "system"
}

default_flutter_version() {
  [ -f "$PROJECT_ROOT/.fvmrc" ] || return 0
  grep -o '"flutter"[[:space:]]*:[[:space:]]*"[^"]*"' "$PROJECT_ROOT/.fvmrc" 2>/dev/null \
    | sed -E 's/.*:"([^"]*)".*/\1/'
}

# 根据版本解析出可执行的 flutter 命令（写入全局数组 FLUTTER_CMD）
resolve_flutter_cmd() {
  local ver="$1"
  local cache="${2:-}"
  if [ -z "$ver" ]; then
    if command -v fvm >/dev/null 2>&1; then
      FLUTTER_CMD=(fvm flutter)
    else
      FLUTTER_CMD=(flutter)
    fi
    return
  fi
  if [ "$ver" = "system" ]; then
    FLUTTER_CMD=("$(command -v flutter)")
    return
  fi
  if [ -z "$cache" ]; then cache="$(fvm_cache_dir)"; fi
  if [ -n "$cache" ] && [ -x "$cache/$ver/bin/flutter" ]; then
    FLUTTER_CMD=("$cache/$ver/bin/flutter")
    return
  fi
  if command -v fvm >/dev/null 2>&1; then
    echo "⚠️  版本 $ver 未在 fvm 中安装，将使用 fvm 锁定版本运行。" >&2
    FLUTTER_CMD=(fvm flutter)
  else
    FLUTTER_CMD=(flutter)
  fi
}

# ---------- 通用菜单选择 ----------
# 用法: menu_select "提示" $'显示1|值1\n显示2|值2' [默认值]
# 选择结果写入全局 SELECTED_VALUE
menu_select() {
  local prompt="$1"
  local items="$2"
  local default="${3:-}"
  local -a displays=() values=()
  local i=0
  while IFS='|' read -r disp val; do
    [ -z "$disp" ] && continue
    i=$((i + 1))
    displays+=("$disp"); values+=("$val")
    printf '  %2d) %s\n' "$i" "$disp"
  done <<< "$items"
  echo
  local choice=""
  read -r -p "$prompt" choice < /dev/tty || true
  if [ -z "$choice" ]; then
    if [ -n "$default" ]; then
      local idx
      for idx in "${!values[@]}"; do
        if [ "${values[$idx]}" = "$default" ]; then choice=$((idx + 1)); break; fi
      done
      [ -z "$choice" ] && choice=1
    else
      choice=1
    fi
  fi
  if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "$i" ]; then
    echo "无效选择: $choice" >&2
    exit 1
  fi
  SELECTED_DISPLAY="${displays[$((choice - 1))]}"
  SELECTED_VALUE="${values[$((choice - 1))]}"
}

select_device() {
  local items=""
  if [ "$DEVICE_TYPE" = "sim" ]; then
    echo "📱 可用模拟器:"
    items="$(list_simulators)"
    [ -z "$items" ] && { echo "未找到可用模拟器，请先通过 Xcode 安装对应 runtime。"; exit 1; }
  else
    echo "📱 已连接真机:"
    items="$(list_real_devices)"
    [ -z "$items" ] && { echo "未找到已连接真机，请确认设备已通过 USB 连接并信任本机。"; exit 1; }
  fi
  menu_select "请选择设备 [1]: " "$items"
  DEVICE_LABEL="$SELECTED_DISPLAY"
  DEVICE_UUID="$SELECTED_VALUE"
}

select_flutter() {
  local items=""
  items="$(list_flutter_versions | while IFS= read -r v; do [ -n "$v" ] && echo "$v|$v"; done)"
  local def
  def="$(default_flutter_version)"
  [ -n "$def" ] && echo "提示: 项目锁定版本为 $def"
  [ -z "$items" ] && { echo "未找到已安装的 Flutter（fvm 或系统 PATH）。"; exit 1; }
  menu_select "请选择 Flutter 版本 [默认 $def]: " "$items" "$def"
  FLUTTER_VERSION="$SELECTED_VALUE"
}

# ---------- 帮助 ----------
show_help() {
  cat <<'EOF'
run-ios-sim — 通用 iOS 运行脚本（模拟器 / 真机）

用法:
  run-ios-sim [选项] [flutter run 透传参数...]
  ./run_ios_sim.sh [选项] [flutter run 透传参数...]

选项:
  -d, --device <UUID>      直接指定设备 UUID（模拟器或真机）
      --sim                使用模拟器（默认倾向）
      --real               使用已连接的真机
  -c, --clean              运行前删除 Podfile.lock 与 Flutter ephemeral 缓存
      --reselect           重新选择设备 UUID（忽略已保存配置）
      --reselect-flutter   重新选择 Flutter 版本
      --profiles           查看已保存的设备配置
      --profile <编号|UUID|名称>
                            使用已保存的设备配置
  -h, --help               显示本帮助

说明:
  • 首次运行若未配置 UUID，会自动列出当前可用的模拟器或真机，
    在控制台选择后保存到工程根目录 .run_ios_sim.conf，并自动加入 Git 仓库根 .gitignore。
  • 每次成功选择设备都会保留到历史配置；可用 --profiles 查看，用 --profile 切换。
  • 可随时用 --reselect / --reselect-flutter 更改当前默认选择。
  • 其余未识别的参数会原样透传给 `flutter run`（如 --release）。
EOF
}

prepare_project_context() {
  PROJECT_ROOT="$(find_project_root "$PWD" || find_project_root "${RUN_IOS_SIM_SCRIPT_DIR:-$PWD}")" || {
    echo "未找到 Flutter 工程根目录（需要 pubspec.yaml）。请在工程目录内运行，或把脚本放在工程目录/子目录中。" >&2
    exit 1
  }
  cd "$PROJECT_ROOT"   # 确保后续 flutter 等命令在 Flutter 工程根目录执行
  configure_config_paths
  load_config
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -d|--device)
        [ $# -ge 2 ] && [[ "$2" != -* ]] || { echo "$1 需要设备 UUID 参数。" >&2; exit 1; }
        ARG_DEVICE_UUID="$2"; shift 2;;
      --sim)       ARG_DEVICE_TYPE="sim"; shift;;
      --real)      ARG_DEVICE_TYPE="real"; shift;;
      -c|--clean)  CLEAN=1; shift;;
      --reselect)  RESELECT_DEVICE=1; shift;;
      --reselect-flutter) RESELECT_FLUTTER=1; shift;;
      --profiles)  LIST_PROFILES=1; shift;;
      --profile)
        [ $# -ge 2 ] && [[ "$2" != -* ]] || { echo "$1 需要配置编号、UUID 或名称参数。" >&2; exit 1; }
        PROFILE_SELECTOR="$2"; shift 2;;
      -h|--help)   show_help; exit 0;;
      *)           FLUTTER_ARGS+=("$1"); shift;;
    esac
  done
}

apply_requested_profile_and_device() {
  if [ "$LIST_PROFILES" -eq 1 ]; then
    list_saved_profiles
    exit 0
  fi

  [ -n "$PROFILE_SELECTOR" ] && apply_profile "$PROFILE_SELECTOR"
  [ -n "$ARG_DEVICE_TYPE" ] && DEVICE_TYPE="$ARG_DEVICE_TYPE"
  if [ -n "$ARG_DEVICE_UUID" ]; then
    DEVICE_UUID="$ARG_DEVICE_UUID"
    DEVICE_LABEL="$ARG_DEVICE_UUID"
  fi
}

choose_device_type() {
  if [ -z "$DEVICE_TYPE" ] && [ -n "$SAVED_DEVICE_TYPE" ]; then
    DEVICE_TYPE="$SAVED_DEVICE_TYPE"
  fi
  if [ -z "$DEVICE_TYPE" ]; then
    menu_select "请选择运行目标 (1=模拟器, 2=真机) [1]: " $'模拟器|sim\n真机|real'
    DEVICE_TYPE="$SELECTED_VALUE"
  fi
}

choose_device_uuid() {
  if [ -z "$DEVICE_UUID" ] && [ "$DEVICE_TYPE" = "$SAVED_DEVICE_TYPE" ] && [ -n "$SAVED_DEVICE_UUID" ]; then
    DEVICE_UUID="$SAVED_DEVICE_UUID"
  fi
  if [ -z "$DEVICE_UUID" ] || [ "$RESELECT_DEVICE" -eq 1 ]; then
    select_device
  fi
}

choose_flutter_version() {
  local locked_version
  locked_version="$(default_flutter_version)"

  if [ -z "$FLUTTER_VERSION" ] && [ "$PROFILE_APPLIED" -eq 0 ] && [ -n "$SAVED_FLUTTER_VERSION" ]; then
    FLUTTER_VERSION="$SAVED_FLUTTER_VERSION"
  fi
  if [ "$RESELECT_FLUTTER" -eq 1 ]; then
    select_flutter
  elif [ -z "$FLUTTER_VERSION" ] && [ "$PROFILE_APPLIED" -eq 0 ] && [ -n "$locked_version" ]; then
    FLUTTER_VERSION="$locked_version"
  elif [ -z "$FLUTTER_VERSION" ] && [ "$PROFILE_APPLIED" -eq 0 ]; then
    select_flutter
  fi
}

print_run_summary() {
  local device_type_desc="模拟器"
  [ "$DEVICE_TYPE" = "real" ] && device_type_desc="真机"

  echo "============================================"
  echo " 运行目标 : $device_type_desc"
  echo " 设备 UUID : $DEVICE_UUID"
  echo " Flutter   : ${FLUTTER_VERSION:-项目锁定}"
  echo "============================================"
}

boot_simulator_if_needed() {
  [ "$DEVICE_TYPE" = "sim" ] || return 0
  local booted=0

  open -a Simulator
  xcrun simctl boot "$DEVICE_UUID" 2>/dev/null || true
  echo "等待模拟器启动: $DEVICE_UUID"
  for _ in $(seq 1 30); do
    if xcrun simctl list devices 2>/dev/null | grep -q "$DEVICE_UUID.*Booted"; then
      echo "模拟器已就绪 ✓"; booted=1; break
    fi
    sleep 1
  done
  [ "$booted" -eq 0 ] && echo "⚠️  模拟器可能未完全启动，继续尝试运行…"
}

clean_ios_artifacts_if_requested() {
  [ "$CLEAN" -eq 1 ] || return 0

  echo "删除 Podfile.lock 与 Flutter ephemeral 缓存…"
  rm -f ios/Podfile.lock
  rm -rf ios/Flutter/ephemeral/Packages
}

run_flutter_app() {
  resolve_flutter_cmd "$FLUTTER_VERSION"
  echo "▶ 启动 Flutter 运行: ${FLUTTER_CMD[*]}"
  if [ ${#FLUTTER_ARGS[@]} -gt 0 ]; then
    "${FLUTTER_CMD[@]}" run -d "$DEVICE_UUID" "${FLUTTER_ARGS[@]}"
  else
    "${FLUTTER_CMD[@]}" run -d "$DEVICE_UUID"
  fi
}

# ---------- 主流程（库导入入口）----------
# 以库形式使用时: source run_ios_sim.lib.sh 后调用 run_ios_sim_main "$@"
run_ios_sim_main() {
  if [[ $# -gt 0 && ( "$1" = "-h" || "$1" = "--help" ) ]]; then
    show_help
    exit 0
  fi

  reset_runtime_state
  prepare_project_context
  parse_args "$@"
  apply_requested_profile_and_device
  choose_device_type
  choose_device_uuid
  choose_flutter_version
  save_config
  print_run_summary
  boot_simulator_if_needed
  clean_ios_artifacts_if_requested
  run_flutter_app
}
