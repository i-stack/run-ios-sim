# 🚀 Appium服务器启动指南

## 📋 启动步骤

### 1. 检查Appium安装
```bash
# 检查Appium版本
appium --version

# 检查已安装的驱动
appium driver list --installed
```

### 2. 启动Appium服务器

#### 方法1：基本启动（推荐）
```bash
appium
```

#### 方法2：指定端口启动
```bash
appium --port 4723
```

#### 方法3：详细日志启动
```bash
appium --log appium.log --local-timezone
```

#### 方法4：后台启动
```bash
# Windows
start /B appium

# Linux/Mac
nohup appium &
```

### 3. 验证Appium服务器状态
```bash
# 检查端口是否监听
netstat -an | findstr :4723

# 测试API连接
curl http://localhost:4723/status
```

## 🔧 配置选项

### 常用启动参数
```bash
# 指定端口
appium --port 4723

# 指定主机
appium --host 0.0.0.0

# 启用日志
appium --log appium.log

# 本地时区
appium --local-timezone

# 允许不安全连接
appium --allow-insecure chromedriver_autodownload

# 指定基础路径
appium --base-path /wd/hub
```

### 完整启动命令示例
```bash
appium \
  --port 4723 \
  --host 0.0.0.0 \
  --log appium.log \
  --local-timezone \
  --allow-insecure chromedriver_autodownload
```

## 📱 iOS设备准备

### 1. 连接iOS设备
```bash
# 检查设备连接
xcrun devicectl list devices

# 或使用libimobiledevice
idevice_id -l
```

### 2. 获取设备UDID
```bash
# 使用xcrun
xcrun devicectl list devices

# 或使用libimobiledevice
idevice_id -l
```

### 3. 配置设备
- 确保设备已解锁
- 信任开发者证书
- 启用开发者模式

## 🧪 测试Appium连接

### 1. 创建测试脚本
```javascript
// test-appium.js
const { remote } = require('webdriverio');

async function testAppium() {
    const capabilities = {
        platformName: 'iOS',
        'appium:platformVersion': '15.0',
        'appium:deviceName': 'iPhone',
        'appium:automationName': 'XCUITest',
        'appium:udid': '你的设备UDID'
    };

    const options = {
        hostname: 'localhost',
        port: 4723,
        path: '/wd/hub',
        capabilities: capabilities
    };

    try {
        const driver = await remote(options);
        console.log('✅ Appium连接成功！');
        await driver.deleteSession();
    } catch (error) {
        console.error('❌ Appium连接失败:', error);
    }
}

testAppium();
```

### 2. 运行测试
```bash
node test-appium.js
```

## 🔍 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
netstat -an | findstr :4723

# 杀死占用进程
taskkill /F /PID <进程ID>
```

#### 2. 权限问题
```bash
# Windows - 以管理员身份运行
# Linux/Mac - 使用sudo
sudo appium
```

#### 3. 驱动问题
```bash
# 重新安装iOS驱动
appium driver uninstall xcuitest
appium driver install xcuitest
```

#### 4. 设备连接问题
```bash
# 检查设备连接
xcrun devicectl list devices

# 重启设备
# 重新连接USB线
```

## 📊 监控和日志

### 日志文件
- `appium.log` - Appium服务器日志
- 控制台输出 - 实时日志

### 查看日志
```bash
# 实时查看日志
tail -f appium.log

# 查看错误日志
grep ERROR appium.log
```

## 🚀 自动化启动脚本

### Windows启动脚本
```batch
@echo off
echo Starting Appium Server...
appium --port 4723 --log appium.log --local-timezone
```

### Linux/Mac启动脚本
```bash
#!/bin/bash
echo "Starting Appium Server..."
appium --port 4723 --log appium.log --local-timezone
```

## 📋 启动检查清单

- [ ] Appium已安装（版本2.19.0+）
- [ ] iOS驱动已安装（xcuitest）
- [ ] iOS设备已连接
- [ ] 设备UDID已获取
- [ ] 端口4723未被占用
- [ ] 设备已解锁并信任证书

## 🎯 与自动化项目集成

### 1. 启动Appium服务器
```bash
appium
```

### 2. 启动自动化项目
```bash
npm run dev
```

### 3. 测试连接
```bash
node quick-test.js
```

## 📞 支持

如有问题，请检查：
- Appium服务器日志
- 设备连接状态
- 端口占用情况
- 权限设置 