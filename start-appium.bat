@echo off
echo Starting Appium Server...
echo ========================

REM 检查Appium是否安装
appium --version >nul 2>&1
if errorlevel 1 (
    echo Installing Appium...
    npm install -g appium
)

REM 检查iOS驱动是否安装
appium driver list --installed | findstr xcuitest >nul 2>&1
if errorlevel 1 (
    echo Installing iOS driver...
    appium driver install xcuitest
)

REM 检查端口是否被占用
netstat -an | findstr :4723 >nul
if not errorlevel 1 (
    echo Port 4723 is already in use. Stopping existing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4723') do taskkill /F /PID %%a
)

echo Starting Appium server on port 4723...
echo Press Ctrl+C to stop the server
echo.

appium --log appium.log --local-timezone 