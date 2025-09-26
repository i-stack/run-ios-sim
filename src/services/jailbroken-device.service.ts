import { remote, RemoteOptions } from 'webdriverio';
import { JailbrokenDeviceManager, JailbrokenDeviceConfig } from '../config/jailbroken-device.config';
import { Logger } from '../utils/logger';
import { TestResult } from '../types';

export class JailbrokenDeviceService {
    private deviceManager: JailbrokenDeviceManager;
    private logger: Logger;
    private activeSessions: Map<string, any> = new Map();

    constructor() {
        this.deviceManager = JailbrokenDeviceManager.getInstance();
        this.logger = new Logger('JailbrokenDeviceService');
    }

    /**
     * 连接到越狱设备
     */
    async connectToJailbrokenDevice(deviceId: string): Promise<any> {
        try {
            this.logger.info(`Connecting to jailbroken device: ${deviceId}`);

            // 获取越狱设备配置
            const config = this.deviceManager.createJailbrokenAppiumConfig(deviceId);
            
            // 创建 WebDriver 会话
            const options: RemoteOptions = {
                hostname: config.host,
                port: config.port,
                path: '/wd/hub',
                capabilities: config.capabilities,
                logLevel: 'info',
                connectionRetryCount: 3,
                connectionRetryTimeout: 120000
            };

            this.logger.info(`Creating session for jailbroken device: ${deviceId}`, {
                host: config.host,
                port: config.port,
                udid: config.deviceConfig.udid
            });

            const session = await remote(options);
            this.activeSessions.set(deviceId, session);
            
            this.logger.info(`Successfully connected to jailbroken device: ${deviceId}`);
            return session;
        } catch (error) {
            this.logger.error(`Failed to connect to jailbroken device: ${deviceId}`, error);
            throw error;
        }
    }

    /**
     * 在越狱设备上执行 Viber 注册测试
     */
    async performJailbrokenViberRegistration(deviceId: string, phoneNumber: string): Promise<TestResult> {
        const startTime = Date.now();
        let session: any;

        try {
            this.logger.info(`Starting jailbroken Viber registration test for device: ${deviceId}`);
            
            // 连接到设备
            session = await this.connectToJailbrokenDevice(deviceId);

            // 启动 Viber 应用
            await session.activateApp('com.viber.Viber');
            this.logger.info('Viber app activated on jailbroken device');

            // 等待应用加载
            await session.pause(3000);

            // 查找并点击注册按钮（越狱设备可能需要不同的定位策略）
            const registerButton = await session.$('~Register') || 
                                 await session.$('~注册') || 
                                 await session.$('~Sign Up') ||
                                 await session.$('~Create Account');

            if (registerButton) {
                await registerButton.click();
                this.logger.info('Register button clicked on jailbroken device');
            } else {
                throw new Error('Register button not found on jailbroken device');
            }

            // 输入手机号
            const phoneInput = await session.$('~Phone Number') || 
                             await session.$('~手机号') || 
                             await session.$('~Phone');

            if (phoneInput) {
                await phoneInput.setValue(phoneNumber);
                this.logger.info(`Phone number entered: ${phoneNumber}`);
            }

            // 点击继续按钮
            const continueButton = await session.$('~Continue') || 
                                 await session.$('~继续') || 
                                 await session.$('~Next');

            if (continueButton) {
                await continueButton.click();
                this.logger.info('Continue button clicked');
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            return {
                success: true,
                deviceId,
                testType: 'jailbroken_viber_registration',
                duration,
                data: {
                    phoneNumber,
                    jailbroken: true,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            this.logger.error(`Jailbroken Viber registration test failed for device: ${deviceId}`, error);
            
            return {
                success: false,
                deviceId,
                testType: 'jailbroken_viber_registration',
                duration: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error',
                data: {
                    phoneNumber,
                    jailbroken: true,
                    timestamp: new Date().toISOString()
                }
            };
        } finally {
            if (session) {
                await this.disconnectFromDevice(deviceId);
            }
        }
    }

    /**
     * 断开设备连接
     */
    async disconnectFromDevice(deviceId: string): Promise<void> {
        const session = this.activeSessions.get(deviceId);
        if (session) {
            try {
                await session.deleteSession();
                this.activeSessions.delete(deviceId);
                this.logger.info(`Disconnected from jailbroken device: ${deviceId}`);
            } catch (error) {
                this.logger.error(`Error disconnecting from device: ${deviceId}`, error);
            }
        }
    }

    /**
     * 断开所有设备连接
     */
    async disconnectAllDevices(): Promise<void> {
        const promises = Array.from(this.activeSessions.keys()).map(deviceId => 
            this.disconnectFromDevice(deviceId)
        );
        await Promise.all(promises);
        this.logger.info('Disconnected from all jailbroken devices');
    }

    /**
     * 获取活跃的越狱设备会话
     */
    getActiveSessions(): string[] {
        return Array.from(this.activeSessions.keys());
    }

    /**
     * 检查设备连接状态
     */
    async checkDeviceConnection(deviceId: string): Promise<boolean> {
        try {
            const session = this.activeSessions.get(deviceId);
            if (!session) {
                return false;
            }
            
            // 尝试获取设备信息来验证连接
            await session.getPageSource();
            return true;
        } catch (error) {
            this.logger.error(`Device connection check failed for: ${deviceId}`, error);
            return false;
        }
    }

    /**
     * 获取越狱设备信息
     */
    getJailbrokenDeviceInfo(deviceId: string): JailbrokenDeviceConfig | undefined {
        return this.deviceManager.getJailbrokenDevice(deviceId);
    }

    /**
     * 添加越狱设备配置
     */
    addJailbrokenDevice(deviceId: string, config: JailbrokenDeviceConfig): void {
        this.deviceManager.addJailbrokenDevice(deviceId, config);
        this.logger.info(`Added jailbroken device configuration: ${deviceId}`);
    }
} 