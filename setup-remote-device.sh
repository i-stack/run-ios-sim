#!/bin/bash

# 远程设备配置脚本
# 用于在远程 Mac 上设置 Appium 服务器

REMOTE_MAC_IP="192.168.0.186"
REMOTE_USER="iPhone7p"

echo "=== 远程设备 Appium 配置 ==="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印带颜色的消息
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. 检查网络连接
echo "🌐 检查网络连接..."
if ping -c 1 $REMOTE_MAC_IP &> /dev/null; then
    print_status "远程 Mac 可达"
else
    print_error "无法连接到远程 Mac ($REMOTE_MAC_IP)"
    echo "请检查："
    echo "  1. 远程 Mac 是否开机"
    echo "  2. 两台 Mac 是否在同一网络"
    echo "  3. 防火墙设置"
    exit 1
fi

# 2. 检查 SSH 连接
echo "🔐 检查 SSH 连接..."
if ssh -o ConnectTimeout=5 $REMOTE_USER@$REMOTE_MAC_IP "echo 'SSH OK'" &> /dev/null; then
    print_status "SSH 连接正常"
else
    print_error "SSH 连接失败"
    echo "请在远程 Mac 上执行以下命令启用 SSH："
    echo "  sudo systemsetup -setremotelogin on"
    exit 1
fi

# 3. 在远程 Mac 上安装 Appium
echo "📦 在远程 Mac 上安装 Appium..."
ssh $REMOTE_USER@$REMOTE_MAC_IP "
    if ! command -v appium &> /dev/null; then
        echo '安装 Appium...'
        npm install -g appium
        echo '安装 XCUITest 驱动...'
        appium driver install xcuitest
    else
        echo 'Appium 已安装'
    fi
"

# 4. 检查远程设备
echo "📱 检查远程设备..."
ssh $REMOTE_USER@$REMOTE_MAC_IP "xcrun devicectl list devices"

# 5. 停止现有的 Appium 进程
echo "🛑 停止现有的 Appium 进程..."
ssh $REMOTE_USER@$REMOTE_MAC_IP "pkill -f appium || true"

# 6. 启动远程 Appium 服务器
echo "🚀 启动远程 Appium 服务器..."
ssh $REMOTE_USER@$REMOTE_MAC_IP "
    nohup appium --base-path / --address 0.0.0.0 --port 4723 --allow-insecure chromedriver_autodownload > appium.log 2>&1 &
    sleep 5
    if curl -s http://localhost:4723/status > /dev/null; then
        echo 'Appium 服务器启动成功'
    else
        echo 'Appium 服务器启动失败'
        exit 1
    fi
"

# 7. 测试连接
echo "🧪 测试远程连接..."
if curl -s http://$REMOTE_MAC_IP:4723/status > /dev/null; then
    print_status "远程 Appium 服务器连接成功"
else
    print_error "无法连接到远程 Appium 服务器"
    echo "请检查："
    echo "  1. 远程 Mac 的防火墙设置"
    echo "  2. 4723 端口是否被占用"
    exit 1
fi

# 8. 显示服务器信息
echo ""
echo "🎉 远程 Appium 服务器配置完成！"
echo "🌐 服务器地址: http://$REMOTE_MAC_IP:4723"
echo "📱 设备管理: 通过远程 Mac 管理 iPhone 设备"
echo ""
echo "下一步："
echo "  1. 在主 Mac 上运行: npm run configure-remote"
echo "  2. 或运行: npm run setup-remote"
echo "  3. 测试连接: npm run test-simple" 