#!/usr/bin/env ts-node

import { AppiumService } from './src/services/appium.service';
import { Logger } from './src/utils/logger';

const logger = new Logger('SessionTest');

async function testSessionCreation() {
    const appiumService = new AppiumService();
    const targetDeviceId = '00008101-00026C982160001E'; // lianxinxi device
    
    try {
        logger.info('🚀 Starting session creation test...');
        logger.info(`Target device: ${targetDeviceId}`);
        
        // First, let's check if the device is configured
        const deviceConfig = appiumService.getDeviceConfig(targetDeviceId);
        if (!deviceConfig) {
            logger.info('Device not configured, auto-detecting devices...');
            // The service should auto-detect devices
        }
        
        logger.info('Attempting to initialize driver...');
        const driver = await appiumService.initializeDriver(targetDeviceId, false);
        
        logger.info('✅ Session created successfully!');
        logger.info(`Driver session ID: ${driver.sessionId}`);
        
        // Test a simple command
        logger.info('Testing basic driver functionality...');
        const deviceTime = await driver.getDeviceTime();
        logger.info(`Device time: ${deviceTime}`);
        
        // Close the session
        await appiumService.closeDriver(targetDeviceId);
        logger.info('✅ Session closed successfully');
        
    } catch (error) {
        logger.error('❌ Session creation failed:', error);
        
        // Additional debugging
        logger.info('=== Debug Information ===');
        logger.info('1. Check if device is unlocked');
        logger.info('2. Verify device trust settings in iOS Settings');
        logger.info('3. Ensure device is connected via USB');
        logger.info('4. Check Xcode developer certificate');
        
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testSessionCreation().catch(error => {
        logger.error('Test failed:', error);
        process.exit(1);
    });
}
