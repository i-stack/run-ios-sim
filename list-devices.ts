#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function listDevices() {
    try {
        console.log('📱 检查连接的 iOS 设备...');
        
        // 使用 devicectl 列出设备
        const { stdout } = await execAsync('xcrun devicectl list devices');
        console.log('🔍 设备列表:');
        console.log(stdout);
        
        // 获取 JSON 格式的设备信息以获取正确的 UDID
        const jsonFile = '/tmp/devices_list.json';
        await execAsync(`xcrun devicectl list devices --json-output ${jsonFile}`);
        
        if (!fs.existsSync(jsonFile)) {
            console.log('❌ 无法获取设备 JSON 信息');
            return;
        }
        
        const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        const devices: Array<{name: string, udid: string, identifier: string, state: string, model: string}> = [];
        
        jsonData.result.devices.forEach((device: any) => {
            devices.push({
                name: device.deviceProperties.name,
                udid: device.hardwareProperties.udid,
                identifier: device.identifier,
                state: device.connectionProperties.pairingState,
                model: `${device.hardwareProperties.marketingName} (${device.hardwareProperties.productType})`
            });
        });
        
        // 清理临时文件
        fs.unlinkSync(jsonFile);
        
        if (devices.length > 0) {
            console.log('\n✅ 可用设备:');
            devices.forEach((device, index) => {
                console.log(`${index + 1}. ${device.name} (${device.model})`);
                console.log(`   UDID: ${device.udid} (推荐用于 Appium)`);
                console.log(`   Identifier: ${device.identifier}`);
                console.log(`   状态: ${device.state}`);
                console.log('');
            });
            
            console.log('💡 使用方法:');
            console.log(`   # 使用 UDID (推荐):`);
            console.log(`   npm run install-cert-device ${devices[0].udid}`);
            console.log(`   # 使用 Identifier:`);
            console.log(`   npm run install-cert-device ${devices[0].identifier}`);
        } else {
            console.log('❌ 没有找到可用的 iOS 设备');
            console.log('请确保设备已连接并在 Xcode 中信任');
        }
        
    } catch (error) {
        console.error('❌ 获取设备列表失败:', error);
    }
}

listDevices().catch(console.error);
