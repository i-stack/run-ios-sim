import { Logger } from '../utils/logger';
import { getNumber, getSms } from './phone';
import { AppiumService } from '../services/appium.service';
import { handleNetworkPermission } from '../utils/network';
import { NetworkCaptureService } from '../services/network.capture.service';
import { getCurrentPage, PageTypeEnum, PAGE_CONFIG, reinstallViber } from './page';

const logger = new Logger('Register');

let pkey: string = '';
let driver: WebdriverIO.Browser;
const appiumService = new AppiumService();
let networkService: NetworkCaptureService | null = null;
let currentDeviceId: string | null = null;
let stopWatching: (() => void) | null = null;

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
            const deviceIdentifier = deviceId || driver.sessionId;
            await startNetworkCapture(deviceIdentifier);
            await driver.pause(2000);
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
                    country: 'pol',
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
    // await restartApp(driver, deviceId);
    // await register(driver, deviceId);

    await reinstallViber(driver);
}

/**
 * 启动网络捕获
 */
async function startNetworkCapture(deviceId: string): Promise<void> {
    try {
        logger.info(`Starting network capture for device: ${deviceId}`);
        networkService = new NetworkCaptureService();
        currentDeviceId = deviceId;
        await networkService.startCapture(deviceId);
        logger.info(`Network capture started for device: ${deviceId}`);
        await networkService.setupProxyForDevice(deviceId);
        await networkService.installMitmproxyCertificate(deviceId);
        stopWatching = networkService.watchForNewResponses(deviceId, (response) => {
            logger.info('Viber API captured:', {
                url: response.url,
                method: response.method,
                statusCode: response.statusCode,
                timestamp: response.timestamp
            });
        });
        logger.info(`Network capture setup completed for device: ${deviceId}`);
    } catch (error) {
        logger.error(`Network capture error: ${error instanceof Error ? error.message : String(error)}`);
        networkService = null;
        currentDeviceId = null;
        stopWatching = null;
    }
}

/**
 * 停止网络捕获
 */
export async function stopNetworkCapture(): Promise<void> {
    try {
        if (networkService && currentDeviceId) {
            logger.info(`Stopping network capture for device: ${currentDeviceId}`);
            if (stopWatching) {
                stopWatching();
                stopWatching = null;
            }
            const responses = networkService.readCapturedResponses(currentDeviceId);
            logger.info(`Captured ${responses.length} API responses`);
            // todo: 将 responses 上传到服务器，如何加密？
            await networkService.stopCapture(currentDeviceId);
            networkService = null;
            currentDeviceId = null;
            logger.info(`Network capture stopped for device: ${currentDeviceId}`);
        } else {
            logger.warn('No active network capture to stop');
        }
    } catch (error) {
        logger.error(`Error stopping network capture: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * 获取当前捕获的响应
 */
export function getCapturedResponses(): any[] {
    if (networkService && currentDeviceId) {
        return networkService.readCapturedResponses(currentDeviceId);
    }
    return [];
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