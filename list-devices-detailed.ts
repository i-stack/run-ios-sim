#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function listDevicesDetailed() {
    try {
        console.log('📱 详细设备信息检查...');
        console.log('========================');
        
        // 获取 JSON 格式的设备信息
        const jsonFile = '/tmp/devices_detailed.json';
        await execAsync(`xcrun devicectl list devices --json-output ${jsonFile}`);
        
        if (!fs.existsSync(jsonFile)) {
            console.log('❌ 无法获取设备 JSON 信息');
            return;
        }
        
        const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        
        console.log('\n🔍 设备详细信息:');
        console.log('================');
        
        jsonData.result.devices.forEach((device: any, index: number) => {
            console.log(`\n📱 设备 ${index + 1}: ${device.deviceProperties.name}`);
            console.log(`   型号: ${device.hardwareProperties.marketingName} (${device.hardwareProperties.productType})`);
            console.log(`   iOS 版本: ${device.deviceProperties.osVersionNumber}`);
            console.log(`   连接状态: ${device.connectionProperties.pairingState}`);
            console.log(`   传输类型: ${device.connectionProperties.transportType}`);
            
            // 显示不同的标识符
            console.log(`   📋 标识符信息:`);
            console.log(`      UDID: ${device.hardwareProperties.udid}`);
            console.log(`      Identifier: ${device.identifier}`);
            console.log(`      Serial Number: ${device.hardwareProperties.serialNumber}`);
            
            // 显示主机名
            if (device.connectionProperties.localHostnames) {
                console.log(`   🌐 主机名:`);
                device.connectionProperties.localHostnames.forEach((hostname: string) => {
                    console.log(`      ${hostname}`);
                });
            }
            
            console.log(`   📱 设备状态: ${device.deviceProperties.bootState}`);
            console.log(`   🔧 开发者模式: ${device.deviceProperties.developerModeStatus}`);
        });
        
        console.log('\n💡 使用建议:');
        console.log('============');
        console.log('1. 对于 Appium 自动化，建议使用 UDID');
        console.log('2. 对于网络连接，可以使用 Identifier');
        console.log('3. 在 Xcode 中显示的是 UDID');
        
        console.log('\n🚀 安装证书命令示例:');
        jsonData.result.devices.forEach((device: any, index: number) => {
            console.log(`   # 使用 UDID (推荐):`);
            console.log(`   npm run install-cert-device ${device.hardwareProperties.udid}`);
            console.log(`   # 使用 Identifier:`);
            console.log(`   npm run install-cert-device ${device.identifier}`);
            console.log('');
        });
        
        // 清理临时文件
        fs.unlinkSync(jsonFile);
        
    } catch (error) {
        console.error('❌ 获取详细设备信息失败:', error);
    }
}

listDevicesDetailed().catch(console.error);
