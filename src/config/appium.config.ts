import { DeviceConfig, AppiumConfig } from '../types';
import dotenv from 'dotenv';

dotenv.config();

export class AppiumConfigManager {
	private static instance: AppiumConfigManager;
	private deviceConfigs: Map<string, DeviceConfig> = new Map();
	private appiumSessions: Map<string, any> = new Map();

	private constructor() {
		this.initializeDefaultConfigs();
	}

	public static getInstance(): AppiumConfigManager {
		if (!AppiumConfigManager.instance) {
			AppiumConfigManager.instance = new AppiumConfigManager();
		}
		return AppiumConfigManager.instance;
	}

	private initializeDefaultConfigs(): void {
		const defaultConfig: DeviceConfig = {
			udid: process.env.IOS_UDID || '',
			deviceName: process.env.IOS_DEVICE_NAME || 'iPhone',
			platformVersion: process.env.IOS_PLATFORM_VERSION || '15.0',
			bundleId: process.env.VIBER_BUNDLE_ID || 'com.viber.Viber',
			appPath: process.env.VIBER_APP_PATH || ''
		};
		this.deviceConfigs.set('default', defaultConfig);
	}

	public addDeviceConfig(deviceId: string, config: DeviceConfig): void {
		this.deviceConfigs.set(deviceId, config);
	}

	public getDeviceConfig(deviceId: string): DeviceConfig | undefined {
		return this.deviceConfigs.get(deviceId);
	}

	public getAllDeviceConfigs(): Map<string, DeviceConfig> {
		return new Map(this.deviceConfigs);
	}

	public createAppiumConfig(deviceId: string): AppiumConfig {
		const deviceConfig = this.deviceConfigs.get(deviceId);
		if (!deviceConfig) {
			throw new Error(`Device config not found for deviceId: ${deviceId}`);
		}
		const port = parseInt(process.env.APPIUM_PORT || '4723');
		return {
			host: process.env.APPIUM_HOST || 'localhost',
			port: port,
			deviceConfig,
			capabilities: this.getCapabilities(deviceConfig)
		};
	}

	private getCapabilities(deviceConfig: DeviceConfig): any {
		const capabilities: any = {
			platformName: 'iOS',
			'appium:platformVersion': deviceConfig.platformVersion,
			'appium:deviceName': deviceConfig.deviceName,
			'appium:automationName': 'XCUITest',
			'appium:bundleId': deviceConfig.bundleId,
			'appium:udid': deviceConfig.udid,
			'appium:noReset': true,
			'appium:autoAcceptAlerts': true,
			'appium:autoGrantPermissions': true,
			'appium:newCommandTimeout': 60,
			'appium:webDriverAgentUrl': `http://${process.env.APPIUM_HOST || 'localhost'}:${process.env.APPIUM_PORT || '4723'}`,
		};
		if (deviceConfig.appPath) {
			capabilities['appium:app'] = deviceConfig.appPath;
			delete capabilities['appium:bundleId'];
		}
		return capabilities;
	}

	public registerSession(deviceId: string, session: any): void {
		this.appiumSessions.set(deviceId, session);
	}

	public getSession(deviceId: string): any {
		return this.appiumSessions.get(deviceId);
	}

	public removeSession(deviceId: string): void {
		this.appiumSessions.delete(deviceId);
	}

<<<<<<< Updated upstream
	public getActiveSessions(): string[] {
		return Array.from(this.appiumSessions.keys());
	}

	public getAvailableDevices(): string[] {
		return Array.from(this.deviceConfigs.keys());
	}
=======
    public async detectAndConfigureDevices(): Promise<void> {
        try {
            this.deviceConfigs.clear();
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);
            const fs = require('fs');
            const jsonFile = '/tmp/devices_detailed.json';
            await execAsync(`xcrun devicectl list devices --json-output ${jsonFile}`);
            if (!fs.existsSync(jsonFile)) {
                console.error('无法获取设备 JSON 信息');
                return;
            }
            const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
            for (const device of jsonData.result.devices) {
                if (device.hardwareProperties.productType.includes('iPhone')) {
                    const deviceName = device.deviceProperties.name;
                    const udid = device.hardwareProperties.udid;
                    const identifier = device.identifier;
                    const xcodeOrgId = process.env.XCODE_ORG_ID || 'K8Z622FY3F';
                    const platformVersion = device.deviceProperties.osVersionNumber;
                    const bundleId = process.env.VIBER_BUNDLE_ID || 'com.viber';


        //             this.configManager.addDeviceConfig('00008101-00026C982160001E', {
        //     host: 'localhost',
        //     // host: '192.168.0.123',
        //     port: 4723,
        //     deviceConfig: {
        //         udid: '00008101-00026C982160001E',
        //         deviceName: 'lianxinxi',
        //         platformVersion: '18.3.2',
        //         bundleId: 'com.viber'
        //     },
        //     capabilities: {
        //         platformName: 'iOS',
        //         'appium:automationName': 'XCUITest',
        //         'appium:deviceName': 'lianxinxi',
        //         'appium:platformVersion': '18.3.2',
        //         'appium:udid': '00008101-00026C982160001E',
        //         'appium:bundleId': 'com.viber',
        //         'appium:xcodeOrgId': 'K8Z622FY3F',
        //         "appium:noReset": true,
        //         "appium:autoAcceptAlerts": true,
        //     }
        // });


                    const config: AppiumConfig = {
                        host: process.env.APPIUM_HOST || 'localhost',
                        port: parseInt(process.env.APPIUM_PORT || '4723'),
                        deviceConfig: {
                            udid: udid,
                            deviceName: deviceName,
                            platformVersion: platformVersion,
                            bundleId: bundleId
                        },
                        capabilities: {
                            platformName: 'iOS',
                            'appium:automationName': 'XCUITest',
                            'appium:deviceName': deviceName,
                            'appium:platformVersion': platformVersion,
                            'appium:udid': udid,
                            'appium:bundleId': bundleId,
                            "appium:xcodeOrgId": xcodeOrgId,
                            'appium:noReset': true,
                            'appium:autoAcceptAlerts': true,
                            'appium:autoGrantPermissions': true,
                            // 'appium:newCommandTimeout': 300,
                            // "appium:useNewWDA": true
                        }
                    };
                    this.addDeviceConfig(udid, config);
                    console.log(`Configured device: ${deviceName} (UDID: ${udid}, Identifier: ${identifier}) with iOS ${platformVersion}`);
                }
            }
            fs.unlinkSync(jsonFile);
        } catch (error) {
            console.error('Error detecting devices:', error);
        }
    }
>>>>>>> Stashed changes
} 