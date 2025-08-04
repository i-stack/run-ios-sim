import { remote } from 'webdriverio';
import { AppiumConfigManager } from '../config/appium.config';
import { Logger } from '../utils/logger';
import { ApiResponse } from '../types';
import { NetworkCaptureService } from './network.capture.service';
import path from 'path';
import fs from 'fs';
import { AppiumConfig } from '../types';

export class AppiumService {
    private logger: Logger;
    private configManager: AppiumConfigManager;
    private networkCapture: NetworkCaptureService;
    private activeDrivers: Map<string, WebdriverIO.Browser> = new Map();

    constructor() {
        this.configManager = AppiumConfigManager.getInstance();
        this.logger = new Logger('AppiumService');
        this.networkCapture = new NetworkCaptureService();

        this.configManager.addDeviceConfig('2fcc54c4ab7082f8192fda979eb8758a3bfeb0f6', {
            host: 'localhost',
            port: 4723,
            deviceConfig: {
                udid: '2fcc54c4ab7082f8192fda979eb8758a3bfeb0f6',
                deviceName: 'iPhone7p',
                platformVersion: '15.8.2',
                bundleId: 'com.viber'
            },
            capabilities: {
                platformName: 'iOS',
                'appium:automationName': 'XCUITest',
                'appium:deviceName': 'iPhone7p',
                'appium:platformVersion': '15.8.2',
                'appium:udid': '2fcc54c4ab7082f8192fda979eb8758a3bfeb0f6',
                'appium:bundleId': 'com.viber',
                'appium:xcodeOrgId': 'K8Z622FY3F',
                "appium:noReset": true,
                "appium:autoAcceptAlerts": true,
            }
        });
    }

    public async initializeDriver(deviceId: string): Promise<WebdriverIO.Browser> {
        try {
            // Auto-detect devices if no config exists
            if (this.configManager.getAvailableDevices().length === 0) {
                this.logger.info('No device configurations found, auto-detecting devices...');
                await this.configManager.detectAndConfigureDevices();
            }
            
            const config = this.configManager.getDeviceConfig(deviceId);
            if (!config) {
                throw new Error(`Device config not found for deviceId: ${deviceId}. Available devices: ${this.configManager.getAvailableDevices().join(', ')}`);
            }
            const options = {
                hostname: config.host,
                port: config.port,
                path: '/',  // Changed from '/wd/hub' to '/'
                capabilities: config.capabilities,
                connectionRetryCount: 5,
                connectionRetryTimeout: 30000
            };
            this.logger.info(`Initializing Appium driver for device: ${deviceId}`, config);
            
            // Check if Appium server is running
            try {
                const response = await fetch(`http://${config.host}:${config.port}/status`);
                if (!response.ok) {
                    throw new Error(`Appium server is not responding at ${config.host}:${config.port}`);
                }
            } catch (serverError) {
                this.logger.error(`Appium server is not running at ${config.host}:${config.port}. Please start Appium server first.`);
                this.logger.info('To start Appium server, run: appium');
                throw new Error(`Appium server is not accessible. Please ensure Appium is running at ${config.host}:${config.port}`);
            }
            
            const driver = await remote(options);
            this.activeDrivers.set(deviceId, driver);
            this.configManager.registerSession(deviceId, driver);
            this.logger.info(`Appium driver initialized successfully for device: ${deviceId}`);
            return driver;
        } catch (error) {
            this.logger.error(`Failed to initialize Appium driver for device: ${deviceId}`, error);
            throw error;
        }
    }

