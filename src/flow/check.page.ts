import axios from 'axios';
import { Logger } from '../utils/logger';
import { AppiumService } from '../services/appium.service';
import {
    findByButton, 
    findByTabBar,
    findByStaticText, 
    findByTextFieldWithName, 
    findByTextFieldWithValue
} from './find.element';

const logger = new Logger('CheckPage');

const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

export type PageType = 'HOME' | 'PHONE_NUMBER' | 'VERIFICATION_CODE' | 'UNKNOWN';
export type ElementType = 'STATIC_TEXT' | 'BUTTON' | 'TEXT_FIELD' | 'TEXT_FIELD_WITH_NAME' | 'TAB_BAR';

export const PageTypeEnum: Record<string, PageType> = {
    HOME: 'HOME',
    PHONE_NUMBER: 'PHONE_NUMBER',
    VERIFICATION_CODE: 'VERIFICATION_CODE',
    UNKNOWN: 'UNKNOWN'
};

interface UniqueElement {
    text: string;
    type: ElementType;
}

interface PageFeatures {
    texts: string[];
    uniqueElement: UniqueElement;
}

interface PageConfig {
    features: PageFeatures;
    action: (driver: any, text?: string, countryCode?: string) => Promise<boolean>;
}

type PageConfigMap = Record<string, PageConfig>;

/**
 * Check if WebDriver session is active
 * @param driver WebDriver instance
 * @returns Promise<boolean>
 */
async function checkSession(driver: any): Promise<boolean> {
    try {
        await driver.getPageSource();
        return true;
    } catch (error) {
        logger.error(`WebDriver session error: ${error}`);
        return false;
    }
}

/**
 * Find element by type and text
 * @param driver WebDriver instance
 * @param text Text to search for
 * @param type Element type
 * @returns Promise<any>
 */
async function findElementByType(driver: any, text: string, type: ElementType): Promise<any> {
    try {
        if (!await checkSession(driver)) {
            logger.error('WebDriver session is not active');
            return null;
        }
        switch (type) {
            case 'STATIC_TEXT':
                return await findByStaticText(driver, text);
            case 'BUTTON':
                return await findByButton(driver, text);
            case 'TEXT_FIELD':
                return await findByTextFieldWithValue(driver, text);
            case 'TEXT_FIELD_WITH_NAME':
                return await findByTextFieldWithName(driver, text);
            case 'TAB_BAR':
                return await findByTabBar(driver, text);
            default:
                return null;
        }
    } catch (error: any) {
        if (error.message && error.message.includes('session is either terminated or not started')) {
            logger.error(`WebDriver session error: ${error}`);
            return null;
        }
        logger.error(`Error finding element of type ${type} with text ${text}: ${error}`);
        return null;
    }
}

export const PAGE_CONFIG: PageConfigMap = {
    [PageTypeEnum.HOME]: {
        features: {
            texts: ['欢迎使用 WhatsApp', '你使用 WhatsApp 服务的亲朋好友', '隐私政策', '服务条款'],
            uniqueElement: {
                text: '欢迎使用 WhatsApp',
                type: 'STATIC_TEXT'
            }
        },
        action: async (driver: any): Promise<boolean> => {
            return await homePageButtonClick(driver);
        }
    },
    [PageTypeEnum.PHONE_NUMBER]: {
        features: {
            texts: ['输入电话号码', '运营商可能会向你收取费用', 'WhatsApp 需要验证你的账户'],
            uniqueElement: {
                text: '你的电话号码',
                type: 'TEXT_FIELD_WITH_NAME'
            }
        },
        action: async (driver: any, text?: string, countryCode?: string): Promise<boolean> => {
            if (text && countryCode) {
                return await phoneNumberPageButtonClick(driver, text, countryCode);
            }
            return true;
        }
    },
    [PageTypeEnum.VERIFICATION_CODE]: {
        features: {
            texts: ['验证你的电话号码', '请输入我们通过短信发送到', '没有收到验证码？'],
            uniqueElement: {
                text: '验证你的电话号码',
                type: 'STATIC_TEXT'
            }
        },
        action: async (driver: any): Promise<boolean> => {
            const backButton = await findByButton(driver, "返回");
            if (backButton && await backButton.isExisting()) {
                await backButton.click();
                return true;
            }
            return false;
        }
    }
};

/**
 * Get current page type
 * @param driver WebDriver instance
 * @returns Promise<PageType>
 */
export async function getCurrentPage(driver: any): Promise<PageType> {
    try {
        const pageSource = await driver.getPageSource();
        for (const [pageType, config] of Object.entries(PAGE_CONFIG)) {
            const { features } = config;
            const hasAllTexts = features.texts.every(text => pageSource.includes(text));
            if (hasAllTexts) {
                const uniqueElement = await findElementByType(driver, features.uniqueElement.text, features.uniqueElement.type);
                if (uniqueElement && await uniqueElement.isExisting()) {
                    return pageType as PageType;
                }
            }
        }
        return PageTypeEnum.UNKNOWN;
    } catch (error) {
        logger.error(`Error getting current page: ${error}`);
        return PageTypeEnum.UNKNOWN;
    }
}

