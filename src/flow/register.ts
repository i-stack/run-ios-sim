import { AppiumService } from '../services/appium.service';
import { handleNetworkPermission } from '../utils/network';
import { Logger } from '../utils/logger';
import { getCurrentPage, PageTypeEnum, PAGE_CONFIG } from './check.page';

const logger = new Logger('Register');

let driver: WebdriverIO.Browser;
const appiumService = new AppiumService();

export async function startRegister(deviceId?: string) {
    try {
        if (!deviceId) {
            const configManager = appiumService['configManager'];
            await configManager.detectAndConfigureDevices();
            const availableDevices = configManager.getAvailableDevices();
            if (availableDevices.length === 0) {
                throw new Error('No available iOS devices found. Please connect and pair a device first.');
            }
            deviceId = availableDevices[0];
            logger.info(`Using device: ${deviceId}`);
        }
        
        driver = await appiumService.initializeDriver(deviceId);
        let res = await handleNetworkPermission(driver);
        if (res) {
            await driver.pause(2000);
            await register(driver, deviceId);
        } else {
            logger.error('startRegister error: 网络权限设置失败');
        }
    } catch (error) {
        logger.error(`startRegister error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function register(driver: WebdriverIO.Browser, deviceId: string) {
    try {
        let currentPage = await getCurrentPage(driver);
        if (currentPage === PageTypeEnum.UNKNOWN) {
            // let tryCount = 0;
            // let currentHasPage = false;
            // while(tryCount < 3) {
            //     let currentPage = await getCurrentPage(driver);
            //     if (currentPage !== PageTypeEnum.UNKNOWN) {
            //         currentHasPage = true;
            //         break;
            //     } 
            //     tryCount++;
            // }
            // await driver.pause(3000);
            // if (currentHasPage) {
            //     await register(driver, deviceId);
            // } else {
            //     await restartAppAndRegister(driver, deviceId);
            // }
            return
        }
        const pageConfig = PAGE_CONFIG[currentPage];
		switch (currentPage) {
			case PageTypeEnum.HOME:
				await driver.pause(1000);
			
				break;
			case PageTypeEnum.LOGIN:
				break;
			case PageTypeEnum.REGISTER:
				break;
			case PageTypeEnum.CHAT:
				break;
			case PageTypeEnum.SETTINGS:
				break;
			default:
				break;
		}
	} catch (error) {
		logger.error(`register error: ${error instanceof Error ? error.message : String(error)}`);
	}
}











async function restartAppAndRegister(driver: WebdriverIO.Browser, deviceId: string) {
    // while (await goBack(driver)) {
    //     await driver.pause(1000);
    // }
    // await resetPhoneNumber();
    await restartApp(driver, deviceId);
    await register(driver, deviceId);
}

async function restartApp(driver: WebdriverIO.Browser, deviceId: string) {
	const config = appiumService.getDeviceConfig(deviceId);
	if (!config) {
		throw new Error(`Device config not found for deviceId: ${deviceId}`);
	}
	const bundleId = config.deviceConfig.bundleId;
    await driver.terminateApp(bundleId, { force: true });
    await driver.pause(2000);
    await driver.activateApp(bundleId);
    await driver.pause(2000);
}

if (require.main === module) {
    // Use the first available device automatically
    startRegister().catch(error => {
        logger.error(`Failed to start registration: ${error}`);
        process.exit(1);
    });
}