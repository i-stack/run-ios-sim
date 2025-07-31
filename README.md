# Viber Appium 自动化测试项目

这是一个基于 Appium 的 iOS 设备自动化测试项目，专门用于 Viber 应用的注册功能测试。

## 功能特性

- ✅ 基于 Node.js 和 TypeScript 开发
- ✅ WebSocket 服务器，支持管理面板命令
- ✅ Appium 多线程支持，可同时测试多台设备
- ✅ iOS 设备自动化测试
- ✅ 网络抓包功能，捕获 API 响应
- ✅ 自动保存测试结果和 API 响应数据

## 项目结构

```
viber/
├── src/
│   ├── config/
│   │   └── appium.config.ts      # Appium 配置管理
│   ├── services/
│   │   ├── appium.service.ts     # Appium 服务
│   │   ├── websocket.service.ts  # WebSocket 服务
│   │   └── network-capture.service.ts # 网络抓包服务
│   ├── utils/
│   │   └── logger.ts             # 日志工具
│   ├── scripts/
│   │   └── capture_script.py     # mitmproxy 抓包脚本
│   ├── types/
│   │   └── index.ts              # TypeScript 类型定义
│   └── index.ts                  # 主入口文件
├── logs/                         # 日志文件目录
├── api-responses/                # API 响应数据目录
├── test-data/                    # 测试数据目录
├── package.json
├── tsconfig.json
└── env.example                   # 环境变量示例
```

## 安装和配置

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `env.example` 为 `.env` 并配置相关参数：

```bash
cp env.example .env
```

主要配置项：
- `IOS_UDID`: iOS 设备的 UDID
- `IOS_DEVICE_NAME`: 设备名称
- `IOS_PLATFORM_VERSION`: iOS 版本
- `VIBER_BUNDLE_ID`: Viber 应用的 Bundle ID
- `WS_PORT`: WebSocket 服务器端口
- `APPIUM_HOST`: Appium 服务器地址
- `APPIUM_PORT`: Appium 服务器端口

### 3. 安装 mitmproxy

```bash
pip install mitmproxy
```

### 4. 配置 iOS 设备

1. 确保 iOS 设备已越狱
2. 在设备上安装并信任 mitmproxy 证书
3. 配置设备代理设置

## 使用方法

### 启动服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### WebSocket 命令格式

服务器启动后，通过 WebSocket 发送命令：

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

- `register`: Viber 注册测试
- `login`: Viber 登录测试（待实现）
- `message`: 消息发送测试（待实现）
- `custom`: 自定义命令（待实现）

## API 响应捕获

项目会自动捕获 Viber 相关的 API 调用，并将响应数据保存到 `api-responses/` 目录中。

### 响应数据格式

```json
{
  "deviceId": "default",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "testType": "viber_registration",
  "apiResponses": [
    {
      "url": "https://api.viber.com/register",
      "method": "POST",
      "requestBody": {...},
      "responseBody": {...},
      "statusCode": 200,
      "timestamp": "2024-01-01T00:00:00.000Z",
      "deviceId": "default"
    }
  ]
}
```

## 多设备支持

项目支持同时测试多台设备：

1. 在 `AppiumConfigManager` 中添加设备配置
2. 使用不同的 `deviceId` 发送命令
3. 每个设备独立运行测试

## 日志

日志文件保存在 `logs/` 目录中：
- `combined.log`: 所有日志
- `error.log`: 错误日志

## 注意事项

1. 确保 iOS 设备已正确连接并配置
2. 确保 Appium 服务器正在运行
3. 确保 mitmproxy 证书已正确安装
4. 网络抓包功能需要设备越狱

## 故障排除

### 常见问题

1. **Appium 连接失败**
   - 检查 Appium 服务器是否运行
   - 检查设备 UDID 是否正确
   - 检查 iOS 版本兼容性

2. **网络抓包失败**
   - 检查 mitmproxy 是否安装
   - 检查证书是否正确安装
   - 检查代理设置

3. **WebSocket 连接失败**
   - 检查端口是否被占用
   - 检查防火墙设置

## 开发

### 添加新的测试功能

1. 在 `AppiumService` 中添加新的测试方法
2. 在 `index.ts` 中添加命令处理器
3. 更新类型定义

### 扩展网络抓包

1. 修改 `capture_script.py` 添加新的过滤规则
2. 在 `NetworkCaptureService` 中添加新的处理方法

## 许可证

MIT License 