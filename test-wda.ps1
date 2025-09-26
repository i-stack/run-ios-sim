# WebDriverAgent 连接测试脚本
Write-Host "🔍 检查 WebDriverAgent 连接..." -ForegroundColor Green

$deviceIp = "192.168.0.186"
$ports = @(8100, 8101, 8102, 8103, 8104)

Write-Host "📱 设备信息:" -ForegroundColor Yellow
Write-Host "IP: $deviceIp" -ForegroundColor Cyan
Write-Host ""

# 测试网络连通性
Write-Host "🌐 测试网络连通性..." -ForegroundColor Green
try {
    $pingResult = Test-Connection -ComputerName $deviceIp -Count 1 -Quiet
    if ($pingResult) {
        Write-Host "✅ 网络连通性正常" -ForegroundColor Green
    } else {
        Write-Host "❌ 网络连通性失败" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 网络连通性测试失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 测试 WebDriverAgent 端口
Write-Host "🔍 测试 WebDriverAgent 端口..." -ForegroundColor Green
$foundPort = $null

foreach ($port in $ports) {
    Write-Host "🔍 测试端口 $port..." -ForegroundColor Yellow
    
    try {
        $url = "http://${deviceIp}:${port}/status"
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 5 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ 发现 WebDriverAgent 运行在端口 $port" -ForegroundColor Green
            Write-Host "📊 响应内容:" -ForegroundColor Cyan
            Write-Host $response.Content -ForegroundColor White
            $foundPort = $port
            break
        } else {
            Write-Host "❌ 端口 $port 响应异常 (状态码: $($response.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ 端口 $port 连接失败" -ForegroundColor Red
    }
}

Write-Host ""

if ($foundPort) {
    Write-Host "🎉 WebDriverAgent 运行正常!" -ForegroundColor Green
    Write-Host "端口: $foundPort" -ForegroundColor Cyan
} else {
    Write-Host "❌ 未找到运行的 WebDriverAgent" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 启动步骤:" -ForegroundColor Yellow
    Write-Host "1. 在 Xcode 中打开 WebDriverAgent 项目" -ForegroundColor White
    Write-Host "2. 选择你的越狱设备作为目标" -ForegroundColor White
    Write-Host "3. 选择 'WebDriverAgentRunner' scheme" -ForegroundColor White
    Write-Host "4. 点击运行按钮 (⌘+R)" -ForegroundColor White
    Write-Host "5. 确保设备已解锁且信任开发者证书" -ForegroundColor White
    Write-Host ""
    Write-Host "📱 设备端检查:" -ForegroundColor Yellow
    Write-Host "- 确保设备已解锁" -ForegroundColor White
    Write-Host "- 检查是否信任了开发者证书" -ForegroundColor White
    Write-Host "- 查看 Xcode 控制台是否有错误信息" -ForegroundColor White
}

Write-Host ""
Write-Host "🎉 检查完成!" -ForegroundColor Green 