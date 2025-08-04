import { AppiumService } from './src/services/appium.service';
import { AppiumConfigManager } from './src/config/appium.config';
import { Logger } from './src/utils/logger';

const logger = new Logger('ConnectionTest');

async function testDeviceConnection() {
    try {
        const deviceId = '0C87052D-A8E5-50CB-ABC2-608D32D80CE3';
        
        logger.info(`Testing connection with device: ${deviceId}`);
        
        // 手动配置设备
        const configManager = AppiumConfigManager.getInstance();
        const config = {
            host: 'localhost',
            port: 4723,
            deviceConfig: {
                udid: deviceId,
                deviceName: 'song',
                platformVersion: '17.0',
                bundleId: 'com.viber'
            },
            capabilities: {
                platformName: 'iOS',
                'appium:automationName': 'XCUITest',
                'appium:deviceName': 'song',
                'appium:platformVersion': '17.0',
                'appium:bundleId': 'com.viber',
                'appium:udid': deviceId,
                'appium:noReset': true,
                'appium:autoAcceptAlerts': true,
                'appium:autoGrantPermissions': true,
                'appium:newCommandTimeout': 120
            }
        };
        
        configManager.addDeviceConfig(deviceId, config);
        
        const appiumService = new AppiumService();
        const driver = await appiumService.initializeDriver(deviceId);
        
        logger.info('Successfully connected to device!');
        
        // 测试基本操作
        await driver.pause(2000);
        const pageSource = await driver.getPageSource();
        logger.info('Page source length:', pageSource.length);
        
        // 清理
        await appiumService.closeDriver(deviceId);
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Connection test failed:', errorMessage);
        
        if (errorMessage.includes('timeout')) {
            logger.error('Timeout error. Possible causes:');
            logger.error('1. Device not properly connected');
            logger.error('2. WebDriverAgent not installed');
            logger.error('3. Device not unlocked');
            logger.error('4. Device not trusted');
        }
    }
}

if (require.main === module) {
    testDeviceConnection().catch(error => {
        logger.error(`Test failed: ${error.message}`);
        process.exit(1);
    });
} 