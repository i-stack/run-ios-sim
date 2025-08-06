import { AppiumService } from '../services/appium.service';
import { handleNetworkPermission } from '../utils/network';
import { Logger } from '../utils/logger';
import { getCurrentPage, PageTypeEnum, PAGE_CONFIG } from './page';
import { getNumber, getSms } from './phone';

const logger = new Logger('Register');

let pkey: string = '';
let driver: WebdriverIO.Browser;
const appiumService = new AppiumService();

export async function startRegister(deviceId?: string, useAutoDiscovery: boolean = false) {
    try {
        if (!deviceId) {
            if (useAutoDiscovery) {
                logger.info('Using auto-discovery for remote devices...');
                driver = await appiumService.initializeDriverWithAutoDiscovery();
            } else {
                const configManager = appiumService['configManager'];
                await configManager.detectAndConfigureDevices();
                const availableDevices = configManager.getAvailableDevices();
                if (availableDevices.length === 0) {
                    throw new Error('No available iOS devices found. Please connect and pair a device first.');
                }
                deviceId = availableDevices[0];
                logger.info(`Using device: ${deviceId}`);
                driver = await appiumService.initializeDriver(deviceId, true);
            }
        } else {
            driver = await appiumService.initializeDriver(deviceId!, false);
        }
        let res = await handleNetworkPermission(driver);
        if (res) {
            await driver.pause(2000);
            // 如果使用自动发现，deviceId 可能为 undefined，使用 sessionId 作为标识
            const deviceIdentifier = deviceId || driver.sessionId;
            await register(driver, deviceIdentifier);
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
				await pageConfig.action(driver);
				break;
			case PageTypeEnum.PHONE_NUMBER:
                let phoneData = await getNumber({
                    country: 'phl',
                    maxPrice: '10'
                });
                pkey = phoneData?.pkey || '';
				let result = await pageConfig.action(driver, phoneData?.phoneNumber, phoneData?.countryCode);
                if (result) {
                    await register(driver, deviceId);
                } else {
                    await restartAppAndRegister(driver, deviceId);
                }
				break;
			case PageTypeEnum.CALL_ME:
                await pageConfig.action(driver);
                await driver.pause(1000);
                await register(driver, deviceId);
				break;
			case PageTypeEnum.VERIFICATION_CODE:
                // await pageConfig.action(driver, '123');
                if (!pkey) {
                    await driver.pause(1000);
                    await restartAppAndRegister(driver, deviceId);
                } else {
                    let sms = await getSms(pkey);
                    if (!sms) {
                        await driver.pause(1000);
                        await restartAppAndRegister(driver, deviceId);
                    } else {
                        await pageConfig.action(driver, sms);
                        await driver.pause(1000);
                        await register(driver, deviceId);
                    }
                }
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
    startRegister('00008101-00026C982160001E').catch(error => {
        logger.error(`Failed to start registration: ${error}`);
        process.exit(1);
    });
}