import { DeviceConfig, AppiumConfig } from '../types';

export class AppiumConfigManager {
    private static instance: AppiumConfigManager;
    private appiumSessions: Map<string, any> = new Map();
    private deviceConfigs: Map<string, AppiumConfig> = new Map();

    private constructor() {}

    public static getInstance(): AppiumConfigManager {
        if (!AppiumConfigManager.instance) {
            AppiumConfigManager.instance = new AppiumConfigManager();
        }
        return AppiumConfigManager.instance;
    }

    public addDeviceConfig(deviceId: string, config: AppiumConfig): void {
        this.deviceConfigs.set(deviceId, config);
    }

    public getDeviceConfig(deviceId: string): AppiumConfig | null {
        return this.deviceConfigs.get(deviceId) || null;
    }

    public getAllDeviceConfigs(): Map<string, AppiumConfig> {
        return new Map(this.deviceConfigs);
    }

    // private getCapabilities(deviceConfig: DeviceConfig): any {
    //     const capabilities: any = {
    //         platformName: 'iOS',
    //         'appium:platformVersion': deviceConfig.platformVersion,
    //         'appium:deviceName': deviceConfig.deviceName,
    //         'appium:automationName': 'XCUITest',
    //         'appium:bundleId': deviceConfig.bundleId,
    //         'appium:udid': deviceConfig.udid,
    //         'appium:noReset': true,
    //         'appium:autoAcceptAlerts': true,
    //         'appium:autoGrantPermissions': true,
    //         'appium:newCommandTimeout': 60,
    //         'appium:webDriverAgentUrl': `http://${process.env.APPIUM_HOST || 'localhost'}:${process.env.APPIUM_PORT || '4723'}`,
    //     };
    //     if (deviceConfig.appPath) {
    //         capabilities['appium:app'] = deviceConfig.appPath;
    //         delete capabilities['appium:bundleId'];
    //     }
    //     return capabilities;
    // }

    public registerSession(deviceId: string, session: any): void {
        this.appiumSessions.set(deviceId, session);
    }

    public getSession(deviceId: string): any {
        return this.appiumSessions.get(deviceId);
    }

    public removeSession(deviceId: string): void {
        this.appiumSessions.delete(deviceId);
    }

    public getActiveSessions(): string[] {
        return Array.from(this.appiumSessions.keys());
    }

    public getAvailableDevices(): string[] {
        return Array.from(this.deviceConfigs.keys());
    }

    public async detectAndConfigureDevices(): Promise<void> {
        try {
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);
            
            // Get list of available iOS devices
            const { stdout } = await execAsync('xcrun devicectl list devices');
            const lines = stdout.split('\n');
            
            for (const line of lines) {
                if (line.includes('available') && line.includes('iPhone')) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 3) {
                        const deviceName = parts[0];
                        const deviceId = parts[2];
                        
                        // Create default config for this device
                        const config: AppiumConfig = {
                            host: process.env.APPIUM_HOST || 'localhost',
                            port: parseInt(process.env.APPIUM_PORT || '4723'),
                            deviceConfig: {
                                udid: deviceId,
                                deviceName: deviceName,
                                platformVersion: '15.0', // Default version
                                bundleId: process.env.VIBER_BUNDLE_ID || 'com.viber'
                            },
                            capabilities: {
                                platformName: 'iOS',
                                'appium:automationName': 'XCUITest',
                                'appium:deviceName': deviceName,
                                'appium:platformVersion': '15.0',
                                'appium:bundleId': process.env.VIBER_BUNDLE_ID || 'com.viber',
                                'appium:udid': deviceId,
                                'appium:noReset': true,
                                'appium:autoAcceptAlerts': true,
                                'appium:autoGrantPermissions': true,
                                'appium:newCommandTimeout': 120,
                                'appium:webDriverAgentUrl': `http://${process.env.APPIUM_HOST || 'localhost'}:${process.env.APPIUM_PORT || '4723'}`
                            }
                        };
                        
                        this.addDeviceConfig(deviceId, config);
                        console.log(`Configured device: ${deviceName} (${deviceId})`);
                    }
                }
            }
        } catch (error) {
            console.error('Error detecting devices:', error);
        }
    }
} 