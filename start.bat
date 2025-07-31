@echo off
echo Starting Viber Appium Automation Server...

REM 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM 检查是否安装了依赖
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM 检查环境变量文件
if not exist ".env" (
    echo Creating .env file from template...
    copy env.example .env
    echo Please configure your .env file before running the server
    pause
)

REM 启动服务器
echo Starting server in development mode...
npm run dev 