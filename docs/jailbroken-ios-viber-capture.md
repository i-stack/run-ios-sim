# 越狱手机 Viber 网络请求抓取指南

本文档详细介绍如何在越狱手机上使用 Appium 对 Viber 进行自动化测试时抓取网络请求数据。

## 📋 目录

- [概述](#概述)
- [越狱手机的优势](#越狱手机的优势)
- [系统要求](#系统要求)
- [安装和配置](#安装和配置)
- [使用方法](#使用方法)
- [高级功能](#高级功能)
- [故障排除](#故障排除)
- [示例代码](#示例代码)

## 概述

越狱手机相比普通 iOS 设备在网络抓取方面具有显著优势，主要体现在：

1. **系统级权限**: 可以修改系统网络设置
2. **证书自动信任**: 无需手动信任 mitmproxy 证书
3. **更灵活的配置**: 支持更多网络配置选项
4. **更稳定的连接**: 系统级代理配置更稳定

## 越狱手机的优势

### 1. 系统级网络配置

越狱手机可以直接修改系统网络设置，包括：
- 系统级代理配置
- SSL 证书自动安装
- 网络流量监控

### 2. 证书管理

- 自动安装 mitmproxy 证书到系统
- 无需手动信任证书
- 证书持久化存储

### 3. 更稳定的连接

- 系统级代理配置不会被应用重置
- 更稳定的网络连接
- 更好的兼容性

## 系统要求

### 硬件要求

- iOS 设备（iPhone/iPad）
- 设备已越狱
- 支持 iOS 12.0 或更高版本

### 软件要求

- macOS 10.15 或更高版本
- Xcode 12.0 或更高版本
- Appium 2.0 或更高版本
- mitmproxy 8.0 或更高版本

### 越狱工具

- Cydia/Sileo/Zebra 等包管理器
- SSH 客户端（可选）
- 文件管理器（可选）

## 安装和配置

### 1. 安装 mitmproxy

```bash
# 使用 Homebrew 安装
brew install mitmproxy

# 或使用 pip 安装
pip install mitmproxy
```

### 2. 安装项目依赖

```bash
# 进入项目目录
cd viber

# 安装依赖
npm install

# 编译 TypeScript
npm run build
```

### 3. 配置设备

```bash
# 检查设备连接
npm run check-device

# 列出可用设备
npm run list-devices

# 设置设备
npm run setup-device
```

## 使用方法

### 基本使用

```typescript
import { JailbrokenIOSViberCapture, JailbrokenViberCaptureConfig } from './src/scripts/jailbroken-ios-viber-capture';

// 配置捕获参数
const config: JailbrokenViberCaptureConfig = {
    deviceId: '00008101-00026C982160001E', // 你的设备 ID
    proxyPort: 8888,
    captureAllTraffic: false,
    enableSSLInspection: true,
    logLevel: 'info',
    autoInstallCertificate: true,
    captureTimeout: 300000, // 5 分钟
    useJailbreakFeatures: true,
    bypassSSLVerification: true
};

// 创建捕获实例
const capture = new JailbrokenIOSViberCapture(config);

// 启动捕获
await capture.startCapture();

// 等待用户操作 Viber
await new Promise(resolve => setTimeout(resolve, 60000));

// 获取捕获的响应
const responses = capture.getCapturedResponses();
const viberResponses = capture.getViberAPIResponses();

// 停止捕获
await capture.stopCapture();
```

### 高级使用

```typescript
// 高级配置
const advancedConfig: JailbrokenViberCaptureConfig = {
    deviceId: '00008101-00026C982160001E',
    proxyPort: 8889,
    captureAllTraffic: true, // 捕获所有流量
    enableSSLInspection: true,
    logLevel: 'debug',
    autoInstallCertificate: true,
    captureTimeout: 600000, // 10 分钟
    useJailbreakFeatures: true,
    bypassSSLVerification: true
};

const capture = new JailbrokenIOSViberCapture(advancedConfig);

// 启动捕获
await capture.startCapture();

// 监控捕获状态
const monitorInterval = setInterval(() => {
    const stats = capture.getCaptureStats();
    console.log(`实时统计: 总响应=${stats.totalResponses}, Viber响应=${stats.viberResponses}`);
    
    if (!stats.isCapturing) {
        clearInterval(monitorInterval);
    }
}, 10000);

// 等待捕获完成
await new Promise(resolve => setTimeout(resolve, 300000));

clearInterval(monitorInterval);

// 停止捕获
await capture.stopCapture();
```

## 高级功能

### 1. 自动越狱检测

系统会自动检测设备是否已越狱：

```typescript
// 检查越狱状态
const isJailbroken = await capture.checkJailbreakStatus(driver);
if (isJailbroken) {
    console.log('设备已越狱，可以使用高级功能');
} else {
    console.log('设备未越狱，某些功能可能受限');
}
```

### 2. 系统级代理配置

越狱设备可以配置系统级代理：

```typescript
// 配置系统级代理
await capture.configureSystemLevelProxy(driver);
```

### 3. 证书自动安装

越狱设备可以自动安装证书到系统：

```typescript
// 自动安装证书
await capture.installCertificateToSystem(driver);
```

### 4. 网络流量监控

实时监控网络流量：

```typescript
// 监控新的 API 响应
const unwatch = capture.watchForNewResponses(deviceId, (response) => {
    console.log('新的 API 响应:', response);
});
```

## 故障排除

### 1. 设备连接问题

**问题**: 无法连接到设备

**解决方案**:
```bash
# 检查设备连接
npm run check-device

# 重启 Appium 服务
npm run start-appium

# 检查设备信任状态
# 在设备上信任此电脑
```

### 2. 证书安装问题

**问题**: 证书安装失败

**解决方案**:
```bash
# 手动安装证书
npm run install-cert-device <设备ID>

# 强制重新安装
npm run reinstall-cert <设备ID>
```

### 3. 代理配置问题

**问题**: 代理配置失败

**解决方案**:
```bash
# 检查网络设置
npm run troubleshoot

# 手动配置代理
# 在设备设置中手动配置代理
```

### 4. 越狱检测问题

**问题**: 越狱检测失败

**解决方案**:
```typescript
// 手动检查越狱文件
const jailbreakFiles = [
    '/Applications/Cydia.app',
    '/Applications/Sileo.app',
    '/Applications/Zebra.app',
    '/Library/MobileSubstrate',
    '/usr/bin/ssh',
    '/usr/sbin/sshd'
];

for (const file of jailbreakFiles) {
    // 检查文件是否存在
    const exists = await checkFileExists(file);
    if (exists) {
        console.log(`发现越狱文件: ${file}`);
        return true;
    }
}
```

## 示例代码

### 完整示例

```typescript
import { JailbrokenIOSViberCapture, JailbrokenViberCaptureConfig } from './src/scripts/jailbroken-ios-viber-capture';
import { Logger } from './src/utils/logger';

const logger = new Logger('JailbrokenViberCaptureExample');

async function main() {
    try {
        logger.info('🚀 开始越狱手机 Viber 网络捕获');
        
        // 配置捕获参数
        const config: JailbrokenViberCaptureConfig = {
            deviceId: '00008101-00026C982160001E',
            proxyPort: 8888,
            captureAllTraffic: false,
            enableSSLInspection: true,
            logLevel: 'info',
            autoInstallCertificate: true,
            captureTimeout: 300000,
            useJailbreakFeatures: true,
            bypassSSLVerification: true
        };
        
        // 创建捕获实例
        const capture = new JailbrokenIOSViberCapture(config);
        
        // 启动捕获
        await capture.startCapture();
        
        // 等待用户操作
        logger.info('⏳ 等待用户操作 Viber 应用...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        // 获取捕获结果
        const responses = capture.getCapturedResponses();
        const viberResponses = capture.getViberAPIResponses();
        
        logger.info(`📊 捕获统计：总响应=${responses.length}, Viber响应=${viberResponses.length}`);
        
        // 显示 Viber API 响应
        if (viberResponses.length > 0) {
            logger.info('📡 Viber API 响应详情：');
            viberResponses.forEach((response, index) => {
                logger.info(`   ${index + 1}. ${response.method} ${response.url} (${response.statusCode})`);
            });
        }
        
        // 停止捕获
        await capture.stopCapture();
        
        logger.info('✅ 越狱手机 Viber 网络捕获完成');
        
    } catch (error) {
        logger.error('❌ 越狱手机 Viber 网络捕获失败', error);
    }
}

main().catch(console.error);
```

### 运行示例

```bash
# 运行基本示例
npx ts-node src/scripts/jailbroken-viber-capture-example.ts

# 运行特定示例
npx ts-node -e "
import { JailbrokenViberCaptureExample } from './src/scripts/jailbroken-viber-capture-example';
JailbrokenViberCaptureExample.basicExample();
"
```

## 注意事项

1. **设备安全**: 越狱设备可能存在安全风险，请谨慎使用
2. **证书管理**: 确保证书正确安装和信任
3. **网络配置**: 确保代理配置正确且稳定
4. **数据隐私**: 注意保护捕获的网络数据
5. **法律合规**: 确保使用符合当地法律法规

## 技术支持

如果遇到问题，请：

1. 查看日志文件：`logs/combined.log`
2. 检查设备连接状态
3. 验证越狱状态
4. 确认网络配置
5. 联系技术支持

## 更新日志

- **v1.0.0**: 初始版本，支持基本网络捕获功能
- **v1.1.0**: 添加越狱检测和系统级配置
- **v1.2.0**: 优化证书安装和代理配置
- **v1.3.0**: 添加高级监控和统计功能




