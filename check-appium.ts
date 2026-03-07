#!/usr/bin/env ts-node

import fetch from 'node-fetch';

async function checkAppiumServer() {
    const appiumUrl = 'http://localhost:4723/status';
    
    try {
        console.log('🔍 检查 Appium 服务器状态...');
        const response = await fetch(appiumUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
            console.log('✅ Appium 服务器正在运行');
            const data = await response.json();
            console.log('📊 服务器信息:', data);
        } else {
            console.log('❌ Appium 服务器响应异常');
        }
    } catch (error) {
        console.log('❌ Appium 服务器未运行');
        console.log('');
        console.log('🚀 启动 Appium 服务器:');
        console.log('   npm run appium');
        console.log('   或');
        console.log('   appium server --port 4723');
    }
}

checkAppiumServer().catch(console.error);
