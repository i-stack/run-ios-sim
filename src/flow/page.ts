import { Logger } from '../utils/logger';
import {
    findByTabBar,
    findByButton,
    findByStaticText,
    findByTextFieldWithName,
    findByTextFieldWithValue
} from './element';

const logger = new Logger('CheckPage');

export type PageType = 'HOME' | 'PHONE_NUMBER' | 'CALL_ME'| 'VERIFICATION_CODE' | 'UNKNOWN';
export type ElementType = 'STATIC_TEXT' | 'BUTTON' | 'TEXT_FIELD_WITH_VALUE' | 'TEXT_FIELD_WITH_NAME' | 'TAB_BAR';
export const PageTypeEnum: Record<string, PageType> = {
    HOME: 'HOME',
    PHONE_NUMBER: 'PHONE_NUMBER',
    CALL_ME: 'CALL_ME',
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
async function checkSession(driver: WebdriverIO.Browser): Promise<boolean> {
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
async function findElementByType(driver: WebdriverIO.Browser, text: string, type: ElementType): Promise<any> {
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
            case 'TEXT_FIELD_WITH_VALUE':
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
            texts: ['标签页栏'],
            uniqueElement: {
                text: '标签页栏',
                type: 'TAB_BAR'
            }
        },
        action: async (driver: WebdriverIO.Browser): Promise<boolean> => {
            return await reinstallViber(driver);
        }
    },
    [PageTypeEnum.PHONE_NUMBER]: {
        features: {
            texts: ['Viber 设置', '输入您的电话号码'],
            uniqueElement: {
                text: '电话号码',
                type: 'TEXT_FIELD_WITH_VALUE'
            }
        },
        action: async (driver: WebdriverIO.Browser, text?: string, countryCode?: string): Promise<boolean> => {
            if (text && countryCode) {
                return await phoneNumberPageButtonClick(driver, text, countryCode);
            }
            return true;
        }
    },
    [PageTypeEnum.CALL_ME]: {
        features: {
            texts: ['即可完成激活', '可接到不需要接听的免费电话', '您就快完成了'],
            uniqueElement: {
                text: '打电话给我',
                type: 'BUTTON'
            }
        },
        action: async (driver: WebdriverIO.Browser): Promise<boolean> => {
            const backButton = await findByButton(driver, "打电话给我");
            if (backButton && await backButton.isExisting()) {
                await backButton.click();
                return true;
            }
            return false;
        }
    },
    [PageTypeEnum.VERIFICATION_CODE]: {
        features: {
            texts: ['请您所收到来电号码的后 4 位', '如果您不记得号码', '请查看“最近通话”屏幕'],
            uniqueElement: {
                text: '请您所收到来电号码的后 4 位',
                type: 'STATIC_TEXT'
            }
        },
        action: async (driver: WebdriverIO.Browser, verificationCode?: string): Promise<boolean> => {
            if (!verificationCode) {
                logger.error('验证码页面需要提供验证码参数');
                return false;
            }
            const success = await inputVerificationCode(driver, verificationCode);
            if (!success) {
                logger.error('输入验证码失败');
                return false;
            }
            logger.info('验证码输入成功');
            return true;
        }
    }
};

/**
 * Get current page type
 * @param driver WebDriver instance
 * @returns Promise<PageType>
 */
