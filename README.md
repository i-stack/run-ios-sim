# run-ios-sim

通用 iOS 运行脚本：在 macOS 上把 Flutter 应用一键跑在 **模拟器** 或 **已连接真机** 上，并支持保存常用的「设备 + Flutter 版本」组合（配置档案），避免每次重复选择。

纯 Bash 实现，无运行时依赖（仅依赖系统自带的 `xcrun` / `xctrace` 与已安装的 Flutter / fvm）。

---

## 特性

- 📱 自动列出可用 **模拟器** 与 **真机**，交互选择设备 UUID
- 🔧 自动识别 **fvm** 缓存版本或系统 `flutter`，也可手动指定版本
- 💾 把每次选择保存到工程根目录 `.run_ios_sim.conf`，下次直接复用
- 🗂️ 多套 **配置档案（profiles）**：为不同设备/版本起名，随时切换
- 🧹 `--clean` 一键清理 `Podfile.lock` 与 Flutter ephemeral 缓存
- 📦 既可作为命令行工具，也可 `source` 作为函数库复用
- 🔌 其余参数原样透传给 `flutter run`（如 `--release`）

---

## 环境要求

- macOS（脚本依赖 `xcrun`、`xctrace`）
- 已安装 Xcode 及 Command Line Tools
- 已安装 Flutter（系统 PATH 或 fvm），且当前目录为 Flutter 工程根（含 `pubspec.yaml`）

---

## 安装

### 方式一：npm 全局安装（推荐）

```bash
npm install -g flutter-ios-sim-runner
```

安装后即可在任意 Flutter 工程目录使用 `run-ios-sim` 命令。

### 方式二：一行命令引入当前工程

把脚本作为 `install.sh` 引入到你的 Flutter 工程（默认下载到当前目录）：

```bash
curl -fsSL https://raw.githubusercontent.com/i-stack/run-ios-sim/main/install.sh | bash
```

可指定目标目录与版本（标签/分支）：

```bash
# 安装到 ./tools 目录，并锁定 v1.0.1
curl -fsSL https://raw.githubusercontent.com/i-stack/run-ios-sim/main/install.sh | bash -s -- ./tools v1.0.1
```

安装内容：

1. 下载 `run_ios_sim.lib.sh`（纯函数库）与 `run_ios_sim.sh`（封装入口）
2. 给封装脚本加可执行权限

### 方式三：作为 git submodule / vendor 目录

```bash
git submodule add https://github.com/i-stack/run-ios-sim.git tools/run-ios-sim
```

脚本会自动向上查找 `pubspec.yaml` 定位 Flutter 工程根，因此放在子目录也能正常工作。

---

## 使用

在 Flutter 工程根目录运行：

```bash
# 交互选择模拟器/真机、Flutter 版本
./run_ios_sim.sh

# 使用已连接真机
./run_ios_sim.sh --real

# 直接指定设备 UUID
./run_ios_sim.sh --device 497AEB7D-0C98-4F13-A597-0DF8162897E5

# 运行前清理缓存
./run_ios_sim.sh --clean

# 透传参数给 flutter run（如打 release 包）
./run_ios_sim.sh --release
```

npm 全局安装后，等价命令为 `run-ios-sim`。

### 全部选项

| 选项 | 说明 |
| --- | --- |
| `-d, --device <UUID>` | 直接指定设备 UUID（模拟器或真机） |
| `--sim` | 使用模拟器（默认倾向） |
| `--real` | 使用已连接的真机 |
| `-c, --clean` | 运行前删除 `Podfile.lock` 与 Flutter ephemeral 缓存 |
| `--reselect` | 重新选择设备 UUID（忽略已保存配置） |
| `--reselect-flutter` | 重新选择 Flutter 版本 |
| `--profiles` | 查看已保存的设备配置 |
| `--profile <编号\|UUID\|名称>` | 使用指定的已保存设备配置 |
| `-h, --help` | 显示帮助 |

---

## 配置

### 1. 自动保存的项目配置

首次运行若未配置 UUID，会自动列出设备并在选择后保存到 Flutter 工程根目录的 `.run_ios_sim.conf`：

- 优先级：**命令行参数 > `.run_ios_sim.conf`（自动保存） > 项目 `.fvmrc` / 交互选择**
- 该文件含本机 UUID，生成或更新时会自动加入 Git 仓库根目录 `.gitignore`
- 该文件是本机配置，不应提交入库

### 2. 配置档案（profiles）

每次成功选择的设备都会保留到历史配置：

```bash
./run_ios_sim.sh --profiles          # 查看已保存配置
./run_ios_sim.sh --profile 1         # 按编号切换
./run_ios_sim.sh --profile <UUID>    # 按 UUID 切换
./run_ios_sim.sh --profile <名称>    # 按名称切换
```

---

## 作为函数库复用

在你的脚本中 `source` 函数库，复用其内部函数：

```bash
source ./run_ios_sim.lib.sh

# 直接运行主流程
run_ios_sim_main "$@"

# 或单独调用内部函数
list_simulators
list_real_devices
list_flutter_versions
select_device
select_flutter
```

---

## 项目结构

```
run-ios-sim/
├── bin/
│   └── run-ios-sim          # npm bin 入口（转发到 run_ios_sim.sh）
├── run_ios_sim.sh           # 封装入口：定位并 source 函数库，启动主流程
├── run_ios_sim.lib.sh       # 纯函数库：设备列举、Flutter 版本、菜单、运行
├── install.sh               # 一行命令安装脚本
└── package.json             # npm 元数据（bin / files）
```

---

## License

[MIT](./LICENSE)