    // public async performViberRegistration(deviceId: string, phoneNumber: string): Promise<TestResult> {
    //     const startTime = Date.now();
    //     let driver: any;
    //     try {
    //         this.logger.info(`Starting Viber registration test for device: ${deviceId}`);
    //         driver = this.activeDrivers.get(deviceId) || await this.initializeDriver(deviceId);
    //         await this.networkCapture.startCapture(deviceId);
    //         await this.executeRegistrationFlow(driver, phoneNumber);
    //         const apiResponses = await this.networkCapture.waitForApiResponses(deviceId, 30000);
    //         await this.saveApiResponses(deviceId, apiResponses);
    //         const duration = Date.now() - startTime;
    //         this.logger.info(`Viber registration completed for device: ${deviceId}`, {
    //             duration,
    //             apiResponsesCount: apiResponses.length
    //         });
    //         return {
    //             success: true,
    //             deviceId,
    //             testType: 'register',
    //             duration,
    //             data: {
    //                 phoneNumber,
    //                 apiResponses
    //             }
    //         };
    //     } catch (error) {
    //         const duration = Date.now() - startTime;
    //         this.logger.error(`Viber registration failed for device: ${deviceId}`, error);
    //         return {
    //             success: false,
    //             deviceId,
    //             testType: 'register',
    //             duration,
    //             error: error instanceof Error ? error.message : String(error)
    //         };
    //     } finally {
    //         await this.networkCapture.stopCapture(deviceId);
    //     }
    // }

    private async executeRegistrationFlow(driver: any, phoneNumber: string): Promise<void> {
        this.logger.info('Executing Viber registration flow');
        await driver.pause(3000);
        try {
        const startButton = await driver.$('~开始使用');
        if (await startButton.isDisplayed()) {
            await startButton.click();
            await driver.pause(2000);
        }
        } catch (error) {
        this.logger.warn('Start button not found, continuing...');
        }

        // 查找并点击"注册"按钮
        const registerButton = await driver.$('~注册');
        await registerButton.click();
        await driver.pause(2000);

        // 输入手机号码
        const phoneInput = await driver.$('~手机号码输入框');
        await phoneInput.setValue(phoneNumber);
        await driver.pause(1000);

        // 点击"下一步"或"继续"按钮
        const nextButton = await driver.$('~下一步');
        await nextButton.click();
        await driver.pause(5000); // 等待API调用

        // 处理验证码输入（如果需要）
        try {
        const codeInput = await driver.$('~验证码输入框');
        if (await codeInput.isDisplayed()) {
            // 这里可以添加验证码处理逻辑
            this.logger.info('Verification code input detected');
            await driver.pause(10000); // 等待手动输入或自动处理
        }
        } catch (error) {
        this.logger.info('No verification code input found');
        }

        // 等待注册完成
        await driver.pause(5000);
    }

    private async saveApiResponses(deviceId: string, apiResponses: ApiResponse[]): Promise<void> {
        const responsesDir = path.join(process.cwd(), 'api-responses');
        if (!fs.existsSync(responsesDir)) {
        fs.mkdirSync(responsesDir, { recursive: true });
        }

        const filename = `viber_registration_${deviceId}_${Date.now()}.json`;
        const filepath = path.join(responsesDir, filename);

        const data = {
        deviceId,
        timestamp: new Date().toISOString(),
        testType: 'viber_registration',
        apiResponses
        };

        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        this.logger.info(`API responses saved to: ${filepath}`);
    }

    public async closeDriver(deviceId: string): Promise<void> {
        try {
        const driver = this.activeDrivers.get(deviceId);
        if (driver) {
            await driver.deleteSession();
            this.activeDrivers.delete(deviceId);
            this.configManager.removeSession(deviceId);
            this.logger.info(`Driver closed for device: ${deviceId}`);
        }
        } catch (error) {
        this.logger.error(`Error closing driver for device: ${deviceId}`, error);
        }
    }

    public async closeAllDrivers(): Promise<void> {
        const deviceIds = Array.from(this.activeDrivers.keys());
        for (const deviceId of deviceIds) {
            await this.closeDriver(deviceId);
        }
    }

    public getDeviceConfig(deviceId: string): AppiumConfig | null {
        return this.configManager.getDeviceConfig(deviceId) || null;
    }

    public getActiveDevices(): string[] {
        return Array.from(this.activeDrivers.keys());
    }

    public isDeviceActive(deviceId: string): boolean {
        return this.activeDrivers.has(deviceId);
    }
} 