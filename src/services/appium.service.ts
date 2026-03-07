import { remote, RemoteOptions } from 'webdriverio';
import { AppiumConfigManager } from '../config/appium.config';
import { Logger } from '../utils/logger';
<<<<<<< Updated upstream
import { TestResult, ApiResponse } from '../types';
import { NetworkCaptureService } from './network.capture.service';
=======
import { ApiResponse } from '../types';
import { getCurrentDeviceIP, getAllAvailableIPs, getIOSDeviceIP, autoDiscoverRemoteDevices, DeviceConnection, scanNetworkForDevices, testIOSDeviceConnection } from '../utils/network';
>>>>>>> Stashed changes
import path from 'path';
import fs from 'fs';

export class AppiumService {
<<<<<<< Updated upstream
	private configManager: AppiumConfigManager;
	private logger: Logger;
	private networkCapture: NetworkCaptureService;
	private activeDrivers: Map<string, any> = new Map();

	constructor() {
		this.configManager = AppiumConfigManager.getInstance();
		this.logger = new Logger('AppiumService');
		this.networkCapture = new NetworkCaptureService();
	}

	public async initializeDriver(deviceId: string): Promise<any> {
		try {
			const config = this.configManager.createAppiumConfig(deviceId);
			const options: RemoteOptions = {
				hostname: config.host,
				port: config.port,
				path: '/wd/hub',
				capabilities: config.capabilities,
				logLevel: 'info'
			};
			this.logger.info(`Initializing Appium driver for device: ${deviceId}`, config);
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

	public async performViberRegistration(deviceId: string, phoneNumber: string): Promise<TestResult> {
		const startTime = Date.now();
		let driver: any;
		try {
			this.logger.info(`Starting Viber registration test for device: ${deviceId}`);
			driver = this.activeDrivers.get(deviceId) || await this.initializeDriver(deviceId);
			await this.networkCapture.startCapture(deviceId);
			await this.executeRegistrationFlow(driver, phoneNumber);
			const apiResponses = await this.networkCapture.waitForApiResponses(deviceId, 30000);
			await this.saveApiResponses(deviceId, apiResponses);
			const duration = Date.now() - startTime;
			this.logger.info(`Viber registration completed for device: ${deviceId}`, {
				duration,
				apiResponsesCount: apiResponses.length
			});
			return {
				success: true,
				deviceId,
				testType: 'register',
				duration,
				data: {
				phoneNumber,
				apiResponses
				}
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			this.logger.error(`Viber registration failed for device: ${deviceId}`, error);
			return {
				success: false,
				deviceId,
				testType: 'register',
				duration,
				error: error instanceof Error ? error.message : String(error)
			};
		} finally {
			await this.networkCapture.stopCapture(deviceId);
		}
	}
=======
    private logger: Logger;
    private configManager: AppiumConfigManager;
    private activeDrivers: Map<string, WebdriverIO.Browser> = new Map();

    constructor() {
        this.configManager = AppiumConfigManager.getInstance();
        this.logger = new Logger('AppiumService');
        this.initializeDeviceConfigs();
    }

    private async initializeDeviceConfigs(): Promise<void> {
        try {
            this.logger.info('Auto-detecting and configuring devices...');
            await this.configManager.detectAndConfigureDevices();
            const availableDevices = this.configManager.getAvailableDevices();
            this.logger.info(`Found ${availableDevices.length} available devices: ${availableDevices.join(', ')}`);
        } catch (error) {
            this.logger.error('Failed to auto-detect devices:', error);
        }
    }

    public async initializeDriver(deviceId: string, useRemoteConnection: boolean = false): Promise<WebdriverIO.Browser> {
        try {
            if (this.configManager.getAvailableDevices().length === 0) {
                this.logger.info('No device configurations found, auto-detecting devices...');
                await this.configManager.detectAndConfigureDevices();
            }
            const config = this.configManager.getDeviceConfig(deviceId);
            if (!config) {
                throw new Error(`Device config not found for deviceId: ${deviceId}. Available devices: ${this.configManager.getAvailableDevices().join(', ')}`);
            }
            let options;
            if (useRemoteConnection) {
                options = {
                    hostname: config.host,
                    port: config.port,
                    path: '/',
                    capabilities: {
                        ...config.capabilities,
                        'appium:webDriverAgentUrl': `http://${config.host}:${config.port}`,
                        'appium:autoAcceptAlerts': true,
                        'appium:autoGrantPermissions': true,
                        'appium:noReset': true,
                        'appium:fullReset': false,
                        'appium:newCommandTimeout': 300,
                        'appium:launchTimeout': 180000,
                        'appium:shouldTerminateApp': true,
                        'appium:useNewWDA': true,
                        'appium:usePrebuiltWDA': false,
                        'appium:derivedDataPath': '/tmp/WebDriverAgent',
                        'appium:showXcodeLog': true,
                        'appium:showIOSLog': true
                    },
                    connectionRetryCount: 15,
                    connectionRetryTimeout: 120000,
                    waitforTimeout: 60000,
                    waitforInterval: 2000
                };
                this.logger.info(`Initializing remote Appium driver for device: ${deviceId}`, options);
            } else {
                options = {
                    hostname: config.host,
                    port: config.port,
                    path: '/',
                    capabilities: config.capabilities,
                };
                this.logger.info(`Initializing local Appium driver for device: ${deviceId}`, config);
            }
            try {
                const response = await fetch(`http://${config.host}:${config.port}/status`);
                if (!response.ok) {
                    throw new Error(`Appium server is not responding at ${config.host}:${config.port}`);
                }
            } catch (serverError) {
                this.logger.error(`Appium server is not running at ${config.host}:${config.port}. Please start Appium server first.`);
                throw new Error(`Appium server is not accessible. Please ensure Appium is running at ${config.host}:${config.port}`);
            }
            let driver;
            try {
                driver = await remote(options);
            } catch (sessionError: any) {
                this.logger.error(`Session creation failed for device: ${deviceId}`, sessionError);
                throw sessionError;
            }
            this.activeDrivers.set(deviceId, driver);
            this.configManager.registerSession(deviceId, driver);
            this.logger.info(`Appium driver initialized successfully for device: ${deviceId}`);
            return driver;
        } catch (error) {
            this.logger.error(`Failed to initialize Appium driver for device: ${deviceId}`, error);
            throw error;
        }
    }
>>>>>>> Stashed changes

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
		const registerButton = await driver.$('~注册');
		await registerButton.click();
		await driver.pause(2000);

		const phoneInput = await driver.$('~手机号码输入框');
		await phoneInput.setValue(phoneNumber);
		await driver.pause(1000);

		const nextButton = await driver.$('~下一步');
		await nextButton.click();
		await driver.pause(5000); 

		try {
			const codeInput = await driver.$('~验证码输入框');
			if (await codeInput.isDisplayed()) {
				this.logger.info('Verification code input detected');
				await driver.pause(10000); 
			}
		} catch (error) {
			this.logger.info('No verification code input found');
		}
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

	public getActiveDevices(): string[] {
		return Array.from(this.activeDrivers.keys());
	}

	public isDeviceActive(deviceId: string): boolean {
		return this.activeDrivers.has(deviceId);
	}

	public getConfigManager(): AppiumConfigManager {
		return this.configManager;
	}
} 