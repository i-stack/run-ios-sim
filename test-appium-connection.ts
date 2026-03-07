#!/usr/bin/env ts-node

import { AppiumService } from './src/services/appium.service';
import { Logger } from './src/utils/logger';

const logger = new Logger('AppiumConnectionTest');

async function testAppiumConnection() {
    const appiumService = new AppiumService();
    
    try {
        logger.info('Starting Appium connection test...');
        
        // Test 1: Check available devices
        logger.info('=== Test 1: Checking available devices ===');
        const availableDevices = appiumService.getActiveDevices();
        logger.info(`Available devices: ${availableDevices.join(', ')}`);
        
        // Test 2: Get device configurations
        logger.info('=== Test 2: Checking device configurations ===');
        const deviceConfigs = appiumService.getDeviceConfig('test');
        logger.info(`Device configs: ${JSON.stringify(deviceConfigs, null, 2)}`);
        
        // Test 3: Test network connectivity
        logger.info('=== Test 3: Testing network connectivity ===');
        const currentIP = await appiumService.getCurrentDeviceIP();
        logger.info(`Current device IP: ${currentIP}`);
        
        const allIPs = await appiumService.getAllAvailableIPs();
        logger.info(`All available IPs: ${JSON.stringify(allIPs, null, 2)}`);
        
        // Test 4: Scan for network devices
        logger.info('=== Test 4: Scanning for network devices ===');
        const networkDevices = await appiumService.scanNetworkForDevices();
        logger.info(`Network devices found: ${networkDevices.length}`);
        networkDevices.forEach(device => {
            logger.info(`  - IP: ${device.ip}, MAC: ${device.mac}, Apple: ${device.isApple}`);
        });
        
        // Test 5: Auto-discover devices
        logger.info('=== Test 5: Auto-discovering devices ===');
        const discoveredDevices = await appiumService.autoDiscoverDevices();
        logger.info(`Discovered devices: ${discoveredDevices.length}`);
        discoveredDevices.forEach(device => {
            logger.info(`  - Device ID: ${device.deviceId}, IP: ${device.ip}, Status: ${device.status}`);
        });
        
        // Test 6: Auto-configure remote devices
        logger.info('=== Test 6: Auto-configuring remote devices ===');
        await appiumService.autoConfigureRemoteDevices();
        
        // Test 7: Get device info
        logger.info('=== Test 7: Getting device information ===');
        const deviceInfo = await appiumService.getCurrentDeviceInfo();
        logger.info(`Device info: ${JSON.stringify(deviceInfo, null, 2)}`);
        
        logger.info('Appium connection test completed successfully!');
        
    } catch (error) {
        logger.error('Appium connection test failed:', error);
        
        // Additional debugging information
        logger.info('=== Debugging Information ===');
        logger.info('1. Make sure Appium server is running: appium');
        logger.info('2. Check if devices are connected: xcrun devicectl list devices');
        logger.info('3. Verify network connectivity');
        logger.info('4. Check firewall settings');
        logger.info('5. Ensure WebDriverAgent is properly installed');
        
        process.exit(1);
    }
}

// Run the test
testAppiumConnection().catch(error => {
    logger.error('Test failed:', error);
    process.exit(1);
});
