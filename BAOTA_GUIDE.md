# 🚀 宝塔面板专用打包指南

## 📋 使用方法

### 1. 运行打包脚本
```bash
npm run build:prod
```

### 2. 查看打包结果
打包完成后，会在项目根目录生成 `production/` 文件夹，包含：

```
production/
├── dist/                    # 编译后的JavaScript文件（已混淆）
├── logs/                   # 日志目录
├── api-responses/          # API响应数据目录
├── test-data/              # 测试数据目录
├── mitmproxy/              # 代理配置目录
├── package.json            # 宝塔面板专用配置
├── env.example            # 环境变量示例
└── README.md              # 宝塔面板部署指南
```

## 🎯 宝塔面板部署

### 1. 上传文件
将 `production/` 文件夹上传到宝塔面板服务器

### 2. 创建Node.js项目
在宝塔面板中：
- **项目名称**: viber-appium-automation
- **项目路径**: 上传的文件夹路径
- **启动文件**: dist/index.js
- **端口**: 8080

### 3. 配置环境变量
复制 `env.example` 为 `.env` 并编辑：
```bash
# iOS设备配置
IOS_UDID=你的设备UDID
IOS_DEVICE_NAME=iPhone
IOS_PLATFORM_VERSION=15.0

# WebSocket配置
WS_PORT=8080
WS_HOST=0.0.0.0

# Appium配置
APPIUM_HOST=localhost
APPIUM_PORT=4723

# Viber应用配置
VIBER_BUNDLE_ID=com.viber.Viber
```

### 4. 启动项目
在宝塔面板中点击"启动"按钮

## 🔒 安全特性

- ✅ **代码混淆** - 变量名和函数名已被混淆
- ✅ **代码压缩** - 移除注释和多余空格
- ✅ **文件优化** - 减小文件大小
- ✅ **安全性提升** - 防止逆向工程

## 📊 文件大小对比

- **原始文件**: 5.4KB
- **混淆后文件**: 3.7KB
- **压缩率**: 约31%

## 🧪 测试部署

### 1. 检查服务状态
在宝塔面板中查看项目状态，确保显示"运行中"

### 2. 测试WebSocket连接
```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
    console.log('连接成功！');
    ws.close();
});
```

## 🔍 故障排除

### 常见问题

1. **启动失败**
   - 检查Node.js版本（建议16+）
   - 检查端口8080是否被占用
   - 查看宝塔面板项目日志

2. **环境变量问题**
   - 确保 `.env` 文件存在且格式正确
   - 检查iOS设备UDID是否正确

3. **权限问题**
   - 确保项目有足够权限访问设备
   - 检查文件权限设置

## 📁 文件说明

- `build-production.ts` - 宝塔面板专用打包脚本
- `production/` - 生产环境文件
- `package.json` - 宝塔面板专用配置
- `README.md` - 详细部署指南

## 🎯 优势

### 相比通用打包的优势：
1. **专用配置** - 针对宝塔面板优化
2. **简化部署** - 减少配置步骤
3. **清晰指导** - 详细的宝塔面板部署说明
4. **安全保护** - 代码混淆和压缩
5. **文件精简** - 只包含必要文件

## 📞 支持

如有问题，请查看：
- 宝塔面板项目日志
- `logs/` 目录中的日志文件
- `README.md` 详细部署指南 