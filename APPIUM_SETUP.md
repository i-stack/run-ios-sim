# Appium 启动和配置指南

## 🚀 快速启动步骤

### 1. 安装Appium
```bash
npm install -g appium
```

### 2. 安装iOS驱动
```bash
appium driver install xcuitest
```

### 3. 启动Appium服务器
```bash
appium
```

### 4. 启动自动化测试服务器
```bash
npm run dev
```

## 📱 iOS设备配置

### 获取设备UDID
1. 连接iOS设备到电脑
2. 打开iTunes或Finder
3. 选择设备，查看设备信息
4. 复制UDID（40位十六进制字符串）

### 配置环境变量
编辑 `.env` 文件：
```bash
IOS_UDID=你的设备UDID
IOS_DEVICE_NAME=iPhone
IOS_PLATFORM_VERSION=15.0
VIBER_BUNDLE_ID=com.viber.Viber
```

## 🔧 详细配置步骤

### 1. 检查Appium安装
```bash
appium --version
```

### 2. 检查可用驱动
```bash
appium driver list --installed
```

### 3. 启动Appium服务器（详细模式）
```bash
appium --log appium.log --local-timezone
```

### 4. 测试Appium连接
```bash
curl http://localhost:4723/status
```

## 📋 常见问题解决

### Appium启动失败
1. 检查端口4723是否被占用
2. 确保有管理员权限
3. 检查Node.js版本（建议16+）

### iOS设备连接问题
1. 确保设备已解锁
2. 信任开发者证书
3. 检查USB连接

### WebDriverAgent问题
1. 确保设备已越狱
2. 安装WebDriverAgent
3. 配置设备代理

## 🧪 测试命令

### 启动完整测试
```bash
# 终端1：启动Appium
appium

# 终端2：启动自动化服务器
npm run dev

# 终端3：运行测试
node test-client.js
```

### 快速测试
```bash
node quick-test.js
```

## 📊 监控和日志

### Appium日志
- 控制台输出：实时日志
- 文件日志：`appium.log`

### 自动化服务器日志
- 控制台输出：实时日志
- 文件日志：`logs/combined.log`

## 🔍 故障排除

### 1. Appium无法启动
```bash
# 检查端口占用
netstat -an | findstr :4723

# 杀死占用进程
taskkill /F /PID <进程ID>
```

### 2. 设备连接失败
```bash
# 检查设备列表
xcrun devicectl list devices

# 检查WebDriverAgent状态
xcrun devicectl device list
```

### 3. 网络抓包失败
```bash
# 安装mitmproxy
pip install mitmproxy

# 启动代理
mitmdump --mode transparent --listen-port 8888
```

## 📁 重要文件

- `appium.log` - Appium服务器日志
- `logs/` - 自动化服务器日志
- `api-responses/` - 捕获的API响应
- `.env` - 环境变量配置

## 🎯 下一步

1. 配置iOS设备UDID
2. 启动Appium服务器
3. 启动自动化测试服务器
4. 运行Viber注册测试
5. 查看API响应数据 