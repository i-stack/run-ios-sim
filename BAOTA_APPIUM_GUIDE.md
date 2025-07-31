# 🚀 宝塔面板部署后的Appium启动指南

## 📋 重要说明

**是的，部署到宝塔面板后也需要启动Appium服务器！**

Appium服务器是自动化测试的核心组件，负责：
- 与iOS设备通信
- 执行自动化命令
- 管理WebDriver会话
- 处理设备交互

## 🎯 完整的部署流程

### 1. 本地打包
```bash
npm run build:prod
```

### 2. 上传到宝塔面板
将 `production/` 文件夹上传到服务器

### 3. 在宝塔面板中配置
- 项目名称：viber-appium-automation
- 启动文件：dist/index.js
- 端口：8080

### 4. 启动Appium服务器（重要！）
在宝塔面板服务器上启动Appium：

#### 方法1：使用SSH连接服务器
```bash
# 连接到服务器
ssh root@your-server-ip

# 进入项目目录
cd /path/to/your/project

# 启动Appium服务器
appium --port 4723 --log appium.log --local-timezone
```

#### 方法2：在宝塔面板中创建第二个项目
1. 创建新的Node.js项目
2. 项目名称：appium-server
3. 启动文件：appium
4. 端口：4723

#### 方法3：使用宝塔面板的定时任务
1. 进入宝塔面板 → 定时任务
2. 添加任务：
   ```bash
   appium --port 4723 --log appium.log --local-timezone
   ```
3. 设置为开机启动

### 5. 启动自动化项目
在宝塔面板中启动viber-appium-automation项目

## 🔧 服务器端Appium配置

### 1. 安装Appium（在服务器上）
```bash
# 安装Node.js（如果未安装）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装Appium
npm install -g appium

# 安装iOS驱动
appium driver install xcuitest
```

### 2. 配置iOS设备
```bash
# 检查设备连接
xcrun devicectl list devices

# 获取设备UDID
xcrun devicectl list devices | grep "iPhone"
```

### 3. 配置环境变量
编辑 `.env` 文件：
```bash
# iOS设备配置
IOS_UDID=你的设备UDID
IOS_DEVICE_NAME=iPhone
IOS_PLATFORM_VERSION=15.0

# Appium配置
APPIUM_HOST=localhost
APPIUM_PORT=4723

# WebSocket配置
WS_PORT=8080
WS_HOST=0.0.0.0
```

## 🚀 自动化启动脚本

### 创建服务器端启动脚本
```bash
# 在服务器上创建启动脚本
cat > start-appium-server.sh << 'EOF'
#!/bin/bash

echo "🚀 启动Appium服务器..."

# 检查Appium是否安装
if ! command -v appium &> /dev/null; then
    echo "安装Appium..."
    npm install -g appium
    appium driver install xcuitest
fi

# 检查端口占用
if netstat -an | grep -q :4723; then
    echo "停止占用进程..."
    pkill -f appium
fi

# 启动Appium
appium --port 4723 --log appium.log --local-timezone
EOF

chmod +x start-appium-server.sh
```

### 使用systemd服务（推荐）
```bash
# 创建服务文件
cat > /etc/systemd/system/appium.service << 'EOF'
[Unit]
Description=Appium Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/your/project
ExecStart=/usr/bin/appium --port 4723 --log appium.log --local-timezone
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 启用服务
sudo systemctl enable appium
sudo systemctl start appium
```

## 📊 监控和日志

### 检查Appium状态
```bash
# 检查进程
ps aux | grep appium

# 检查端口
netstat -an | grep :4723

# 查看日志
tail -f appium.log
```

### 检查自动化项目状态
```bash
# 检查WebSocket服务
netstat -an | grep :8080

# 查看项目日志
tail -f logs/combined.log
```

## 🔍 故障排除

### 常见问题

#### 1. Appium启动失败
```bash
# 检查Node.js版本
node --version

# 重新安装Appium
npm uninstall -g appium
npm install -g appium

# 检查权限
sudo chown -R $USER:$USER ~/.npm
```

#### 2. 设备连接问题
```bash
# 检查设备连接
xcrun devicectl list devices

# 重启设备
# 重新连接USB线
```

#### 3. 端口冲突
```bash
# 查看端口占用
netstat -an | grep :4723

# 杀死占用进程
pkill -f appium
```

## 🎯 完整的启动流程

### 1. 启动Appium服务器
```bash
# 在服务器上
appium --port 4723 --log appium.log --local-timezone
```

### 2. 启动自动化项目
```bash
# 在宝塔面板中启动
node dist/index.js
```

### 3. 测试连接
```bash
# 测试Appium
curl http://localhost:4723/status

# 测试WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8080
```

## 📋 检查清单

- [ ] Appium服务器已启动（端口4723）
- [ ] 自动化项目已启动（端口8080）
- [ ] iOS设备已连接并配置
- [ ] 环境变量已正确设置
- [ ] 日志文件正常生成
- [ ] 网络连接正常

## 📞 支持

如有问题，请检查：
- Appium服务器日志：`appium.log`
- 自动化项目日志：`logs/combined.log`
- 设备连接状态
- 网络端口占用情况 