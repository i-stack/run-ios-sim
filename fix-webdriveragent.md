# 修复 WebDriverAgent 问题

## 问题描述

遇到 `kAXErrorServerNotFound` 错误，这表示 WebDriverAgent 没有正确安装或启动。

## 解决方案

### 1. 检查 WebDriverAgent 状态

```bash
# 检查 WebDriverAgent 是否已安装
xcrun devicectl list devices --json | grep -A 5 -B 5 "webDriverAgentUrl"
```

### 2. 手动安装 WebDriverAgent

```bash
# 克隆 WebDriverAgent 项目
git clone https://github.com/facebook/WebDriverAgent.git
cd WebDriverAgent

# 安装依赖
npm install

# 构建 WebDriverAgent
xcodebuild -project WebDriverAgent.xcodeproj -scheme WebDriverAgentRunner -destination 'id=0C87052D-A8E5-50CB-ABC2-608D32D80CE3' test
```

### 3. 使用 Appium 自动安装

Appium 应该会自动安装 WebDriverAgent，但有时需要手动触发：

```bash
# 重启 Appium 服务器
pkill -f appium
appium --base-path /wd/hub --port 4723
```

### 4. 检查设备信任状态

确保设备已信任此计算机：

1. 在 iOS 设备上打开设置
2. 进入通用 > VPN与设备管理
3. 信任开发者证书

### 5. 重新启动设备

有时重启设备可以解决 WebDriverAgent 问题：

```bash
# 重启设备（如果支持）
xcrun devicectl device reboot 0C87052D-A8E5-50CB-ABC2-608D32D80CE3
```

## 验证修复

运行测试脚本验证 WebDriverAgent 是否正常工作：

```bash
npx ts-node src/flow/register.ts
```

如果仍然有问题，请检查：

1. Xcode 是否已安装并更新
2. iOS 设备是否已解锁
3. 设备是否已信任开发者证书
4. 网络连接是否正常 