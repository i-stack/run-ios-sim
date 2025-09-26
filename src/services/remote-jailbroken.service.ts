import { remote, RemoteOptions } from 'webdriverio';
import { RemoteJailbrokenManager, RemoteJailbrokenConfig } from '../config/remote-jailbroken.config';
import { Logger } from '../utils/logger';
import { TestResult } from '../types';

export class RemoteJailbrokenService {
    private logger: Logger;
    private configManager: RemoteJailbrokenManager;
    private activeSessions: Map<string, any> = new Map();

    constructor() {
        this.logger = new Logger('RemoteJailbrokenService');
        this.configManager = RemoteJailbrokenManager.getInstance();
        this.configManager.initializeDefaultRemoteConfig();
    }

    async connectToRemoteDevice(deviceId: string): Promise<any> {
        try {
            this.logger.info(`🔌 尝试远程连接到设备: ${deviceId}`);

            const deviceConfig = this.configManager.getRemoteDevice(deviceId);
            if (!deviceConfig) {
                throw new Error(`设备配置未找到: ${deviceId}`);
            }

            this.logger.info('📱 设备配置:', {
                deviceName: deviceConfig.deviceName,
                deviceIp: deviceConfig.deviceIp,
                wdaLocalPort: deviceConfig.wdaLocalPort,
                webDriverAgentUrl: deviceConfig.webDriverAgentUrl
            });

            // 检查远程设备连接
            await this.checkRemoteDeviceConnection(deviceConfig);

            // 创建 WebDriver 会话
            const appiumConfig = this.configManager.createRemoteAppiumConfig(deviceId);
            
            const options: RemoteOptions = {
                hostname: 'localhost',
                port: 4723,
                path: '/wd/hub',
                capabilities: {
                    alwaysMatch: appiumConfig.capabilities,
                    firstMatch: [{}]
                },
                logLevel: 'info',
                connectionRetryCount: deviceConfig.connectionRetryCount,
                connectionRetryTimeout: deviceConfig.connectionRetryTimeout
            };

            this.logger.info('🚀 创建远程 WebDriver 会话...');
            const session = await remote(options);
            
            this.activeSessions.set(deviceId, session);
            this.logger.info(`✅ 成功远程连接到设备: ${deviceId}`);

            return session;

        } catch (error) {
            this.logger.error(`❌ 远程连接设备失败: ${deviceId}`, error);
            throw error;
        }
    }

    private async checkRemoteDeviceConnection(deviceConfig: RemoteJailbrokenConfig): Promise<void> {
        try {
            this.logger.info(`🔍 检查远程设备连接: ${deviceConfig.deviceIp}:${deviceConfig.wdaLocalPort}`);
            
            // 检查 WebDriverAgent 是否在远程设备上运行
            const response = await fetch(`${deviceConfig.webDriverAgentUrl}/status`);
            
            if (response.ok) {
                this.logger.info('✅ WebDriverAgent 在远程设备上运行');
            } else {
                throw new Error(`WebDriverAgent 未在远程设备上运行: ${deviceConfig.webDriverAgentUrl}`);
            }
        } catch (error) {
            this.logger.error('❌ 远程设备连接检查失败:', error);
            throw new Error(`无法连接到远程设备 ${deviceConfig.deviceIp}:${deviceConfig.wdaLocalPort}`);
        }
    }

    async performRemoteViberRegistration(deviceId: string, phoneNumber: string): Promise<TestResult> {
        const startTime = Date.now();
        
        try {
            this.logger.info(`📱 开始远程 Viber 注册测试: ${deviceId}`);
            this.logger.info(`📞 测试手机号: ${phoneNumber}`);

            const session = await this.connectToRemoteDevice(deviceId);

            // 执行 Viber 注册测试
            this.logger.info('🧪 执行 Viber 注册测试...');

            // 启动 Viber 应用
            this.logger.info('📱 启动 Viber 应用...');
            await session.activateApp('com.viber.Viber');
            this.logger.info('✅ Viber 应用已启动');

            // 等待应用加载
            await session.pause(3000);
            this.logger.info('⏳ 等待应用加载完成');

            // 查找并点击注册按钮
            this.logger.info('🔍 查找注册按钮...');
            const registerButton = await session.$('~Register');
            if (await registerButton.isExisting()) {
                await registerButton.click();
                this.logger.info('✅ 点击注册按钮');
            } else {
                this.logger.warn('⚠️ 未找到注册按钮，尝试其他方式');
            }

            // 输入手机号
            this.logger.info('📝 输入手机号...');
            const phoneInput = await session.$('~Phone number input');
            if (await phoneInput.isExisting()) {
                await phoneInput.setValue(phoneNumber);
                this.logger.info('✅ 手机号已输入');
            } else {
                this.logger.warn('⚠️ 未找到手机号输入框');
            }

            // 等待处理
            await session.pause(2000);

            const duration = Date.now() - startTime;

            return {
                success: true,
                deviceId,
                testType: 'remote_viber_registration',
                duration,
                data: {
                    phoneNumber,
                    jailbroken: true,
                    remote: true,
                    deviceIp: this.configManager.getRemoteDevice(deviceId)?.deviceIp,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('💥 远程 Viber 注册测试失败:', error);

            return {
                success: false,
                deviceId,
                testType: 'remote_viber_registration',
                duration,
                error: error instanceof Error ? error.message : 'Unknown error',
                data: {
                    phoneNumber,
                    jailbroken: true,
                    remote: true,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    async disconnectFromDevice(deviceId: string): Promise<void> {
        try {
            const session = this.activeSessions.get(deviceId);
            if (session) {
                await session.deleteSession();
                this.activeSessions.delete(deviceId);
                this.logger.info(`🔌 已断开设备连接: ${deviceId}`);
            }
        } catch (error) {
            this.logger.error(`❌ 断开设备连接失败: ${deviceId}`, error);
        }
    }

    async disconnectAllDevices(): Promise<void> {
        this.logger.info('🔌 断开所有设备连接...');
        
        for (const [deviceId, session] of this.activeSessions) {
            try {
                await session.deleteSession();
                this.logger.info(`✅ 已断开设备: ${deviceId}`);
            } catch (error) {
                this.logger.error(`❌ 断开设备失败: ${deviceId}`, error);
            }
        }
        
        this.activeSessions.clear();
        this.logger.info('✅ 所有设备连接已断开');
    }

    getActiveSessions(): string[] {
        return Array.from(this.activeSessions.keys());
    }

    async checkDeviceConnection(deviceId: string): Promise<boolean> {
        try {
            const deviceConfig = this.configManager.getRemoteDevice(deviceId);
            if (!deviceConfig) {
                return false;
            }

            const response = await fetch(`${deviceConfig.webDriverAgentUrl}/status`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    getRemoteDeviceInfo(deviceId: string): RemoteJailbrokenConfig | undefined {
        return this.configManager.getRemoteDevice(deviceId);
    }

    addRemoteDevice(deviceId: string, config: RemoteJailbrokenConfig): void {
        this.configManager.addRemoteDevice(deviceId, config);
    }
} 