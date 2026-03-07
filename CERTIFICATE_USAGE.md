# iOS mitmproxy 证书安装工具

## 快速开始

### 1. 检查 Appium 服务器状态
```bash
npm run check-appium
```

### 2. 启动 Appium 服务器（如果需要）
```bash
npm run appium
```

### 3. 查看可用设备
```bash
# 基本设备列表
npm run list-devices

# 详细设备信息
npm run list-devices-detailed
```

### 4. 安装证书
```bash
# 显示安装说明
npm run install-cert

# 安装证书到指定设备
npm run install-cert-device <设备ID>

# 强制重新安装证书
npm run reinstall-cert <设备ID>
```

## 示例

```bash
# 检查 Appium 服务器
npm run check-appium

# 安装证书到设备
npm run install-cert-device 00008101-00026C982160001E

# 强制重新安装
npm run reinstall-cert 00008101-00026C982160001E
```

## 故障排除

### 问题：Unknown command: "ts-node"
**解决方案：**
- 脚本已更新为使用 `npx ts-node`
- 确保在正确的目录中运行命令

### 问题：Appium server is not accessible
**解决方案：**
1. 启动 Appium 服务器：`npm run appium`
2. 检查服务器状态：`npm run check-appium`

### 问题：Could not find a pair record for device
**解决方案：**
1. 运行设备设置向导：`npm run setup-device`
2. 在 Xcode 中配对设备：
   - 打开 Xcode
   - 选择 Window > Devices and Simulators
   - 找到设备并点击 "Pair"
   - 在 iOS 设备上信任此电脑
3. 确保设备已解锁且信任此电脑

### 问题：设备连接失败
**解决方案：**
1. 确保 iOS 设备已连接到 Mac
2. 在 Xcode 中信任设备
3. 检查设备 ID 是否正确
4. 运行设备列表检查：`npm run list-devices`

## 支持的脚本

| 脚本 | 描述 |
|------|------|
| `npm run check-appium` | 检查 Appium 服务器状态 |
| `npm run appium` | 启动 Appium 服务器 |
| `npm run list-devices` | 列出可用的 iOS 设备 |
| `npm run setup-device` | 设备设置向导 |
| `npm run install-cert` | 显示证书安装说明 |
| `npm run install-cert-device` | 安装证书到指定设备 |
| `npm run reinstall-cert` | 强制重新安装证书 |
