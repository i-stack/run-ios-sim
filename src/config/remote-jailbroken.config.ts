import { DeviceConfig, AppiumConfig } from '../types';
import dotenv from 'dotenv';

dotenv.config();

export interface RemoteJailbrokenConfig extends DeviceConfig {
    jailbroken: boolean;
    deviceIp: string;
    devicePort: number;
    webDriverAgentUrl: string;
    useXctest: boolean;
    useWda: boolean;
    wdaLocalPort: number;
    wdaBaseUrl: string;
    bootstrapPath?: string;
    agentPath?: string;
    connectionRetryCount: number;
    connectionRetryTimeout: number;
}

export class RemoteJailbrokenManager {
    private static instance: RemoteJailbrokenManager;
    private deviceConfigs: Map<string, RemoteJailbrokenConfig> = new Map();

    private constructor() {}

    public static getInstance(): RemoteJailbrokenManager {
        if (!RemoteJailbrokenManager.instance) {
            RemoteJailbrokenManager.instance = new RemoteJailbrokenManager();
        }
        return RemoteJailbrokenManager.instance;
    }

    public initializeDefaultRemoteConfig(): void {
        const defaultConfig: RemoteJailbrokenConfig = {
            udid: process.env.REMOTE_UDID || '2FCC54C4AB7082F8192FDA979EB8758A3BFEB0F6',
            deviceName: process.env.REMOTE_DEVICE_NAME || 'Remote Jailbroken iPhone',
            platformVersion: process.env.REMOTE_PLATFORM_VERSION || '15.8.2',
            bundleId: process.env.VIBER_BUNDLE_ID || 'com.viber.Viber',
            appPath: process.env.VIBER_APP_PATH || '',
            jailbroken: true,
            deviceIp: process.env.DEVICE_IP || '192.168.1.100',
            devicePort: parseInt(process.env.DEVICE_PORT || '8100'),
            webDriverAgentUrl: `http://${process.env.DEVICE_IP || '192.168.1.100'}:${process.env.WDA_LOCAL_PORT || '8100'}`,
            useXctest: false,
            useWda: true,
            wdaLocalPort: parseInt(process.env.WDA_LOCAL_PORT || '8100'),
            wdaBaseUrl: process.env.WDA_BASE_URL || `http://${process.env.DEVICE_IP || '192.168.1.100'}:8100`,
            bootstrapPath: process.env.BOOTSTRAP_PATH || '/usr/local/lib/node_modules/appium/node_modules/appium-webdriveragent',
            agentPath: process.env.AGENT_PATH || '/usr/local/lib/node_modules/appium/node_modules/appium-webdriveragent/WebDriverAgent.xcodeproj',
            connectionRetryCount: parseInt(process.env.CONNECTION_RETRY_COUNT || '3'),
            connectionRetryTimeout: parseInt(process.env.CONNECTION_RETRY_TIMEOUT || '120000')
        };

        this.addRemoteDevice('remote_jailbroken_device', defaultConfig);
    }

    public addRemoteDevice(deviceId: string, config: RemoteJailbrokenConfig): void {
        this.deviceConfigs.set(deviceId, config);
    }

    public getRemoteDevice(deviceId: string): RemoteJailbrokenConfig | undefined {
        return this.deviceConfigs.get(deviceId);
    }

    public createRemoteAppiumConfig(deviceId: string): AppiumConfig {
        const deviceConfig = this.deviceConfigs.get(deviceId);
        if (!deviceConfig) {
            throw new Error(`Remote device config not found for deviceId: ${deviceId}`);
        }

        return {
            host: process.env.APPIUM_HOST || 'localhost',
            port: parseInt(process.env.APPIUM_PORT || '4723'),
            deviceConfig,
            capabilities: this.getRemoteCapabilities(deviceConfig)
        };
    }

    private getRemoteCapabilities(deviceConfig: RemoteJailbrokenConfig): any {
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
            
            // 远程连接特定配置
            'appium:webDriverAgentUrl': deviceConfig.webDriverAgentUrl,
            'appium:useXctest': deviceConfig.useXctest,
            'appium:useWda': deviceConfig.useWda,
            'appium:wdaLocalPort': deviceConfig.wdaLocalPort,
            'appium:wdaBaseUrl': deviceConfig.wdaBaseUrl,
            
            // 越狱设备特定配置
            'appium:jailbroken': deviceConfig.jailbroken,
            'appium:bootstrapPath': deviceConfig.bootstrapPath,
            'appium:agentPath': deviceConfig.agentPath,
            
            // 连接重试配置
            'appium:connectionRetryCount': deviceConfig.connectionRetryCount,
            'appium:connectionRetryTimeout': deviceConfig.connectionRetryTimeout
        };

        if (deviceConfig.appPath) {
            capabilities['appium:app'] = deviceConfig.appPath;
        }

        return capabilities;
    }

    public getAllRemoteDevices(): RemoteJailbrokenConfig[] {
        return Array.from(this.deviceConfigs.values());
    }

    public getAvailableRemoteDeviceIds(): string[] {
        return Array.from(this.deviceConfigs.keys());
    }
} 