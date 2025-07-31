#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

console.log('🚀 宝塔面板生产环境打包脚本');
console.log('============================');

const productionDir = path.join(__dirname, 'production');
if (fs.existsSync(productionDir)) {
    fs.rmSync(productionDir, { recursive: true, force: true });
}
fs.mkdirSync(productionDir);

console.log('📦 编译TypeScript...');
try {
    execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ 编译失败:', error);
    process.exit(1);
}

console.log('📁 复制编译文件...');
const distDir = path.join(__dirname, 'dist');
const productionDistDir = path.join(productionDir, 'dist');
copyDirectory(distDir, productionDistDir);

// 混淆和压缩JavaScript文件
console.log('🔒 混淆和压缩JavaScript文件...');
obfuscateAndMinifyFiles(productionDistDir);

console.log('📋 复制配置文件...');
const filesToCopy = [
    'package.json',
    'ecosystem.config.js'
];

filesToCopy.forEach(file => {
    const sourcePath = path.join(__dirname, file);
    const destPath = path.join(productionDir, file);
    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
    }
});

console.log('📂 创建目录...');
const directories = [
    'logs',
    'api-responses', 
    'test-data',
    'mitmproxy'
];

directories.forEach(dir => {
    fs.mkdirSync(path.join(productionDir, dir), { recursive: true });
});

const envExamplePath = path.join(__dirname, 'env.example');
if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, path.join(productionDir, 'env.example'));
}





console.log('📄 创建宝塔面板专用package.json...');
const baotaPackageJson = {
    name: "viber-appium-automation",
    version: "1.0.0",
    description: "Viber Appium自动化测试 - 宝塔面板专用",
    main: "dist/index.js",
    scripts: {
        start: "node dist/index.js"
    },
    dependencies: {
        "appium": "^2.2.3",
        "webdriverio": "^8.24.0",
        "ws": "^8.14.2",
        "express": "^4.18.2",
        "cors": "^2.8.5",
        "dotenv": "^16.3.1",
        "winston": "^3.11.0",
        "node-fetch": "^3.3.2"
    }
};

fs.writeFileSync(
    path.join(productionDir, 'package.json'),
    JSON.stringify(baotaPackageJson, null, 2)
);

console.log('📖 创建宝塔面板部署说明...');
const baotaReadme = `# 🚀 宝塔面板部署指南

## 📋 部署步骤

### 1. 上传文件
将整个 \`production\` 文件夹上传到宝塔面板服务器

### 2. 在宝塔面板中创建Node.js项目
- 项目名称：viber-appium-automation
- 项目路径：上传的文件夹路径
- 启动文件：dist/index.js
- 端口：8080

### 3. 配置环境变量
复制 \`env.example\` 为 \`.env\` 并编辑：
\`\`\`bash
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
\`\`\`

### 4. 启动项目
在宝塔面板中点击"启动"按钮，或使用命令行：
\`\`\`bash
node dist/index.js
\`\`\`

## 📁 文件说明

- \`dist/\` - 编译后的JavaScript文件（已混淆和压缩）
- \`package.json\` - 项目配置文件
- \`env.example\` - 环境变量示例
- \`logs/\` - 日志目录
- \`api-responses/\` - API响应数据目录
- \`test-data/\` - 测试数据目录

## ⚙️ 宝塔面板配置

### 项目设置
- **项目名称**: viber-appium-automation
- **启动文件**: dist/index.js
- **端口**: 8080
- **运行用户**: root（需要访问设备）

### 环境变量
在宝塔面板的项目设置中添加环境变量，或编辑 \`.env\` 文件

## 🔒 安全特性

- ✅ JavaScript文件已混淆和压缩
- ✅ 变量名和函数名已被混淆
- ✅ 代码结构已优化，减小文件大小
- ✅ 提高了代码的安全性

## 📊 监控和日志

### 日志文件位置
- \`logs/combined.log\` - 所有日志
- \`logs/error.log\` - 错误日志

### 在宝塔面板中查看日志
1. 进入项目管理页面
2. 点击"日志"按钮
3. 查看实时日志输出

## 🧪 测试部署

### 1. 检查服务状态
在宝塔面板中查看项目状态，确保显示"运行中"

### 2. 测试WebSocket连接
\`\`\`javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
    console.log('连接成功！');
    ws.close();
});
\`\`\`

## 🔍 故障排除

### 常见问题

1. **启动失败**
   - 检查Node.js版本（建议16+）
   - 检查端口8080是否被占用
   - 查看错误日志

2. **环境变量问题**
   - 确保 \`.env\` 文件存在且格式正确
   - 检查iOS设备UDID是否正确

3. **权限问题**
   - 确保项目有足够权限访问设备
   - 检查文件权限设置

## 📞 支持

如有问题，请查看：
- 宝塔面板项目日志
- \`logs/\` 目录中的日志文件
- 控制台错误信息
`;

