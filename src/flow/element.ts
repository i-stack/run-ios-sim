import { Logger } from '../utils/logger';
import { ElementDebugger, findElementWithRetry } from '../utils/element.debugger';

const logger = new Logger('FindElement');

/**
 * Find button element by text
 * @param driver WebDriver instance
 * @param text Text to search for
 * @returns Promise<any>
 */
export async function findByButton(driver: WebdriverIO.Browser, text: string): Promise<any> {
    try {
        const element = await driver.$(`//XCUIElementTypeButton[@name="${text}"]`);
        if (await element.isExisting()) {
            logger.info(`找到Button: ${text}`);
            return element;
        }
        const partialElement = await driver.$(`//XCUIElementTypeButton[contains(@name, "${text}")]`);
        if (await partialElement.isExisting()) {
            logger.info(`通过部分匹配找到Button: ${text}`);
            return partialElement;
        }
        logger.error(`查找Button失败: ${text}`);
        return null;
    } catch (error) {
        logger.error(`查找Button失败: ${text}, 错误: ${error}`);
        return null;
    }
}

/**
 * Find text field element by name
 * @param driver WebDriver instance
 * @param text Text to search for
 * @returns Promise<any>
 */
export async function findByTextFieldWithName(driver: WebdriverIO.Browser, text: string): Promise<any> {
    try {
        const element = await driver.$(`//XCUIElementTypeTextField[@name="${text}"]`);
        if (await element.isExisting()) {
            logger.info(`找到TextFieldWithName: ${text}`);
            return element;
        }
        const partialElement = await driver.$(`//XCUIElementTypeTextField[contains(@name, "${text}")]`);
        if (await partialElement.isExisting()) {
            logger.info(`通过部分匹配找到TextFieldWithName: ${text}`);
            return partialElement;
        }
        logger.error(`查找TextFieldWithName失败: ${text}`);
        return null;
    } catch (error) {
        logger.error(`查找TextFieldWithName失败: ${text}, 错误: ${error}`);
        return null;
    }
}

/**
 * Find text field element by value
 * @param driver WebDriver instance
 * @param text Text to search for
 * @returns Promise<any>
 */
export async function findByTextFieldWithValue(driver: WebdriverIO.Browser, text: string): Promise<any> {
    try {
        const element = await driver.$(`//XCUIElementTypeTextField[@value="${text}"]`);
        if (await element.isExisting()) {
            logger.info(`找到TextFieldWithValue: ${text}`);
            return element;
        }
        const partialElement = await driver.$(`//XCUIElementTypeTextField[contains(@value, "${text}")]`);
        if (await partialElement.isExisting()) {
            logger.info(`通过部分匹配找到TextFieldWithValue: ${text}`);
            return partialElement;
        }
        logger.error(`查找TextFieldWithValue失败: ${text}`);
        return null;
    } catch (error) {
        logger.error(`查找TextFieldWithValue失败: ${text}, 错误: ${error}`);
        return null;
    }
}

/**
 * Find text field element by placeholder
 * @param driver WebDriver instance
 * @param placeholder Placeholder text to search for
 * @returns Promise<any>
 */
export async function findByTextFieldWithPlaceholder(driver: WebdriverIO.Browser, placeholder: string): Promise<any> {
    try {
        const element = await driver.$(`//XCUIElementTypeTextField[@placeholder="${placeholder}"]`);
        if (await element.isExisting()) {
            logger.info(`找到TextFieldWithPlaceholder: ${placeholder}`);
            return element;
        }
        const partialElement = await driver.$(`//XCUIElementTypeTextField[contains(@name, "${placeholder}")]`);
        if (await partialElement.isExisting()) {
            logger.info(`通过部分匹配找到TextFieldWithPlaceholder: ${placeholder}`);
            return partialElement;
        }
        logger.error(`查找TextFieldWithPlaceholder失败: ${placeholder}`);
        return null;
    } catch (error) {
        logger.error(`查找TextFieldWithPlaceholder失败: ${placeholder}, 错误: ${placeholder}`);
        return null;
    }
}

/**
 * Find tab bar element by text
 * @param driver WebDriver instance
 * @param text Text to search for
 * @returns Promise<any>
 */
export async function findByTabBar(driver: WebdriverIO.Browser, text: string): Promise<any> {
    try {
        const element = await driver.$(`//XCUIElementTypeTabBar[@name="${text}"]`);
        if (await element.isExisting()) {
            logger.info(`找到TabBar: ${text}`);
            return element;
        }
        const partialElement = await driver.$(`//XCUIElementTypeTabBar[contains(@name, "${text}")]`);
        if (await partialElement.isExisting()) {
            logger.info(`通过部分匹配找到TabBar: ${text}`);
            return partialElement;
        }
        logger.error(`查找TabBar失败: ${text}`);
        return null;
    } catch (error) {
        logger.error(`查找TabBar失败: ${text}, 错误: ${error}`);
        return null;
    }
}

/**
 * Find static text element by text
 * @param driver WebDriver instance
 * @param text Text to search for
 * @returns Promise<any>
 */
export async function findByStaticText(driver: WebdriverIO.Browser, text: string): Promise<any> {
    try {
        const element = await driver.$(`//XCUIElementTypeStaticText[@name="${text}"]`);
        if (await element.isExisting()) {
            logger.info(`找到StaticText: ${text}`);
            return element;
        }
        const partialElement = await driver.$(`//XCUIElementTypeStaticText[contains(@name, "${text}")]`);
        if (await partialElement.isExisting()) {
            logger.info(`通过部分匹配找到StaticText: ${text}`);
            return partialElement;
        }
        logger.error(`查找StaticText失败: ${text}`);
        return null;
    } catch (error) {
        logger.error(`查找StaticText失败: ${text}, 错误: ${error}`);
        return null;
    }
}

/**
 * 调试页面结构
 * @param driver WebDriver instance
 */
export async function debugPageStructure(driver: any): Promise<void> {
    const elementDebugger = new ElementDebugger(driver);
    await elementDebugger.analyzePageStructure();
}

/**
 * 等待应用完全加载
 * @param driver WebDriver instance
 * @param maxWaitTime Maximum wait time in milliseconds
 */
export async function waitForAppLoad(driver: any, maxWaitTime: number = 30000): Promise<boolean> {
    const elementDebugger = new ElementDebugger(driver);
    return await elementDebugger.waitForAppLoad(maxWaitTime);
} 