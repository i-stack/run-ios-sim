import axios from 'axios';
import { Logger } from './logger';

const logger = new Logger('Network');

/**
 * Check network connectivity status
 * @param driver - WebDriver instance
 * @returns Promise<boolean> - true if network is available, false otherwise
 */
export async function checkNetworkStatus(driver: any): Promise<boolean> {
    try {
        const response = await axios.get('https://www.baidu.com', {
            timeout: 5000 
        });
        if (response.status === 200 || response.status === 204) {
            return true;
        }
        logger.warn('检测到网络未连接，正在打开设置...');
        return false;
    } catch (error) {
        logger.warn('检测到网络未连接，正在打开设置...');
        return false;
    }
}

/**
 * Handle network permission settings for WhatsApp
 * @param driver - WebDriver instance
 * @returns Promise<boolean> - true if permission setup successful, false otherwise
 */
export async function handleNetworkPermission(driver: any): Promise<boolean> {
    try {
        const hasNetwork = await checkNetworkStatus(driver);
        if (!hasNetwork) {
            await driver.execute('mobile: launchApp', {
                bundleId: 'com.apple.Preferences'
            });
            await driver.pause(2000);
            try {
                const searchField = await driver.$('//XCUIElementTypeSearchField');
                if (await searchField.isExisting()) {
                    await searchField.click();
                    await searchField.setValue('WhatsApp');
                    await driver.pause(2000);
                    await driver.execute('mobile: tap', {
                        x: 162,
                        y: 127
                    });
                    await driver.pause(5000);
                    await driver.execute('mobile: tap', {
                        x: 373,
                        y: 395
                    });
                    await driver.pause(2000);
                    await driver.execute('mobile: tap', {
                        x: 267,
                        y: 269
                    });
                    await driver.pause(2000);
                    await driver.execute('mobile: launchApp', {
                        bundleId: 'net.whatsapp.WhatsApp'
                    });
                    await driver.pause(2000);
                    return true;
                } else {
                    logger.warn('未找到搜索框，请手动操作');
                    return false;
                }
            } catch (error) {
                logger.warn('自动设置网络权限失败，请手动操作');
                return false;
            }
        }
        return true;
    } catch (error) {
        logger.error(`处理网络权限时出错: ${error}`);
        return false;
    }
} 