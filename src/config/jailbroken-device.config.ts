import { DeviceConfig, AppiumConfig } from '../types';
import dotenv from 'dotenv';

dotenv.config();

export interface JailbrokenDeviceConfig extends DeviceConfig {
    // 越狱设备特有配置
    jailbroken: boolean;
    webDriverAgentUrl?: string;
    useXctest: boolean;
    useWda: boolean;
    wdaLocalPort?: number;
    wdaBaseUrl?: string;
    bootstrapPath?: string;
    agentPath?: string;
}

export class JailbrokenDeviceManager {
    private static instance: JailbrokenDeviceManager;
    private devices: Map<string, JailbrokenDeviceConfig> = new Map();

    private constructor() {
        this.initializeDefaultJailbrokenConfig();
    }

    public static getInstance(): JailbrokenDeviceManager {
        if (!JailbrokenDeviceManager.instance) {
            JailbrokenDeviceManager.instance = new JailbrokenDeviceManager();
        }
        return JailbrokenDeviceManager.instance;
    }

    private initializeDefaultJailbrokenConfig(): void {
        const defaultConfig: JailbrokenDeviceConfig = {
            udid: process.env.JAILBROKEN_UDID || '',
            deviceName: process.env.JAILBROKEN_DEVICE_NAME || 'Jailbroken iPhone',
            platformVersion: process.env.JAILBROKEN_PLATFORM_VERSION || '14.0',
            bundleId: process.env.VIBER_BUNDLE_ID || 'com.viber.Viber',
            appPath: process.env.VIBER_APP_PATH || '',
            jailbroken: true,
            useXctest: false, // 越狱设备通常不使用 XCTest
            useWda: true, // 使用 WebDriverAgent
            wdaLocalPort: parseInt(process.env.WDA_LOCAL_PORT || '8100'),
            wdaBaseUrl: process.env.WDA_BASE_URL || 'http://localhost:8100',
            bootstrapPath: process.env.BOOTSTRAP_PATH || '/usr/local/lib/node_modules/appium/node_modules/appium-webdriveragent',
            agentPath: process.env.AGENT_PATH || '/usr/local/lib/node_modules/appium/node_modules/appium-webdriveragent/WebDriverAgent.xcodeproj'
        };
        this.devices.set('jailbroken_default', defaultConfig);
    }

    public addJailbrokenDevice(deviceId: string, config: JailbrokenDeviceConfig): void {
        this.devices.set(deviceId, config);
    }

    public getJailbrokenDevice(deviceId: string): JailbrokenDeviceConfig | undefined {
        return this.devices.get(deviceId);
    }

    public createJailbrokenAppiumConfig(deviceId: string): AppiumConfig {
        const deviceConfig = this.devices.get(deviceId);
        if (!deviceConfig) {
            throw new Error(`Jailbroken device config not found for deviceId: ${deviceId}`);
        }

        return {
            host: process.env.APPIUM_HOST || 'localhost',
            port: parseInt(process.env.APPIUM_PORT || '4723'),
            deviceConfig,
            capabilities: this.getJailbrokenCapabilities(deviceConfig)
        };
    }

    private getJailbrokenCapabilities(deviceConfig: JailbrokenDeviceConfig): any {
        const capabilities: any = {
            platformName: 'iOS',
            'appium:platformVersion': deviceConfig.platformVersion,
            'appium:deviceName': deviceConfig.deviceName,
            'appium:automationName': deviceConfig.useXctest ? 'XCUITest' : 'UIAutomator',
            'appium:bundleId': deviceConfig.bundleId,
            'appium:udid': deviceConfig.udid,
            'appium:noReset': true,
            'appium:autoAcceptAlerts': true,
            'appium:autoGrantPermissions': true,
            'appium:newCommandTimeout': 60,
            
            // 越狱设备特有配置
            'appium:useXctest': deviceConfig.useXctest,
            'appium:useWda': deviceConfig.useWda,
            'appium:wdaLocalPort': deviceConfig.wdaLocalPort,
            'appium:bootstrapPath': deviceConfig.bootstrapPath,
            'appium:agentPath': deviceConfig.agentPath,
            
            // 越狱设备权限配置
            'appium:shouldTerminateApp': true,
            'appium:forceAppLaunch': true,
            'appium:showXcodeLog': true,
            'appium:showIOSLog': true,
            
            // 网络配置（如果需要远程连接）
            'appium:webDriverAgentUrl': deviceConfig.webDriverAgentUrl || `http://${process.env.DEVICE_IP || 'localhost'}:${deviceConfig.wdaLocalPort}`,
        };

        if (deviceConfig.appPath) {
            capabilities['appium:app'] = deviceConfig.appPath;
            delete capabilities['appium:bundleId'];
        }

        return capabilities;
    }

    public getAllJailbrokenDevices(): Map<string, JailbrokenDeviceConfig> {
        return new Map(this.devices);
    }

    public getAvailableJailbrokenDeviceIds(): string[] {
        return Array.from(this.devices.keys());
    }
} 