fs.writeFileSync(path.join(productionDir, 'README.md'), baotaReadme);

console.log('✅ 宝塔面板专用打包完成！');
console.log('📁 生产文件在: production/');
console.log('📋 将production文件夹上传到宝塔面板');
console.log('🚀 在宝塔面板中设置启动文件: dist/index.js');
console.log('🔒 JavaScript文件已混淆和压缩');

// 辅助函数：复制目录
function copyDirectory(source: string, destination: string) {
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    const files = fs.readdirSync(source);
    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const destPath = path.join(destination, file);
        
        if (fs.statSync(sourcePath).isDirectory()) {
            copyDirectory(sourcePath, destPath);
        } else {
            fs.copyFileSync(sourcePath, destPath);
        }
    });
}

// 辅助函数：混淆和压缩JavaScript文件
function obfuscateAndMinifyFiles(dir: string) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            obfuscateAndMinifyFiles(filePath);
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const obfuscatedContent = obfuscateCode(content);
            fs.writeFileSync(filePath, obfuscatedContent);
        }
    });
}

// 辅助函数：混淆代码
function obfuscateCode(code: string): string {
    // 简单的代码混淆
    let obfuscated = code;
    
    // 1. 移除注释
    obfuscated = obfuscated.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    
    // 2. 移除多余的空行
    obfuscated = obfuscated.replace(/\n\s*\n/g, '\n');
    
    // 3. 压缩空格
    obfuscated = obfuscated.replace(/\s+/g, ' ');
    
    // 4. 混淆变量名（简单的替换）
    const variableMap = new Map<string, string>();
    const variableRegex = /\b(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    let match;
    let counter = 0;
    
    while ((match = variableRegex.exec(code)) !== null) {
        const varName = match[1];
        if (!variableMap.has(varName) && !isReserved(varName)) {
            variableMap.set(varName, `_${counter++}`);
        }
    }
    
    // 应用变量名替换
    variableMap.forEach((newName, oldName) => {
        const regex = new RegExp(`\\b${oldName}\\b`, 'g');
        obfuscated = obfuscated.replace(regex, newName);
    });
    
    return obfuscated;
}

// 辅助函数：检查是否为保留字
function isReserved(word: string): boolean {
    const reservedWords = [
        'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
        'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
        'for', 'function', 'if', 'import', 'in', 'instanceof', 'let',
        'new', 'return', 'super', 'switch', 'this', 'throw', 'try',
        'typeof', 'var', 'void', 'while', 'with', 'yield', 'enum',
        'implements', 'interface', 'package', 'private', 'protected',
        'public', 'static', 'await', 'abstract', 'boolean', 'byte',
        'char', 'double', 'final', 'float', 'goto', 'int', 'long',
        'native', 'short', 'synchronized', 'throws', 'transient', 'volatile'
    ];
    return reservedWords.includes(word);
} 