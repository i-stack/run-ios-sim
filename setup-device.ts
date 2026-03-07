#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function setupDevice() {
    try {
        console.log('🔧 iOS 设备设置向导');
        console.log('====================');
        
        // 1. 检查设备连接状态
        console.log('\n📱 1. 检查设备连接状态...');
        const { stdout } = await execAsync('xcrun devicectl list devices');
        console.log(stdout);
        
        // 2. 检查 Xcode 是否安装
        console.log('\n🔍 2. 检查 Xcode 安装状态...');
        try {
            const xcodeVersion = await execAsync('xcodebuild -version');
            console.log('✅ Xcode 已安装:');
            console.log(xcodeVersion.stdout);
        } catch (error) {
            console.log('❌ Xcode 未安装或未正确配置');
            console.log('请从 App Store 安装 Xcode');
            return;
        }
        
        // 3. 检查开发者模式
        console.log('\n🔧 3. 检查开发者模式...');
        try {
            const devMode = await execAsync('xcrun devicectl list devices --json');
            console.log('✅ 开发者模式已启用');
        } catch (error) {
            console.log('⚠️  可能需要启用开发者模式');
            console.log('请在 Xcode 中启用开发者模式');
        }
        
        // 4. 提供配对指导
        console.log('\n📋 4. 设备配对指导:');
        console.log('   1. 打开 Xcode');
        console.log('   2. 选择 Window > Devices and Simulators');
        console.log('   3. 在 "Devices" 标签页中找到您的设备');
        console.log('   4. 如果设备显示为 "Unpaired"，点击 "Pair"');
        console.log('   5. 在 iOS 设备上信任此电脑');
        console.log('   6. 等待配对完成');
        
        // 5. 检查 WebDriverAgent
        console.log('\n🔧 5. 检查 WebDriverAgent...');
        try {
            const wdaCheck = await execAsync('xcrun devicectl list devices --json | grep -i webdriver');
            console.log('✅ WebDriverAgent 已配置');
        } catch (error) {
            console.log('⚠️  WebDriverAgent 可能需要配置');
            console.log('请确保在 Xcode 中正确配置了 WebDriverAgent');
        }
        
        // 6. 提供故障排除建议
        console.log('\n🔧 6. 故障排除建议:');
        console.log('   如果仍然遇到 "pair record" 错误:');
        console.log('   1. 重启 iOS 设备');
        console.log('   2. 重启 Mac');
        console.log('   3. 重新连接 USB 线缆');
        console.log('   4. 在 Xcode 中重新配对设备');
        console.log('   5. 确保设备已解锁且信任此电脑');
        
        console.log('\n✅ 设备设置检查完成');
        console.log('请按照上述步骤操作，然后重新运行证书安装脚本');
        
    } catch (error) {
        console.error('❌ 设备设置检查失败:', error);
    }
}

setupDevice().catch(console.error);
