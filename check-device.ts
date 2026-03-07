#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from './src/utils/logger';

const execAsync = promisify(exec);
const logger = new Logger('DeviceChecker');

const TARGET_UDID = '00008101-00026C982160001E';
const TARGET_DEVICE_NAME = 'lianxinxi';

interface DeviceInfo {
    udid: string;
    name: string;
    version: string;
    state: string;
    trustState?: string;
    isConnected: boolean;
}

async function checkSpecificDevice(): Promise<void> {
    logger.info(`🔍 Checking specific device: ${TARGET_DEVICE_NAME} (${TARGET_UDID})`);
    
    try {
        // Get device list
        const { stdout } = await execAsync('xcrun devicectl list devices --json-output /tmp/specific_device.json');
        const fs = require('fs');
        
        if (fs.existsSync('/tmp/specific_device.json')) {
            const deviceData = JSON.parse(fs.readFileSync('/tmp/specific_device.json', 'utf8'));
            const targetDevice = deviceData.result.devices.find((device: any) => 
                device.hardwareProperties.udid === TARGET_UDID
            );
            
            if (targetDevice) {
                const deviceInfo: DeviceInfo = {
                    udid: targetDevice.hardwareProperties.udid,
                    name: targetDevice.deviceProperties.name,
                    version: targetDevice.deviceProperties.osVersionNumber,
                    state: targetDevice.state,
                    trustState: targetDevice.deviceProperties.trustState,
                    isConnected: true
                };
                
                logger.info('✅ Target device found:');
                logger.info(`  Name: ${deviceInfo.name}`);
                logger.info(`  UDID: ${deviceInfo.udid}`);
                logger.info(`  iOS Version: ${deviceInfo.version}`);
                logger.info(`  State: ${deviceInfo.state}`);
                logger.info(`  Trust State: ${deviceInfo.trustState || 'Unknown'}`);
                
                // Check if device is ready for automation
                if (deviceInfo.state === 'booted' && deviceInfo.trustState === 'trusted') {
                    logger.info('✅ Device is ready for automation');
                } else {
                    logger.warn('⚠️  Device may not be ready for automation');
                    if (deviceInfo.state !== 'booted') {
                        logger.info(`💡 Device state should be 'booted', but is '${deviceInfo.state}'`);
                    }
                    if (deviceInfo.trustState !== 'trusted') {
                        logger.info(`💡 Device trust state should be 'trusted', but is '${deviceInfo.trustState}'`);
                    }
                }
                
                // Check if device is unlocked
                try {
                    const { stdout: lockStatus } = await execAsync(`xcrun devicectl device info ${TARGET_UDID} --json-output /tmp/device_info.json`);
                    if (fs.existsSync('/tmp/device_info.json')) {
                        const infoData = JSON.parse(fs.readFileSync('/tmp/device_info.json', 'utf8'));
                        const isLocked = infoData.result?.deviceProperties?.isLocked;
                        logger.info(`Device Locked: ${isLocked}`);
                        
                        if (isLocked) {
                            logger.warn('⚠️  Device is locked - unlock it for automation');
                        } else {
                            logger.info('✅ Device is unlocked');
                        }
                        
                        fs.unlinkSync('/tmp/device_info.json');
                    }
                } catch (error) {
                    logger.warn('Could not check device lock status:', error);
                }
                
            } else {
                logger.error(`❌ Target device ${TARGET_UDID} not found`);
                logger.info('Available devices:');
                deviceData.result.devices.forEach((device: any) => {
                    if (device.hardwareProperties.productType.includes('iPhone')) {
                        logger.info(`  - ${device.deviceProperties.name} (${device.hardwareProperties.udid})`);
                    }
                });
            }
            
            fs.unlinkSync('/tmp/specific_device.json');
        }
        
    } catch (error) {
        logger.error('Error checking specific device:', error);
    }
}

async function checkWebDriverAgentForDevice(): Promise<void> {
    logger.info('🔍 Checking WebDriverAgent status for target device...');
    
    try {
        // Check if WDA is running for the specific device
        const { stdout: wdaProcesses } = await execAsync('ps aux | grep -i webdriveragent | grep -v grep');
        const processes = wdaProcesses.split('\n').filter(line => line.trim());
        
        if (processes.length > 0) {
            logger.info('Found WebDriverAgent processes:');
            processes.forEach(process => {
                logger.info(`  ${process.trim()}`);
            });
        } else {
            logger.info('No WebDriverAgent processes found');
        }
        
        // Check if WDA can be built for this device
        logger.info('Testing WDA build capability...');
        try {
            const buildTestCommand = [
                'xcodebuild',
                '-project', '/usr/local/lib/node_modules/appium/node_modules/appium-webdriveragent/WebDriverAgent.xcodeproj',
                '-scheme', 'WebDriverAgentRunner',
                '-destination', `id=${TARGET_UDID}`,
                '-derivedDataPath', '/tmp/WebDriverAgent',
                'build-for-testing',
                'test-without-building',
                '| head -20' // Only show first 20 lines
            ].join(' ');
            
            const { stdout: buildOutput } = await execAsync(buildTestCommand, { timeout: 60000 });
            logger.info('✅ WDA build test started successfully');
            logger.info('Build output preview:', buildOutput.substring(0, 500));
            
        } catch (buildError) {
            logger.error('❌ WDA build test failed:', buildError);
        }
        
    } catch (error) {
        logger.error('Error checking WebDriverAgent:', error);
    }
}

async function suggestDeviceSpecificFixes(): Promise<void> {
    logger.info('=== Device-Specific Fixes ===');
    logger.info(`For device: ${TARGET_DEVICE_NAME} (${TARGET_UDID})`);
    logger.info('');
    logger.info('1. Ensure device is unlocked and on home screen');
    logger.info('2. Go to Settings > General > Device Management');
    logger.info('   - Trust the developer certificate');
    logger.info('3. Disconnect and reconnect USB cable');
    logger.info('4. Restart the device if needed');
    logger.info('5. Run the WDA fix: npm run fix-wda');
    logger.info('6. Restart Appium server: npm run start-appium');
    logger.info('7. Test connection: npm run test-connection');
}

async function main() {
    logger.info('🔍 Starting device-specific diagnostics...');
    
    await checkSpecificDevice();
    await checkWebDriverAgentForDevice();
    await suggestDeviceSpecificFixes();
    
    logger.info('');
    logger.info('✅ Device diagnostics completed!');
}

// Run the diagnostics
if (require.main === module) {
    main().catch(error => {
        logger.error('Device check failed:', error);
        process.exit(1);
    });
}
