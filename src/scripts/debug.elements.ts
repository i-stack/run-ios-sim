#!/usr/bin/env ts-node

import { AppiumService } from '../services/appium.service';
import { ElementDebugger } from '../utils/element.debugger';
import { AppStateManager, ensureAppInForeground } from '../utils/app.state.manager';
import { Logger } from '../utils/logger';

const logger = new Logger('DebugElements');

async function debugElements() {
    const appiumService = new AppiumService();
    
    try {
        // 获取可用的设备
        const configManager = appiumService['configManager'];
        const availableDevices = configManager.getAvailableDevices();
        if (availableDevices.length === 0) {
            logger.error('没有找到可用的设备');
            return;
        }
        
        const deviceId = availableDevices[0];
        logger.info(`使用设备: ${deviceId}`);
        
        // 初始化驱动
        const driver = await appiumService.initializeDriver(deviceId);
        logger.info('Appium驱动初始化成功');
        
        // 创建应用状态管理器
        const appStateManager = new AppStateManager(driver);
        
        // 检查并修复应用状态
        logger.info('检查应用状态...');
        const appReady = await ensureAppInForeground(driver);
        
        if (!appReady) {
            logger.error('无法将应用激活到前台');
            return;
        }
        
        // 创建元素调试器
        const elementDebugger = new ElementDebugger(driver);
        
        // 等待应用加载
        logger.info('等待应用完全加载...');
        const isLoaded = await elementDebugger.waitForAppLoad();
        
        if (!isLoaded) {
            logger.error('应用加载超时');
            return;
        }
        
        // 分析页面结构
        logger.info('开始分析页面结构...');
        await elementDebugger.analyzePageStructure();
        
        // 获取页面源码
        const pageSource = await driver.getPageSource();
        
        // 分析XCUIElementTypeApplication
        const appElements = pageSource.match(/<XCUIElementTypeApplication[^>]*>/g) || [];
        logger.info(`找到 ${appElements.length} 个XCUIElementTypeApplication元素`);
        
        // 分析XCUIElementTypeOther
        const otherElements = pageSource.match(/<XCUIElementTypeOther[^>]*>/g) || [];
        logger.info(`找到 ${otherElements.length} 个XCUIElementTypeOther元素`);
        
        // 分析所有元素类型
        const elementTypes: Record<string, number> = {};
        const typeRegex = /<XCUIElementType(\w+)/g;
        let match;
        
        while ((match = typeRegex.exec(pageSource)) !== null) {
            const type = match[1];
            elementTypes[type] = (elementTypes[type] || 0) + 1;
        }
        
        logger.info('元素类型统计:');
        Object.entries(elementTypes)
            .sort(([,a], [,b]) => b - a)
            .forEach(([type, count]) => {
                logger.info(`  ${type}: ${count}`);
            });
        
        // 查找可交互元素
        const interactiveTypes = [
            'XCUIElementTypeButton',
            'XCUIElementTypeTextField',
            'XCUIElementTypeStaticText',
            'XCUIElementTypeTabBar',
            'XCUIElementTypeCell',
            'XCUIElementTypeNavigationBar',
            'XCUIElementTypeTable'
        ];
        
        logger.info('可交互元素:');
        for (const type of interactiveTypes) {
            const elements = pageSource.match(new RegExp(`<${type}[^>]*>`, 'g')) || [];
            if (elements.length > 0) {
                logger.info(`  ${type}: ${elements.length} 个`);
                // 显示前3个元素的详细信息
                elements.slice(0, 3).forEach((element, index) => {
                    logger.info(`    ${index + 1}. ${element}`);
                });
            }
        }
        
        // 查找可见元素
        logger.info('可见元素:');
        const visibleElements = pageSource.match(/<XCUIElementType\w+[^>]*visible="true"[^>]*>/g) || [];
        logger.info(`找到 ${visibleElements.length} 个可见元素`);
        visibleElements.slice(0, 10).forEach((element, index) => {
            logger.info(`  ${index + 1}. ${element}`);
        });
        
        // 尝试查找特定文本的元素
        const testTexts = ['登录', '注册', '手机号', '验证码', '继续', '下一步', 'Viber'];
        logger.info('查找特定文本的元素:');
        
        for (const text of testTexts) {
            const locators = await elementDebugger.findElementLocators(text);
            if (locators.length > 0) {
                logger.info(`  "${text}" 的定位器:`);
                locators.forEach(locator => {
                    logger.info(`    ${locator}`);
                });
            }
        }
        
        // 检查应用状态
        logger.info('检查应用状态...');
        try {
            const appState = await driver.executeScript('mobile: queryAppState', ['com.viber']);
            logger.info(`应用状态: ${appState}`);
        } catch (error) {
            logger.error(`获取应用状态失败: ${error}`);
        }
        
        // 检查WebDriverAgent状态
        logger.info('检查WebDriverAgent状态...');
        try {
            const wdaStatus = await driver.executeScript('mobile: getDeviceTime', []);
            logger.info(`设备时间: ${wdaStatus}`);
        } catch (error) {
            logger.error(`获取设备时间失败: ${error}`);
        }
        
        // 分析应用状态
        const finalState = await appStateManager.analyzeAppState();
        logger.info('最终应用状态:', finalState);
        
        // 如果应用状态正常，尝试查找一些常见元素
        if (finalState.isActive && finalState.hasVisibleElements) {
            logger.info('应用状态正常，尝试查找UI元素...');
            
            // 尝试查找一些常见的UI元素
            const commonElements = [
                '//XCUIElementTypeButton',
                '//XCUIElementTypeTextField',
                '//XCUIElementTypeStaticText',
                '//XCUIElementTypeTabBar',
                '//XCUIElementTypeNavigationBar'
            ];
            
            for (const xpath of commonElements) {
                try {
                    const elements = await driver.$$(xpath);
                    const elementCount = await elements.length;
                    if (elementCount > 0) {
                        logger.info(`找到 ${elementCount} 个 ${xpath} 元素`);
                        
                        // 检查前几个元素是否可见
                        for (let i = 0; i < Math.min(elementCount, 3); i++) {
                            try {
                                const isVisible = await elements[i].isDisplayed();
                                const isEnabled = await elements[i].isEnabled();
                                const name = await elements[i].getAttribute('name') || '无名称';
                                logger.info(`  元素 ${i + 1}: 可见=${isVisible}, 启用=${isEnabled}, 名称="${name}"`);
                            } catch (error) {
                                logger.warn(`  元素 ${i + 1}: 无法获取属性`);
                            }
                        }
                    }
                } catch (error) {
                    logger.warn(`查找 ${xpath} 失败: ${error}`);
                }
            }
        } else {
            logger.warn('应用状态异常，可能仍在应用切换器中');
        }
        
    } catch (error) {
        logger.error(`调试元素时出错: ${error}`);
    } finally {
        // 清理资源
        try {
            await appiumService.closeAllDrivers();
        } catch (error) {
            logger.error(`清理资源时出错: ${error}`);
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    debugElements().catch(error => {
        logger.error(`脚本执行失败: ${error}`);
        process.exit(1);
    });
}

export { debugElements }; 