export async function getCurrentPage(driver: WebdriverIO.Browser): Promise<PageType> {
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
export async function homePageButtonClick(driver: WebdriverIO.Browser): Promise<boolean> {
    let tabBar = await findByTabBar(driver, "标签页栏");
    if (!tabBar?.isExisting()) return false;
    return true;
}

/**
 * Click button on phone number page
 * @param driver WebDriver instance
 * @param phoneNumber Phone number to enter
 * @param countryCode Country code to enter
 * @returns Promise<boolean>
 */
export async function phoneNumberPageButtonClick(driver: WebdriverIO.Browser, phoneNumber: string, countryCode: string): Promise<boolean> {
    try {
        const ccField = await findByTextFieldWithName(driver, "国家代码");
        if (!ccField?.isExisting()) return false;
        await ccField.click();
        await ccField.setValue(countryCode);
        logger.info(`输入国家/地区代码: ${countryCode}`);
        const phoneField = await findByTextFieldWithValue(driver, "电话号码");
        if (!phoneField?.isExisting()) return false;
        await phoneField.click();
        await phoneField.setValue(phoneNumber);
        logger.info(`输入电话号码: ${phoneNumber}`);
        const nextButton = await findByStaticText(driver, "继续");
        if (!nextButton?.isExisting()) return false;
        await nextButton.click();
        logger.info("点击下一步按钮");
        const confirmButton = await findByButton(driver, "是");
        if (!confirmButton?.isExisting()) return false;
        await confirmButton.click();
        logger.info("点击确认按钮");
        await driver.pause(3000);
        const page = await getCurrentPage(driver);
        if (page === PageTypeEnum.PHONE_NUMBER) {
            return false;
        }
        return true;
    } catch (error) {
        logger.error(`处理电话号码页面失败: ${error}`);
        return false;
    }
}

/**
 * Input verification code into the 4 text fields
 * @param driver WebDriver instance
 * @param verificationCode 4-digit verification code
 * @returns Promise<boolean>
 */
export async function inputVerificationCode(driver: WebdriverIO.Browser, verificationCode: string): Promise<boolean> {
    try {
        const container = await driver.$('//XCUIElementTypeOther[count(.//XCUIElementTypeTextField)=4]');
        if (!await container.isExisting()) {
            logger.error('未找到验证码输入框容器');
            return false;
        }
        const textFields = await container.$$('//XCUIElementTypeTextField');
        const fieldCount = await textFields.length;
        if (fieldCount !== 4) {
            logger.error(`找到的输入框数量不正确: ${fieldCount}, 期望4个`);
            return false;
        }
        for (let i = 0; i < 4; i++) {
            try {
                const digit = verificationCode[i];
                const textField = textFields[i];
                await textField.click();
                await driver.pause(500); 
                await textField.setValue(digit);
                logger.info(`输入第${i + 1}位验证码: ${digit}`);
                await driver.pause(300); 
            } catch (error) {
                logger.error(`输入第${i + 1}位验证码失败: ${error}`);
                return false;
            }
        }
        logger.info(`验证码输入完成: ${verificationCode}`);
        return true;
    } catch (error) {
        logger.error(`输入验证码失败: ${error}`);
        return false;
    }
}

/**
 * Alternative method to input verification code using direct XPath
 * @param driver WebDriver instance
 * @param verificationCode 4-digit verification code
 * @returns Promise<boolean>
 */
export async function inputVerificationCodeDirect(driver: WebdriverIO.Browser, verificationCode: string): Promise<boolean> {
    try {
        const textFieldSelectors = [
            '//XCUIElementTypeTextField[@index="0"]',
            '//XCUIElementTypeTextField[@index="1"]',
            '//XCUIElementTypeTextField[@index="2"]',
            '//XCUIElementTypeTextField[@index="3"]'
        ];
        for (let i = 0; i < 4; i++) {
            try {
                const digit = verificationCode[i];
                const selector = textFieldSelectors[i];
                const textField = await driver.$(selector);
                if (!await textField.isExisting()) {
                    logger.error(`未找到第${i + 1}个输入框: ${selector}`);
                    return false;
                }
                await textField.click();
                await driver.pause(500); 
                await textField.setValue(digit);
                logger.info(`输入第${i + 1}位验证码: ${digit}`);
                await driver.pause(300);
            } catch (error) {
                logger.error(`输入第${i + 1}位验证码失败: ${error}`);
                return false;
            }
        }
        logger.info(`验证码输入完成: ${verificationCode}`);
        return true;
    } catch (error) {
        logger.error(`输入验证码失败: ${error}`);
        return false;
    }
}

/**
 * Input verification code using precise XPath based on actual page structure
 * @param driver WebDriver instance
 * @param verificationCode 4-digit verification code
 * @returns Promise<boolean>
 */
export async function inputVerificationCodePrecise(driver: WebdriverIO.Browser, verificationCode: string): Promise<boolean> {
    try {
        const textFieldSelectors = [
            '//XCUIElementTypeOther[count(.//XCUIElementTypeTextField)=4]//XCUIElementTypeTextField[@index="0"]',
            '//XCUIElementTypeOther[count(.//XCUIElementTypeTextField)=4]//XCUIElementTypeTextField[@index="1"]',
            '//XCUIElementTypeOther[count(.//XCUIElementTypeTextField)=4]//XCUIElementTypeTextField[@index="2"]',
            '//XCUIElementTypeOther[count(.//XCUIElementTypeTextField)=4]//XCUIElementTypeTextField[@index="3"]'
        ];
        for (let i = 0; i < 4; i++) {
            try {
                const digit = verificationCode[i];
                const selector = textFieldSelectors[i];
                const textField = await driver.$(selector);
                if (!await textField.isExisting()) {
                    logger.error(`未找到第${i + 1}个输入框: ${selector}`);
                    return false;
                }
                await textField.click();
                await driver.pause(500); 
                await textField.setValue(digit);
                logger.info(`输入第${i + 1}位验证码: ${digit}`);
                await driver.pause(300); 
            } catch (error) {
                logger.error(`输入第${i + 1}位验证码失败: ${error}`);
                return false;
            }
        }
        logger.info(`验证码输入完成: ${verificationCode}`);
        return true;
    } catch (error) {
        logger.error(`输入验证码失败: ${error}`);
        return false;
    }
}

/**
 * Example function showing how to handle verification code page
 * @param driver WebDriver instance
 * @param verificationCode 4-digit verification code
 * @returns Promise<boolean>
 */
export async function handleVerificationCodePage(driver: WebdriverIO.Browser, verificationCode: string): Promise<boolean> {
    try {
        const currentPage = await getCurrentPage(driver);
        if (currentPage !== PageTypeEnum.VERIFICATION_CODE) {
            logger.error(`当前页面不是验证码页面: ${currentPage}`);
            return false;
        }
        const success1 = await inputVerificationCode(driver, verificationCode);
        if (success1) {
            return true;
        } 

        const success2 = await inputVerificationCodeDirect(driver, verificationCode);
        if (success2) {
            return true;
        }

        const success3 = await inputVerificationCodePrecise(driver, verificationCode);
        if (success3) {
            return true;
        }

        return false;
    } catch (error) {
        logger.error(`处理验证码页面失败: ${error}`);
        return false;
    }
}

async function reinstallViber(driver: WebdriverIO.Browser) {
    try {
        logger.info('开始重新安装 Viber...');
        logger.info('终止 Viber 应用...');
        await driver.terminateApp('com.viber', { force: true });
        await driver.pause(2000);
        logger.info('卸载 Viber 应用...');
        try {
            await driver.executeScript('mobile: shell', ['xcrun simctl uninstall booted com.viber']);
            logger.info('使用 simctl 卸载 Viber');
        } catch (error) {
            logger.info('simctl 卸载失败，尝试手动卸载...');
            try {
                const viberIcon = await driver.$('~Viber');
                if (await viberIcon.isDisplayed()) {
                    const location = await viberIcon.getLocation();
                    const size = await viberIcon.getSize();
                    await driver.touchAction([
                        { action: 'longPress', x: location.x + size.width/2, y: location.y + size.height/2 },
                        { action: 'wait', ms: 1000 },
                        { action: 'release' }
                    ]);
                    await driver.pause(2000);
                    const deleteButton = await driver.$('~删除应用');
                    if (await deleteButton.isDisplayed()) {
                        await deleteButton.click();
                        await driver.pause(1000);
                        const confirmDelete = await driver.$('~删除');
                        if (await confirmDelete.isDisplayed()) {
                            await confirmDelete.click();
                            await driver.pause(3000);
                            logger.info('Viber 应用已手动卸载');
                        }
                    }
                }
            } catch (manualError) {
                logger.warn('手动卸载也失败，继续执行下载流程...');
            }
        }
        
        logger.info('打开 App Store...');
        await driver.activateApp('com.apple.AppStore');
        await driver.pause(3000);
        
        logger.info('搜索 Viber...');
        
        let searchTab = null;
        try {
            searchTab = await findByButton(driver, "UIA.AppStore.TabBar.search");
            if (searchTab && await searchTab.isExisting()) {
                await searchTab.click();
                await driver.pause(1000);
            }
        } catch (error) {
            logger.info('未找到搜索标签，尝试其他方式...');
        }
    
        try {
            const searchField = await findByTextFieldWithValue(driver, "游戏、App、故事等");
            if (searchField && await searchField.isExisting()) {
                await searchField.click();
                await searchField.setValue('Rakuten Viber Messenger');
                await driver.pause(2000);

                // 输入后需要点击键盘上的 search 按钮进行搜索
                const searchButton = await findByButton(driver, "Search");
                if (searchButton && await searchButton.isExisting()) {
                    await searchButton.click();
                }
                await driver.pause(2000);

                // 搜索结果中找到 Viber 应用
            }
        } catch (error) {
            logger.info('搜索功能不可用，尝试直接查找 Viber 应用...');
        }
        
        logger.info('开始下载 Viber...');
        const viberApp = await findByButton(driver, "Rakuten Viber Messenger");
        if (viberApp && await viberApp.isExisting()) {
            await viberApp.click();
            await driver.pause(2000);
            const downloadButton = await findByButton(driver, "UIA.AppStore.OfferButton");
            if (downloadButton && await downloadButton.isExisting()) {
                await downloadButton.click();
                await driver.pause(1000);
                
                const passwordField = await driver.$('~密码');
                if (await passwordField.isDisplayed()) {
                    const applePassword = process.env.APPLE_ID_PASSWORD;
                    if (applePassword) {
                        await passwordField.setValue(applePassword);
                        await driver.pause(1000);
                        
                        const okButton = await driver.$('~好') || await driver.$('~确定');
                        if (await okButton.isDisplayed()) {
                            await okButton.click();
                        }
                    } else {
                        logger.warn('需要 Apple ID 密码，请设置 APPLE_ID_PASSWORD 环境变量');
                    }
                }
                
                logger.info('等待 Viber 下载完成...');
                let downloadComplete = false;
                let waitTime = 0;
                const maxWaitTime = 300000; 
                
                while (!downloadComplete && waitTime < maxWaitTime) {
                    await driver.pause(5000);
                    waitTime += 5000;
                    const openButton = await driver.$('~打开');
                    if (await openButton.isDisplayed()) {
                        downloadComplete = true;
                        logger.info('Viber 下载完成');
                    }
                }
                if (!downloadComplete) {
                    throw new Error('Viber 下载超时');
                }
            }
        }
        
        logger.info('打开 Viber...');
        await driver.activateApp('com.viber');
        await driver.pause(5000);
        logger.info('Viber 重新安装完成');
        return true;
    } catch (error) {
        logger.error(`重新安装 Viber 失败: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}