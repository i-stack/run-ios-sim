#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('🚀 Viber Appium Automation Setup');
  console.log('================================\n');

  // 检查Node.js版本
  const nodeVersion = process.version;
  console.log(`✅ Node.js version: ${nodeVersion}`);

  // 检查是否已安装依赖
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Dependencies installed successfully');
    } catch (error) {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }
  } else {
    console.log('✅ Dependencies already installed');
  }

  // 检查环境变量文件
  if (!fs.existsSync('.env')) {
    console.log('\n📝 Creating .env file...');
    
    const iosUdid = await question('Enter iOS device UDID (or press Enter to skip): ');
    const deviceName = await question('Enter device name (default: iPhone): ') || 'iPhone';
    const platformVersion = await question('Enter iOS platform version (default: 15.0): ') || '15.0';
    const bundleId = await question('Enter Viber bundle ID (default: com.viber.Viber): ') || 'com.viber.Viber';
    const wsPort = await question('Enter WebSocket port (default: 8080): ') || '8080';
    const appiumHost = await question('Enter Appium host (default: localhost): ') || 'localhost';
    const appiumPort = await question('Enter Appium port (default: 4723): ') || '4723';

    const envContent = `# WebSocket Server Configuration
WS_PORT=${wsPort}
WS_HOST=localhost

# Appium Configuration
APPIUM_HOST=${appiumHost}
APPIUM_PORT=${appiumPort}

# iOS Device Configuration
IOS_DEVICE_NAME=${deviceName}
IOS_PLATFORM_VERSION=${platformVersion}
IOS_UDID=${iosUdid}

# Viber App Configuration
VIBER_BUNDLE_ID=${bundleId}
VIBER_APP_PATH=

# Network Proxy Configuration (for capturing API calls)
PROXY_HOST=localhost
PROXY_PORT=8888

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/appium-automation.log

# Test Data Storage
TEST_DATA_DIR=./test-data
API_RESPONSES_DIR=./api-responses
`;

    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file created successfully');
  } else {
    console.log('✅ .env file already exists');
  }

  // 创建必要的目录
  const directories = ['logs', 'api-responses', 'test-data', 'mitmproxy'];
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });

  console.log('\n🎉 Setup completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Configure your .env file with your device details');
  console.log('2. Install mitmproxy: pip install mitmproxy');
  console.log('3. Configure your iOS device for proxy');
  console.log('4. Start the server: npm run dev');
  console.log('5. Use test-client.js to test the system');

  rl.close();
}

setup().catch(console.error); 