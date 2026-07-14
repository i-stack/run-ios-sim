# run_ios_sim.lib.sh — 纯函数库（无 shebang / 无 set / 不自动执行）
#
# 用法:
#   source run_ios_sim.lib.sh
#   然后调用 run_ios_sim_main "$@" 或单独复用下列函数:
#     list_simulators / list_real_devices / list_flutter_versions
#     select_device / select_flutter / menu_select / show_help ...
#
# 说明: 本库不依赖自身所在位置，而是通过向上查找 pubspec.yaml 定位 Flutter 工程根
#        （含 .fvmrc / .run_ios_sim.conf / ios/），因此可放在子目录（submodule / vendor）
#        中，run_ios_sim_main 会在内部 cd 到工程根，无论从何处 source 都能正确运行。

# ---------- 路径（自动向上查找 Flutter 工程根目录 pubspec.yaml）----------
# 库可能被放在子目录（git submodule / vendor），因此不能依赖自身位置定位工程根，
# 而应从当前目录向上搜索 pubspec.yaml 来确定 Flutter 工程根。
find_project_root() {
  local dir="$PWD"
  while [ -n "$dir" ]; do
    [ -f "$dir/pubspec.yaml" ] && { echo "$dir"; return 0; }
    [ "$dir" = "/" ] && break
    dir="${dir%/*}"
  done
  echo "$PWD"
}
PROJECT_ROOT="$(find_project_root)"
CONFIG_FILE="$PROJECT_ROOT/.run_ios_sim.conf"

# ---------- 默认/运行时变量 ----------
DEVICE_TYPE=""          # sim | real
DEVICE_UUID=""
FLUTTER_VERSION=""
CLEAN=0
RESELECT_DEVICE=0
RESELECT_FLUTTER=0
FLUTTER_ARGS=()

# ---------- 用户默认配置（可直接在此写死，无需 .conf 也能用）----------
# 优先级: 命令行参数 > .run_ios_sim.conf(自动保存) > 以下默认值
DEFAULT_DEVICE_TYPE=""      # sim | real（留空则首次运行交互选择）
DEFAULT_DEVICE_UUID=""      # 设备 UUID（模拟器或真机），留空则自动列出选择
DEFAULT_FLUTTER_VERSION=""  # Flutter 版本（如 3.41.7 / system），留空则用项目锁定版本

# 正则表达式（放入变量，配合 [[ $x =~ $RE ]] 使用，规避 bash 3.2 字面量正则解析陷阱）
SIM_RE='^[[:space:]]+(.+)\ \(([0-9A-Fa-f-]{36})\)\ \((.+)\)[[:space:]]*$'
REAL_RE='^(.+)\ \(([^)]+)\)[[:space:]]*$'
UUID_RE='^[0-9A-Fa-f-]{25,}$'

# 从配置读取的“上次保存”值
SAVED_DEVICE_TYPE=""
SAVED_DEVICE_UUID=""
SAVED_FLUTTER_VERSION=""

# ---------- 配置读写 ----------
load_config() {
  # 先以脚本内的默认值为底，再让 .conf 覆盖（.conf 优先级高于 DEFAULT_*）
  SAVED_DEVICE_TYPE="$DEFAULT_DEVICE_TYPE"
  SAVED_DEVICE_UUID="$DEFAULT_DEVICE_UUID"
  SAVED_FLUTTER_VERSION="$DEFAULT_FLUTTER_VERSION"
  if [ -f "$CONFIG_FILE" ]; then
    # shellcheck disable=SC1090
    source "$CONFIG_FILE"
    [ -n "$DEVICE_TYPE" ] && SAVED_DEVICE_TYPE="$DEVICE_TYPE"
    [ -n "$DEVICE_UUID" ] && SAVED_DEVICE_UUID="$DEVICE_UUID"
    [ -n "$FLUTTER_VERSION" ] && SAVED_FLUTTER_VERSION="$FLUTTER_VERSION"
  fi
  # 清空，稍后根据参数/交互重新决定
  DEVICE_TYPE=""; DEVICE_UUID=""; FLUTTER_VERSION=""
}

