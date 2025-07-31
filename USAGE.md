# Viber Appium 自动化测试 - 使用指南

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境
```bash
npm run setup
```
或者手动复制并配置环境变量：
```bash
copy env.example .env
```

### 3. 启动服务器
```bash
npm run dev
```

### 4. 测试连接
```bash
node quick-test.js
```

## 📋 配置说明

### 环境变量配置 (.env)

```bash
# iOS设备配置
IOS_UDID=你的设备UDID
IOS_DEVICE_NAME=iPhone
IOS_PLATFORM_VERSION=15.0

# Viber应用配置
VIBER_BUNDLE_ID=com.viber.Viber

# WebSocket服务器配置
WS_PORT=8080

# Appium服务器配置
APPIUM_HOST=localhost
APPIUM_PORT=4723
```

### 获取iOS设备UDID

1. 连接iOS设备到电脑
2. 打开iTunes或Finder
3. 选择设备，查看设备信息
4. 复制UDID（一串40位的十六进制字符串）

## 🧪 测试命令

### WebSocket命令格式

```json
{
  "type": "command",
  "data": {
    "type": "register",
    "deviceId": "default",
    "parameters": {
      "phoneNumber": "+1234567890"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "messageId": "msg_1234567890_abc123"
}
```

### 支持的命令类型

- `register` - Viber注册测试
- `login` - Viber登录测试（待实现）
- `message` - 消息发送测试（待实现）
- `custom` - 自定义命令（待实现）

## 🔧 故障排除

### 常见问题

1. **TypeScript编译错误**
   ```bash
   npm run build
   ```

2. **WebSocket连接失败**
   - 检查端口8080是否被占用
   - 确认服务器已启动

3. **Appium连接失败**
   - 确保Appium服务器正在运行
   - 检查设备UDID是否正确
   - 确认iOS设备已连接

4. **网络抓包失败**
   - 安装mitmproxy: `pip install mitmproxy`
   - 在iOS设备上安装并信任证书
   - 配置设备代理设置

### 日志查看

日志文件保存在 `logs/` 目录：
- `combined.log` - 所有日志
- `error.log` - 错误日志

## 📁 项目结构

```
viber/
├── src/                    # 源代码
├── logs/                   # 日志文件
├── api-responses/          # API响应数据
├── test-data/              # 测试数据
├── package.json            # 项目配置
├── setup.js               # 设置脚本
├── test-client.js         # 测试客户端
├── quick-test.js          # 快速测试
└── README.md              # 详细文档
```

## 🎯 下一步

1. 配置iOS设备
2. 启动Appium服务器
3. 运行完整测试
4. 查看API响应数据

## 📞 支持

如有问题，请查看：
- `README.md` - 详细文档
- `logs/` - 日志文件
- 控制台输出 - 实时错误信息 