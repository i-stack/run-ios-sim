#!/bin/bash

echo "Starting Viber Appium Automation Server..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    exit 1
fi

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp env.example .env
    echo "Please configure your .env file before running the server"
    read -p "Press Enter to continue..."
fi

# 启动服务器
echo "Starting server in development mode..."
npm run dev 