save_config() {
  {
    echo "# 由 run_ios_sim.sh 自动生成，可手动修改，建议加入 .gitignore"
    echo "DEVICE_TYPE=\"$DEVICE_TYPE\""
    echo "DEVICE_UUID=\"$DEVICE_UUID\""
    echo "FLUTTER_VERSION=\"$FLUTTER_VERSION\""
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
  local in_devices=1
  xcrun xctrace list devices 2>/dev/null | while IFS= read -r line; do
    line="${line%$'\r'}"   # 去除回车符，保证 -- 段标题判断与 UDID 提取准确
    # 遇到 "-- 段标题 --" 即停止（物理设备在 Devices 段，模拟器在 Simulator 段）
    if [[ "$line" == --*-- ]]; then in_devices=0; continue; fi
    [ "$in_devices" -eq 1 ] || continue
    # 形如: My iPhone (00008101-001A2B3C4D5E6F7G)
    # 真机 UDID 既可能是 40 位十六进制，也可能是 25 位新格式(含 G 等非 A-F 字符)，
    # 因此取行末最后一个括号对作为 UDID。
    if [[ "$line" =~ $REAL_RE ]]; then
      printf '%s|%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
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
run_ios_sim.sh — 通用 iOS 运行脚本（模拟器 / 真机）

用法:
  ./run_ios_sim.sh [选项] [flutter run 透传参数...]

选项:
  -d, --device <UUID>      直接指定设备 UUID（模拟器或真机）
      --sim                使用模拟器（默认倾向）
      --real               使用已连接的真机
  -c, --clean              运行前清理 Pod 缓存并重新 pod install
      --reselect           重新选择设备 UUID（忽略已保存配置）
      --reselect-flutter   重新选择 Flutter 版本
  -h, --help               显示本帮助

说明:
  • 可直接在 run_ios_sim.lib.sh 顶部的 DEFAULT_DEVICE_TYPE / DEFAULT_DEVICE_UUID /
    DEFAULT_FLUTTER_VERSION 中写死默认值，无需 .conf 也能运行。
  • 首次运行若未配置 UUID，会自动列出当前可用的模拟器或真机，
    在控制台选择后保存到 .run_ios_sim.conf（优先级高于脚本默认值，建议加入 .gitignore）。
  • 可随时用 --reselect / --reselect-flutter 更改已保存的选择。
  • 兼容旧用法: ./run_ios_sim.sh <UUID>  等同于 --device <UUID>。
  • 其余未识别的参数会原样透传给 `flutter run`（如 --release）。
EOF
}

# ---------- 主流程（库导入入口）----------
# 以库形式使用时: source run_ios_sim.lib.sh 后调用 run_ios_sim_main "$@"
run_ios_sim_main() {
  PROJECT_ROOT="$(find_project_root)"
  cd "$PROJECT_ROOT"   # 确保后续 flutter 等命令在 Flutter 工程根目录执行
  CONFIG_FILE="$PROJECT_ROOT/.run_ios_sim.conf"
  load_config

# 兼容旧用法: 第一个非选项参数若是 UUID，则视为 --device
if [[ $# -gt 0 && "$1" =~ $UUID_RE && "$1" != -* ]]; then
  DEVICE_UUID="$1"; shift
fi

while [ $# -gt 0 ]; do
  case "$1" in
    -d|--device) DEVICE_UUID="$2"; shift 2;;
    --sim)       DEVICE_TYPE="sim"; shift;;
    --real)      DEVICE_TYPE="real"; shift;;
    -c|--clean)  CLEAN=1; shift;;
    --reselect)  RESELECT_DEVICE=1; shift;;
    --reselect-flutter) RESELECT_FLUTTER=1; shift;;
    -h|--help)   show_help; exit 0;;
    *)           FLUTTER_ARGS+=("$1"); shift;;
  esac
done

# ---------- 决定运行目标类型 ----------
if [ -z "$DEVICE_TYPE" ] && [ -n "$SAVED_DEVICE_TYPE" ]; then
  DEVICE_TYPE="$SAVED_DEVICE_TYPE"
fi
if [ -z "$DEVICE_TYPE" ]; then
  menu_select "请选择运行目标 (1=模拟器, 2=真机) [1]: " $'模拟器|sim\n真机|real'
  DEVICE_TYPE="$SELECTED_VALUE"
fi

# ---------- 决定设备 UUID ----------
if [ -z "$DEVICE_UUID" ] && [ "$DEVICE_TYPE" = "$SAVED_DEVICE_TYPE" ] && [ -n "$SAVED_DEVICE_UUID" ]; then
  DEVICE_UUID="$SAVED_DEVICE_UUID"
fi
if [ -z "$DEVICE_UUID" ] || [ "$RESELECT_DEVICE" -eq 1 ]; then
  select_device
fi

# ---------- 决定 Flutter 版本 ----------
if [ -z "$FLUTTER_VERSION" ] && [ -n "$SAVED_FLUTTER_VERSION" ]; then
  FLUTTER_VERSION="$SAVED_FLUTTER_VERSION"
fi
if [ -z "$FLUTTER_VERSION" ] || [ "$RESELECT_FLUTTER" -eq 1 ]; then
  select_flutter
fi

# 保存本次选择
save_config

DEVICE_TYPE_DESC="模拟器"; [ "$DEVICE_TYPE" = "real" ] && DEVICE_TYPE_DESC="真机"

echo "============================================"
echo " 运行目标 : $DEVICE_TYPE_DESC"
echo " 设备 UUID : $DEVICE_UUID"
echo " Flutter   : ${FLUTTER_VERSION:-项目锁定}"
echo "============================================"

# ---------- 启动模拟器（真机无需 boot） ----------
if [ "$DEVICE_TYPE" = "sim" ]; then
  open -a Simulator
  xcrun simctl boot "$DEVICE_UUID" 2>/dev/null || true
  echo "等待模拟器启动: $DEVICE_UUID"
  booted=0
  for _ in $(seq 1 30); do
    if xcrun simctl list devices 2>/dev/null | grep -q "$DEVICE_UUID.*Booted"; then
      echo "模拟器已就绪 ✓"; booted=1; break
    fi
    sleep 1
  done
  [ "$booted" -eq 0 ] && echo "⚠️  模拟器可能未完全启动，继续尝试运行…"
fi

# ---------- 运行 Flutter ----------
resolve_flutter_cmd "$FLUTTER_VERSION"

if [ "$CLEAN" -eq 1 ]; then
  echo "清理 Pod 缓存并重新安装…"
  rm -f ios/Podfile.lock
  rm -rf ios/Flutter/ephemeral/Packages
fi

echo "▶ 启动 Flutter 运行: ${FLUTTER_CMD[*]}"
if [ ${#FLUTTER_ARGS[@]} -gt 0 ]; then
  "${FLUTTER_CMD[@]}" run -d "$DEVICE_UUID" "${FLUTTER_ARGS[@]}"
else
  "${FLUTTER_CMD[@]}" run -d "$DEVICE_UUID"
fi
}
