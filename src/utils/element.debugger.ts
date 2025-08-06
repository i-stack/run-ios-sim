import { Logger } from './logger';

const logger = new Logger('ElementDebugger');

export interface ElementInfo {
    type: string;
    name: string;
    value?: string;
    enabled: boolean;
    visible: boolean;
    path: string;
}

export class ElementDebugger {
    private driver: any;

    constructor(driver: any) {
        this.driver = driver;
    }

    /**
     * 获取页面源码并分析元素结构
     */
    async analyzePageStructure(): Promise<void> {
        try {
            const pageSource = await this.driver.getPageSource();
            logger.info('=== 页面结构分析 ===');
            
            // 分析XCUIElementTypeApplication
            const appElements = this.extractElementsByType(pageSource, 'XCUIElementTypeApplication');
            logger.info(`找到 ${appElements.length} 个应用元素`);
            
            // 分析XCUIElementTypeOther
            const otherElements = this.extractElementsByType(pageSource, 'XCUIElementTypeOther');
            logger.info(`找到 ${otherElements.length} 个Other类型元素`);
            
            // 分析所有元素类型
            const elementTypes = this.extractAllElementTypes(pageSource);
            logger.info('元素类型统计:', elementTypes);
            
            // 查找可交互元素
            const interactiveElements = this.findInteractiveElements(pageSource);
            logger.info(`找到 ${interactiveElements.length} 个可交互元素`);
            
        } catch (error) {
            logger.error(`页面结构分析失败: ${error}`);
        }
    }

    /**
     * 等待应用完全加载
     */
    async waitForAppLoad(maxWaitTime: number = 30000): Promise<boolean> {
        const startTime = Date.now();
        const checkInterval = 2000;

        while (Date.now() - startTime < maxWaitTime) {
            try {
                const pageSource = await this.driver.getPageSource();
                
                // 检查是否有具体的UI元素而不是只有Other
                const hasSpecificElements = this.hasSpecificUIElements(pageSource);
                
                if (hasSpecificElements) {
                    logger.info('应用已完全加载');
                    return true;
                }
                
                logger.info('等待应用加载...');
                await this.driver.pause(checkInterval);
                
            } catch (error) {
                logger.error(`等待应用加载时出错: ${error}`);
                return false;
            }
        }
        
        logger.warn('应用加载超时');
        return false;
    }

    /**
     * 查找特定元素的所有可能定位方式
     */
    async findElementLocators(text: string): Promise<string[]> {
        try {
            const pageSource = await this.driver.getPageSource();
            const locators: string[] = [];

            // 1. 通过name属性查找
            locators.push(`//XCUIElementTypeAny[contains(@name, "${text}")]`);
            
            // 2. 通过value属性查找
            locators.push(`//XCUIElementTypeAny[contains(@value, "${text}")]`);
            
            // 3. 通过label属性查找
            locators.push(`//XCUIElementTypeAny[contains(@label, "${text}")]`);
            
            // 4. 通过accessibilityLabel查找
            locators.push(`//XCUIElementTypeAny[contains(@accessibilityLabel, "${text}")]`);

            // 测试每个定位器
            const validLocators: string[] = [];
            for (const locator of locators) {
                try {
                    const element = await this.driver.$(locator);
                    if (await element.isExisting()) {
                        validLocators.push(locator);
                        logger.info(`有效定位器: ${locator}`);
                    }
                } catch (error) {
                    // 忽略无效定位器
                }
            }

            return validLocators;
        } catch (error) {
            logger.error(`查找元素定位器失败: ${error}`);
            return [];
        }
    }

    /**
     * 获取元素的详细信息
     */
    async getElementInfo(locator: string): Promise<ElementInfo | null> {
        try {
            const element = await this.driver.$(locator);
            if (!await element.isExisting()) {
                return null;
            }

            const info: ElementInfo = {
                type: await element.getAttribute('type') || 'unknown',
                name: await element.getAttribute('name') || '',
                value: await element.getAttribute('value') || undefined,
                enabled: await element.isEnabled(),
                visible: await element.isDisplayed(),
                path: locator
            };

            return info;
        } catch (error) {
            logger.error(`获取元素信息失败: ${error}`);
            return null;
        }
    }

    /**
     * 强制刷新页面结构
     */
    async refreshPageStructure(): Promise<void> {
        try {
            // 尝试滚动页面来触发UI更新
            await this.driver.executeScript('mobile: scroll', { direction: 'up' });
            await this.driver.pause(1000);
            await this.driver.executeScript('mobile: scroll', { direction: 'down' });
            await this.driver.pause(1000);
            
            logger.info('页面结构已刷新');
        } catch (error) {
            logger.error(`刷新页面结构失败: ${error}`);
        }
    }

    /**
     * 检查是否有具体的UI元素
     */
    private hasSpecificUIElements(pageSource: string): boolean {
        const specificTypes = [
            'XCUIElementTypeButton',
            'XCUIElementTypeTextField',
            'XCUIElementTypeStaticText',
            'XCUIElementTypeTabBar',
            'XCUIElementTypeNavigationBar',
            'XCUIElementTypeTable',
            'XCUIElementTypeCell'
        ];

        return specificTypes.some(type => pageSource.includes(type));
    }

    /**
     * 提取指定类型的元素
     */
    private extractElementsByType(pageSource: string, elementType: string): string[] {
        const regex = new RegExp(`<${elementType}[^>]*>`, 'g');
        const matches = pageSource.match(regex) || [];
        return matches;
    }

    /**
     * 提取所有元素类型
     */
    private extractAllElementTypes(pageSource: string): Record<string, number> {
        const typeRegex = /<XCUIElementType(\w+)/g;
        const types: Record<string, number> = {};
        
        let match;
        while ((match = typeRegex.exec(pageSource)) !== null) {
            const type = match[1];
            types[type] = (types[type] || 0) + 1;
        }
        
        return types;
    }

    /**
     * 查找可交互元素
     */
    private findInteractiveElements(pageSource: string): string[] {
        const interactiveTypes = [
            'XCUIElementTypeButton',
            'XCUIElementTypeTextField',
            'XCUIElementTypeTabBar',
            'XCUIElementTypeCell'
        ];

        const elements: string[] = [];
        for (const type of interactiveTypes) {
            const matches = this.extractElementsByType(pageSource, type);
            elements.push(...matches);
        }

        return elements;
    }
}

/**
 * 改进的元素查找函数
 */
export async function findElementWithRetry(
    driver: any, 
    locator: string, 
    maxRetries: number = 3,
    retryDelay: number = 2000
): Promise<any> {
    const elementDebugger = new ElementDebugger(driver);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // 等待应用加载
            if (attempt === 1) {
                await elementDebugger.waitForAppLoad();
            }
            
            const element = await driver.$(locator);
            if (await element.isExisting()) {
                logger.info(`元素找到: ${locator}`);
                return element;
            }
            
            // 如果没找到，尝试刷新页面结构
            if (attempt < maxRetries) {
                await elementDebugger.refreshPageStructure();
                await driver.pause(retryDelay);
            }
            
        } catch (error) {
            logger.error(`第 ${attempt} 次尝试失败: ${error}`);
            if (attempt === maxRetries) {
                throw error;
            }
        }
    }
    
    throw new Error(`元素未找到: ${locator}`);
} 