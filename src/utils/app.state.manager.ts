import { Logger } from './logger';

const logger = new Logger('AppStateManager');

export interface AppState {
    isActive: boolean;
    isInForeground: boolean;
    isInAppSwitcher: boolean;
    hasVisibleElements: boolean;
    mainWindowIndex: number;
}

export class AppStateManager {
    private driver: any;

    constructor(driver: any) {
        this.driver = driver;
    }

    /**
     * 分析当前应用状态
     */
    async analyzeAppState(): Promise<AppState> {
        try {
            const pageSource = await this.driver.getPageSource();
            
            const state: AppState = {
                isActive: false,
                isInForeground: false,
                isInAppSwitcher: false,
                hasVisibleElements: false,
                mainWindowIndex: -1
            };

            // 检查是否在应用切换器中
            const hasAppSwitcher = pageSource.includes('SBSwitcherWindow:Main');
            state.isInAppSwitcher = hasAppSwitcher;

            // 检查是否有可见元素
            const visibleElements = pageSource.match(/visible="true"/g) || [];
            state.hasVisibleElements = visibleElements.length > 0;

            // 查找主窗口
            const windows = pageSource.match(/<XCUIElementTypeWindow[^>]*>/g) || [];
            for (let i = 0; i < windows.length; i++) {
                const window = windows[i];
                if (!window.includes('SBSwitcherWindow') && !window.includes('visible="false"')) {
                    state.mainWindowIndex = i;
                    break;
                }
            }

            // 检查应用是否活跃
            state.isActive = !state.isInAppSwitcher && state.hasVisibleElements;
            state.isInForeground = state.isActive && state.mainWindowIndex >= 0;

            logger.info('应用状态分析结果:', state);
            return state;

        } catch (error) {
            logger.error(`分析应用状态失败: ${error}`);
            return {
                isActive: false,
                isInForeground: false,
                isInAppSwitcher: false,
                hasVisibleElements: false,
                mainWindowIndex: -1
            };
        }
    }

    /**
     * 激活应用到前台
     */
    async activateApp(): Promise<boolean> {
        try {
            logger.info('尝试激活应用到前台...');

            // 方法1: 使用activate_app命令
            try {
                await this.driver.executeScript('mobile: activateApp', { 
                    bundleId: 'com.viber' 
                });
                logger.info('使用activateApp命令激活应用');
            } catch (error) {
                logger.warn(`activateApp命令失败: ${error}`);
            }

            // 等待应用激活
            await this.driver.pause(3000);

            // 检查激活结果
            const state = await this.analyzeAppState();
            if (state.isActive) {
                logger.info('应用已成功激活到前台');
                return true;
            }

            // 方法2: 尝试点击应用卡片
            if (state.isInAppSwitcher) {
                try {
                    const appCard = await this.driver.$('//XCUIElementTypeOther[@label="Viber"]');
                    if (await appCard.isExisting()) {
                        await appCard.click();
                        logger.info('点击Viber应用卡片');
                        await this.driver.pause(2000);
                        
                        const newState = await this.analyzeAppState();
                        if (newState.isActive) {
                            logger.info('通过点击应用卡片成功激活应用');
                            return true;
                        }
                    }
                } catch (error) {
                    logger.warn(`点击应用卡片失败: ${error}`);
                }
            }

            // 方法3: 使用home键然后重新打开应用
            try {
                await this.driver.executeScript('mobile: pressButton', { name: 'home' });
                logger.info('按Home键');
                await this.driver.pause(1000);
                
                await this.driver.executeScript('mobile: activateApp', { 
                    bundleId: 'com.viber' 
                });
                logger.info('重新激活应用');
                await this.driver.pause(3000);
                
                const finalState = await this.analyzeAppState();
                if (finalState.isActive) {
                    logger.info('通过Home键+重新激活成功');
                    return true;
                }
            } catch (error) {
                logger.warn(`Home键操作失败: ${error}`);
            }

            logger.error('所有激活方法都失败了');
            return false;

        } catch (error) {
            logger.error(`激活应用失败: ${error}`);
            return false;
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
                const state = await this.analyzeAppState();
                
                if (state.isActive && state.hasVisibleElements) {
                    logger.info('应用已完全加载');
                    return true;
                }
                
                logger.info('等待应用加载...', state);
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
     * 强制刷新应用状态
     */
    async refreshAppState(): Promise<void> {
        try {
            // 尝试多种刷新方法
            const methods = [
                () => this.driver.executeScript('mobile: scroll', { direction: 'up' }),
                () => this.driver.executeScript('mobile: scroll', { direction: 'down' }),
                () => this.driver.executeScript('mobile: pressButton', { name: 'home' }),
                () => this.driver.executeScript('mobile: activateApp', { bundleId: 'com.viber' })
            ];

            for (const method of methods) {
                try {
                    await method();
                    await this.driver.pause(1000);
                } catch (error) {
                    // 忽略单个方法的错误
                }
            }

            logger.info('应用状态已刷新');
        } catch (error) {
            logger.error(`刷新应用状态失败: ${error}`);
        }
    }

    /**
     * 获取应用信息
     */
    async getAppInfo(): Promise<any> {
        try {
            const appState = await this.driver.executeScript('mobile: queryAppState', { 
                bundleId: 'com.viber' 
            });
            
            const deviceTime = await this.driver.executeScript('mobile: getDeviceTime');
            
            return {
                appState,
                deviceTime,
                bundleId: 'com.viber'
            };
        } catch (error) {
            logger.error(`获取应用信息失败: ${error}`);
            return null;
        }
    }

    /**
     * 检查并修复应用状态
     */
    async checkAndFixAppState(): Promise<boolean> {
        try {
            logger.info('检查应用状态...');
            
            // 获取应用信息
            const appInfo = await this.getAppInfo();
            if (appInfo) {
                logger.info('应用信息:', appInfo);
            }

            // 分析当前状态
            const state = await this.analyzeAppState();
            logger.info('当前应用状态:', state);

            // 如果应用不在前台，尝试激活
            if (!state.isActive) {
                logger.info('应用不在前台，尝试激活...');
                const activated = await this.activateApp();
                if (!activated) {
                    logger.error('无法激活应用');
                    return false;
                }
            }

            // 等待应用完全加载
            const loaded = await this.waitForAppLoad();
            if (!loaded) {
                logger.error('应用加载超时');
                return false;
            }

            // 最终检查
            const finalState = await this.analyzeAppState();
            if (finalState.isActive && finalState.hasVisibleElements) {
                logger.info('应用状态正常');
                return true;
            } else {
                logger.error('应用状态异常:', finalState);
                return false;
            }

        } catch (error) {
            logger.error(`检查应用状态失败: ${error}`);
            return false;
        }
    }
}

/**
 * 便捷函数：确保应用在前台并完全加载
 */
export async function ensureAppInForeground(driver: any): Promise<boolean> {
    const manager = new AppStateManager(driver);
    return await manager.checkAndFixAppState();
} 