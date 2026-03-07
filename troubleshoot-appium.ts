#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from './src/utils/logger';

const execAsync = promisify(exec);
const logger = new Logger('AppiumTroubleshooter');

interface AppiumServerInfo {
    isRunning: boolean;
    port: number;
    host: string;
    version?: string;
}

interface DeviceInfo {
    udid: string;
    name: string;
    version: string;
    status: string;
}

async function checkAppiumServer(): Promise<AppiumServerInfo> {
    try {
        // Check if Appium is running on default port
        const { stdout } = await execAsync('curl -s http://localhost:4723/status');
        const status = JSON.parse(stdout);
        
        if (status.status === 0) {
            logger.info('✅ Appium server is running on localhost:4723');
            return {
                isRunning: true,
                port: 4723,
                host: 'localhost'
            };
        }
    } catch (error) {
        logger.warn('❌ Appium server is not running on localhost:4723');
    }
    
    return {
        isRunning: false,
        port: 4723,
        host: 'localhost'
    };
}

async function getConnectedDevices(): Promise<DeviceInfo[]> {
    try {
        const { stdout } = await execAsync('xcrun devicectl list devices --json-output /tmp/devices_troubleshoot.json');
        const fs = require('fs');
        
        if (fs.existsSync('/tmp/devices_troubleshoot.json')) {
            const data = JSON.parse(fs.readFileSync('/tmp/devices_troubleshoot.json', 'utf8'));
            const devices: DeviceInfo[] = [];
            
            for (const device of data.result.devices) {
                if (device.hardwareProperties.productType.includes('iPhone')) {
                    devices.push({
                        udid: device.hardwareProperties.udid,
                        name: device.deviceProperties.name,
                        version: device.deviceProperties.osVersionNumber,
                        status: device.state
                    });
                }
            }
            
            fs.unlinkSync('/tmp/devices_troubleshoot.json');
            return devices;
        }
    } catch (error) {
        logger.error('Failed to get connected devices:', error);
    }
    
    return [];
}

async function checkWebDriverAgent(): Promise<boolean> {
    try {
        // Check if WebDriverAgent is properly installed
        const { stdout } = await execAsync('ls -la /tmp/WebDriverAgent 2>/dev/null || echo "not found"');
        if (stdout.includes('not found')) {
            logger.warn('⚠️  WebDriverAgent not found in /tmp/WebDriverAgent');
            return false;
        }
        
        logger.info('✅ WebDriverAgent directory exists');
        return true;
    } catch (error) {
        logger.error('Failed to check WebDriverAgent:', error);
        return false;
    }
}

async function checkNetworkConnectivity(): Promise<void> {
    try {
        // Check network interfaces
        const { stdout } = await execAsync('ifconfig | grep "inet " | grep -v 127.0.0.1');
        logger.info('Network interfaces:');
        stdout.split('\n').forEach(line => {
            if (line.trim()) {
                logger.info(`  ${line.trim()}`);
            }
        });
    } catch (error) {
        logger.error('Failed to check network connectivity:', error);
    }
}

async function suggestTimeoutFixes(): Promise<void> {
    logger.info('=== Suggested Timeout Fixes ===');
    logger.info('1. Increase timeout values in appium.service.ts:');
    logger.info('   - newCommandTimeout: 300 (5 minutes)');
    logger.info('   - launchTimeout: 120000 (2 minutes)');
    logger.info('   - connectionRetryCount: 15');
    logger.info('   - connectionRetryTimeout: 120000');
    logger.info('   - waitforTimeout: 60000');
    logger.info('');
    logger.info('2. Add these capabilities to improve stability:');
    logger.info('   - useNewWDA: true');
    logger.info('   - usePrebuiltWDA: false');
    logger.info('   - derivedDataPath: "/tmp/WebDriverAgent"');
    logger.info('   - showXcodeLog: true');
    logger.info('   - showIOSLog: true');
    logger.info('');
    logger.info('3. Start Appium with these arguments:');
    logger.info('   appium --base-path / --relaxed-security --log-level debug');
    logger.info('');
    logger.info('4. Check device trust settings:');
    logger.info('   - Go to Settings > General > Device Management');
    logger.info('   - Trust the developer certificate');
    logger.info('');
    logger.info('5. Restart WebDriverAgent:');
    logger.info('   - Kill existing WDA processes');
    logger.info('   - Clear derived data: rm -rf /tmp/WebDriverAgent');
}

async function troubleshootAppium(): Promise<void> {
    logger.info('🔍 Starting Appium troubleshooting...');
    logger.info('');
    
    // Check 1: Appium server status
    logger.info('=== Check 1: Appium Server Status ===');
    const serverInfo = await checkAppiumServer();
    
    if (!serverInfo.isRunning) {
        logger.info('💡 To start Appium server, run:');
        logger.info('   appium --base-path / --relaxed-security --log-level debug');
        logger.info('');
    }
    
    // Check 2: Connected devices
    logger.info('=== Check 2: Connected Devices ===');
    const devices = await getConnectedDevices();
    
    if (devices.length === 0) {
        logger.warn('⚠️  No iOS devices found');
        logger.info('💡 Make sure your device is:');
        logger.info('   - Connected via USB');
        logger.info('   - Unlocked');
        logger.info('   - Trusted on this computer');
    } else {
        logger.info(`✅ Found ${devices.length} iOS device(s):`);
        devices.forEach(device => {
            logger.info(`   - ${device.name} (${device.udid}) - iOS ${device.version} - ${device.status}`);
        });
    }
    
    // Check 3: WebDriverAgent
    logger.info('=== Check 3: WebDriverAgent Status ===');
    const wdaExists = await checkWebDriverAgent();
    
    if (!wdaExists) {
        logger.info('💡 WebDriverAgent will be built automatically on first connection');
    }
    
    // Check 4: Network connectivity
    logger.info('=== Check 4: Network Connectivity ===');
    await checkNetworkConnectivity();
    
    // Check 5: Suggest fixes
    logger.info('');
    await suggestTimeoutFixes();
    
    logger.info('');
    logger.info('🎯 Troubleshooting complete!');
    logger.info('Run the test script to verify fixes:');
    logger.info('   npx ts-node test-appium-connection.ts');
}

// Run troubleshooting
troubleshootAppium().catch(error => {
    logger.error('Troubleshooting failed:', error);
    process.exit(1);
});
