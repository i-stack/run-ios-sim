#!/usr/bin/env bash
# 通用 iOS 运行脚本（薄封装）
#
# 本文件只负责: 定位同目录的函数库 run_ios_sim.lib.sh 并 source，
# 然后调用 run_ios_sim_main "$@" 启动主流程。
# 所有逻辑（设备列举、Flutter 版本、菜单、运行）都在 run_ios_sim.lib.sh 中。
#
# 两种用法:
#   1) 直接运行:   ./run_ios_sim.sh [选项]        （自动执行主流程）
#   2) 作为库导入: source run_ios_sim.lib.sh       （仅定义函数，不自动运行）
#                  然后可调用 run_ios_sim_main "$@" 或单独复用 list_simulators / select_device 等
#
# 详细选项见 ./run_ios_sim.sh --help
set -euo pipefail

# 定位本脚本真实目录，并 source 同目录下的函数库。
# npm bin 会创建符号链接，因此这里不能直接使用 BASH_SOURCE[0] 的 dirname。
SOURCE_PATH="${BASH_SOURCE[0]}"
while [ -L "$SOURCE_PATH" ]; do
  SOURCE_DIR="$(cd "$(dirname "$SOURCE_PATH")" && pwd)"
  LINK_TARGET="$(readlink "$SOURCE_PATH")"
  if [[ "$LINK_TARGET" = /* ]]; then
    SOURCE_PATH="$LINK_TARGET"
  else
    SOURCE_PATH="$SOURCE_DIR/$LINK_TARGET"
  fi
done
SCRIPT_DIR="$(cd "$(dirname "$SOURCE_PATH")" && pwd)"
RUN_IOS_SIM_SCRIPT_DIR="$SCRIPT_DIR"
# shellcheck disable=SC1090
source "$SCRIPT_DIR/run_ios_sim.lib.sh"

run_ios_sim_main "$@"