/**
 * Click button on home page
 * @param driver WebDriver instance
 * @param maxRetries Maximum number of retries
 * @returns Promise<boolean>
 */
export async function homePageButtonClick(driver: any, maxRetries: number = MAX_RETRIES): Promise<boolean> {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            let agreeButton = await findByButton(driver, "同意并继续");
            if (!agreeButton) {
                agreeButton = await driver.$(`//XCUIElementTypeWindow/XCUIElementTypeOther[2]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[3]`);
            }
            if (agreeButton && await agreeButton.isExisting()) {
                await agreeButton.click();
                logger.info("点击同意并继续按钮");
                return true;
            }
            retries++;
            await driver.pause(RETRY_DELAY);
        } catch (error) {
            logger.error(`点击同意并继续按钮失败: ${error}`);
            retries++;
            await driver.pause(RETRY_DELAY);
        }
    }
    return false;
}

/**
 * Click button on phone number page
 * @param driver WebDriver instance
 * @param phoneNumber Phone number to enter
 * @param countryCode Country code to enter
 * @returns Promise<boolean>
 */
export async function phoneNumberPageButtonClick(driver: any, phoneNumber: string, countryCode: string): Promise<boolean> {
    try {
        const ccField = await findByTextFieldWithName(driver, "国家/地区代码");
        if (!ccField?.isExisting()) return false;
        await ccField.click();
        await ccField.setValue(countryCode);
        logger.info(`输入国家/地区代码: ${countryCode}`);
        const phoneField = await findByTextFieldWithName(driver, "你的电话号码");
        if (!phoneField?.isExisting()) return false;
        await phoneField.click();
        await phoneField.setValue(phoneNumber);
        logger.info(`输入电话号码: ${phoneNumber}`);
        const nextButton = await findByButton(driver, "下一步");
        if (!nextButton?.isExisting()) return false;
        await nextButton.click();
        logger.info("点击下一步按钮");
        return true;
    } catch (error) {
        logger.error(`处理电话号码页面失败: ${error}`);
        return false;
    }
}

/**
 * Dismiss popup by clicking at coordinates
 * @param x X coordinate (default: 40)
 * @param y Y coordinate (default: 770)
 * @returns Promise<void>
 */
// async function dismissPopup(x: number = 40, y: number = 770): Promise<void> {
//     logger.info(`Attempting to dismiss popup at coordinates (${x}, ${y})`);
//     await clickByCoordinates(x, y);
//     logger.info('Popup dismissed successfully');
// }

// /**
//  * Click by coordinates
//  * @param x X coordinate
//  * @param y Y coordinate
//  * @param duration Click duration in milliseconds (default: 100)
//  * @returns Promise<boolean>
//  */
// async function clickByCoordinates(x: number, y: number, duration: number = 100): Promise<boolean> {
//     try {
//         logger.info(`Attempting to click at coordinates (${x}, ${y}) with duration ${duration}ms`);
//         const sessionId = await getSessionId();
//         const { hostname, port } = (new AppiumService()).getConfig();
//         const response = await axios.post(`http://${hostname}:${port}/session/${sessionId}/actions`, {
//             actions: [{
//                 type: 'pointer',
//                 id: 'finger1',
//                 parameters: { pointerType: 'touch' },
//                 actions: [
//                     { type: 'pointerMove', duration: 0, x, y },
//                     { type: 'pointerDown', button: 0 },
//                     { type: 'pause', duration },
//                     { type: 'pointerUp', button: 0 }
//                 ]}
//             ]
//         });
//         if (response.status === 200) {
//             logger.info(`Successfully clicked at coordinates (${x}, ${y})`);
//         }
//         return true;
//     } catch (error: any) {
//         logger.error(`Failed to click at coordinates (${x}, ${y}): ${error.message}`);
//         return true;
//     }
// }

// /**
//  * Hide keyboard
//  * @returns Promise<boolean>
//  */
// async function hideKeyboard(): Promise<boolean> {
//     const sessionId = await getSessionId();
//     if (!sessionId) {
//         return true;
//     }
//     const { hostname, port } = (new AppiumService()).getConfig();
//     try {
//         await axios.post(`http://${hostname}:${port}/session/${sessionId}/appium/device/hide_keyboard`);
//         logger.info('Keyboard hidden successfully using hide_keyboard command');
//         return true;
//     } catch (error) {
//         logger.warn('hide_keyboard command failed, trying alternative methods');
//         return true;
//     }    
// }

// /**
//  * Get current session ID
//  * @returns Promise<string> Session ID
//  */
// async function getSessionId(): Promise<string> {
//     try {
//         const { hostname, port } = (new AppiumService()).getConfig();
//         const response = await axios.get(`http://${hostname}:${port}/sessions`);
//         const sessions = response.data.value;
//         if (sessions && sessions.length > 0) {
//             return sessions[0].id;
//         }
//         throw new Error('No active session found');
//     } catch (error: any) {
//         logger.error(`Failed to get session ID: ${error.message}`);
//         throw error;
//     }
// } 