import { AppiumService } from './src/services/appium.service';
import { AppiumConfigManager } from './src/config/appium.config';
import { Logger } from './src/utils/logger';

const logger = new Logger('AppiumTest');

async function testAppiumConnection() {
    try {
        // Create a test device config
        const configManager = AppiumConfigManager.getInstance();
        const testConfig = {
            host: 'localhost',
            port: 4723,
            deviceConfig: {
                udid: 'test-device',
                deviceName: 'iPhone Test',
                platformVersion: '15.0',
                bundleId: 'com.viber'
            },
            capabilities: {
                platformName: 'iOS',
                'appium:automationName': 'XCUITest',
                'appium:deviceName': 'iPhone Test',
                'appium:platformVersion': '15.0',
                'appium:bundleId': 'com.viber',
                'appium:udid': 'test-device'
            }
        };
        
        configManager.addDeviceConfig('test-device', testConfig);
        
        // Test the connection
        const appiumService = new AppiumService();
        logger.info('Testing Appium connection...');
        
        // This should fail gracefully with a device not found error
        // rather than a server connection error
        await appiumService.initializeDriver('test-device');
        
    } catch (error) {
        if (error.message.includes('Device config not found')) {
            logger.error('Configuration error:', error.message);
        } else if (error.message.includes('Appium server is not accessible')) {
            logger.error('Server connection error:', error.message);
        } else {
            logger.error('Other error:', error.message);
        }
    }
}

if (require.main === module) {
    testAppiumConnection().catch(error => {
        logger.error(`Test failed: ${error.message}`);
        process.exit(1);
    });
} 