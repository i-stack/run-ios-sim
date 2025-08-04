import { AppiumConfigManager } from './src/config/appium.config';
import { AppiumService } from './src/services/appium.service';
import { Logger } from './src/utils/logger';

const logger = new Logger('DeviceDetectionTest');

async function testDeviceDetection() {
    try {
        const configManager = AppiumConfigManager.getInstance();
        
        logger.info('Detecting available iOS devices...');
        await configManager.detectAndConfigureDevices();
        
        const availableDevices = configManager.getAvailableDevices();
        logger.info(`Found ${availableDevices.length} devices:`, availableDevices);
        
        if (availableDevices.length === 0) {
            logger.error('No iOS devices found. Please ensure:');
            logger.error('1. iOS device is connected via USB');
            logger.error('2. Device is unlocked and trusted');
            logger.error('3. Xcode is installed and updated');
            return;
        }
        
        // Test connection with the first available device
        const testDeviceId = availableDevices[0];
        logger.info(`Testing connection with device: ${testDeviceId}`);
        
        const appiumService = new AppiumService();
        const driver = await appiumService.initializeDriver(testDeviceId);
        
        logger.info('Successfully connected to device!');
        
        // Clean up
        await appiumService.closeDriver(testDeviceId);
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Device detection test failed:', errorMessage);
        
        if (errorMessage.includes('timeout')) {
            logger.error('Timeout error. This could be due to:');
            logger.error('1. Device not properly connected');
            logger.error('2. Appium server not running');
            logger.error('3. WebDriverAgent not installed on device');
        }
    }
}

if (require.main === module) {
    testDeviceDetection().catch(error => {
        logger.error(`Test failed: ${error.message}`);
        process.exit(1);
    });
} 