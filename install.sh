#!/usr/bin/env bash
#
# install.sh — 一行命令把 run-ios-sim 引入当前 Flutter 工程
#
# 用法:
#   curl -fsSL https://raw.githubusercontent.com/i-stack/run-ios-sim/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/i-stack/run-ios-sim/main/install.sh | bash -s -- /path/to/project
#
# 环境变量:
#   RUN_IOS_SIM_RAW  可指定 raw 基址（默认 main 分支，建议改为某个 release tag 以锁定版本）
#
# 说明:
#   1) 下载 run_ios_sim.lib.sh（纯函数库）与 run_ios_sim.sh（封装入口）到目标目录
#   2) 给封装脚本加可执行权限
#   3) 把 .run_ios_sim.conf 追加进 .gitignore（配置含本机 UUID，不应入库）
#   4) 之后即可 ./run_ios_sim.sh 运行，或 source run_ios_sim.lib.sh 复用其内部函数

set -euo pipefail

REPO_RAW="${RUN_IOS_SIM_RAW:-https://raw.githubusercontent.com/i-stack/run-ios-sim/main}"
TARGET="${1:-.}"

mkdir -p "$TARGET"

echo "▶ 正在从 $REPO_RAW 安装 run-ios-sim 到 $TARGET ..."

curl -fsSL "$REPO_RAW/run_ios_sim.lib.sh" -o "$TARGET/run_ios_sim.lib.sh"
curl -fsSL "$REPO_RAW/run_ios_sim.sh"    -o "$TARGET/run_ios_sim.sh"
chmod +x "$TARGET/run_ios_sim.sh"

# 把本机配置文件加入 .gitignore（幂等）
CONF_IGNORE=".run_ios_sim.conf"
if [ -f "$TARGET/.gitignore" ]; then
  grep -qxF "$CONF_IGNORE" "$TARGET/.gitignore" || echo "$CONF_IGNORE" >> "$TARGET/.gitignore"
else
  echo "$CONF_IGNORE" > "$TARGET/.gitignore"
fi

echo
echo "✅ 安装完成！"
echo
echo "  运行方式（在 Flutter 工程根目录）:"
echo "    ./run_ios_sim.sh            # 交互选择模拟器/真机、Flutter 版本"
echo "    ./run_ios_sim.sh --real     # 使用已连接真机"
echo "    ./run_ios_sim.sh -h         # 查看全部选项"
echo
echo "  作为库复用（在你的脚本里）:"
echo "    source ./run_ios_sim.lib.sh"
echo "    run_ios_sim_main \"\$@\""
echo "    # 或直接调用 list_simulators / list_flutter_versions 等函数"
