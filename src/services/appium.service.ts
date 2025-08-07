import { remote } from 'webdriverio';
import { AppiumConfigManager } from '../config/appium.config';
import { Logger } from '../utils/logger';
import { ApiResponse } from '../types';
import { NetworkCaptureService } from './network.capture.service';
import { getCurrentDeviceIP, getAllAvailableIPs, getIOSDeviceIP, autoDiscoverRemoteDevices, DeviceConnection, scanNetworkForDevices, testIOSDeviceConnection } from '../utils/network';
import path from 'path';
import { fileManager } from '../utils/file.manager';
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

        this.configManager.addDeviceConfig('00008101-00026C982160001E', {
            host: 'localhost',
            // host: '192.168.0.123',
            port: 4723,
            deviceConfig: {
                udid: '00008101-00026C982160001E',
                deviceName: 'lianxinxi',
                platformVersion: '18.3.2',
                bundleId: 'com.viber'
            },
            capabilities: {
                platformName: 'iOS',
                'appium:automationName': 'XCUITest',
                'appium:deviceName': 'lianxinxi',
                'appium:platformVersion': '18.3.2',
                'appium:udid': '00008101-00026C982160001E',
                'appium:bundleId': 'com.viber',
                'appium:xcodeOrgId': 'K8Z622FY3F',
                "appium:noReset": true,
                "appium:autoAcceptAlerts": true,
            }
        });
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
                        'appium:newCommandTimeout': 180,
                        'appium:launchTimeout': 60000,
                        'appium:shouldTerminateApp': true
                    },
                    connectionRetryCount: 10,
                    connectionRetryTimeout: 60000,
                    waitforTimeout: 30000,
                    waitforInterval: 1000
                };
                this.logger.info(`Initializing remote Appium driver for device: ${deviceId}`, options);
            } else {
                options = {
                    hostname: config.host,
                    port: config.port,
                    path: '/',
                    capabilities: config.capabilities,
                    connectionRetryCount: 5,
                    connectionRetryTimeout: 30000
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

    /**
     * 配置远程设备连接
     * @param deviceId 设备ID
     * @param remoteHost 远程主机地址
     * @param remotePort 远程端口
     * @param deviceConfig 设备配置
     */
    public configureRemoteDevice(
        deviceId: string, 
        remoteHost: string, 
        remotePort: number = 4723,
        deviceConfig?: any
    ): void {
        const config: AppiumConfig = {
            host: remoteHost,
            port: remotePort,
            deviceConfig: deviceConfig || {
                udid: deviceId,
                deviceName: 'Remote Device',
                platformVersion: '17.0',
                bundleId: 'com.viber'
            },
            capabilities: {
                platformName: 'iOS',
                'appium:automationName': 'XCUITest',
                'appium:deviceName': deviceConfig?.deviceName || 'Remote Device',
                'appium:platformVersion': deviceConfig?.platformVersion || '17.0',
                'appium:bundleId': deviceConfig?.bundleId || 'com.viber',
                'appium:udid': deviceId,
                'appium:noReset': true,
                'appium:autoAcceptAlerts': true,
                'appium:autoGrantPermissions': true,
                'appium:newCommandTimeout': 180,
                'appium:launchTimeout': 60000,
                'appium:shouldTerminateApp': true,
                'appium:webDriverAgentUrl': `http://${remoteHost}:${remotePort}`,
                'appium:fullReset': false
            }
        };
        
        this.configManager.addDeviceConfig(deviceId, config);
        this.logger.info(`Remote device configured: ${deviceId} at ${remoteHost}:${remotePort}`);
    }

    /**
     * 获取当前设备的IP地址
     */
    public async getCurrentDeviceIP(): Promise<string | null> {
        return await getCurrentDeviceIP();
    }

    /**
     * 获取所有可用的IP地址（用于调试）
     */
    public async getAllAvailableIPs(): Promise<{
        scutil: string | null;
        ifconfig: string | null;
        interfaces: any[];
    }> {
        return await getAllAvailableIPs();
    }

    /**
     * 获取iOS设备的IP地址
     */
    public async getIOSDeviceIP(): Promise<string | null> {
        return await getIOSDeviceIP();
    }

    /**
     * 扫描网络中的设备
     */
    public async scanNetworkForDevices(): Promise<Array<{ip: string, mac: string, isApple: boolean}>> {
        return await scanNetworkForDevices();
    }

    /**
     * 测试iOS设备连接
     */
    public async testIOSDeviceConnection(iosIP: string): Promise<boolean> {
        return await testIOSDeviceConnection(iosIP);
    }

    /**
     * 自动发现网络中的远程设备
     */
    public async autoDiscoverDevices(): Promise<DeviceConnection[]> {
        return await autoDiscoverRemoteDevices();
    }

    /**
     * 获取当前设备的名称
     */
    public async getCurrentDeviceName(deviceId?: string): Promise<string | null> {
        try {
            // 如果没有指定设备ID，使用第一个可用设备
            if (!deviceId) {
                const availableDevices = this.configManager.getAvailableDevices();
                if (availableDevices.length === 0) {
                    this.logger.warn('No available devices found');
                    return null;
                }
                deviceId = availableDevices[0];
            }

            const config = this.configManager.getDeviceConfig(deviceId);
            if (!config) {
                this.logger.warn(`Device config not found for deviceId: ${deviceId}`);
                return null;
            }

            return config.deviceConfig.deviceName;
        } catch (error) {
            this.logger.error('Failed to get current device name:', error);
            return null;
        }
    }

    /**
     * 获取当前设备的平台版本
     */
    public async getCurrentDevicePlatformVersion(deviceId?: string): Promise<string | null> {
        try {
            // 如果没有指定设备ID，使用第一个可用设备
            if (!deviceId) {
                const availableDevices = this.configManager.getAvailableDevices();
                if (availableDevices.length === 0) {
                    this.logger.warn('No available devices found');
                    return null;
                }
                deviceId = availableDevices[0];
            }

            const config = this.configManager.getDeviceConfig(deviceId);
            if (!config) {
                this.logger.warn(`Device config not found for deviceId: ${deviceId}`);
                return null;
            }

            return config.deviceConfig.platformVersion;
        } catch (error) {
            this.logger.error('Failed to get current device platform version:', error);
            return null;
        }
    }

    /**
     * 获取当前设备的完整信息（名称、版本、IP等）
     */
    public async getCurrentDeviceInfo(deviceId?: string): Promise<{
        deviceName: string | null;
        platformVersion: string | null;
        deviceIP: string | null;
        deviceId: string | null;
    }> {
        try {
            // 如果没有指定设备ID，使用第一个可用设备
            if (!deviceId) {
                const availableDevices = this.configManager.getAvailableDevices();
                if (availableDevices.length === 0) {
                    this.logger.warn('No available devices found');
                    return {
                        deviceName: null,
                        platformVersion: null,
                        deviceIP: null,
                        deviceId: null
                    };
                }
                deviceId = availableDevices[0];
            }

            const deviceName = await this.getCurrentDeviceName(deviceId);
            const platformVersion = await this.getCurrentDevicePlatformVersion(deviceId);
            const deviceIP = await this.getCurrentDeviceIP();

            return {
                deviceName,
                platformVersion,
                deviceIP,
                deviceId
            };
        } catch (error) {
            this.logger.error('Failed to get current device info:', error);
            return {
                deviceName: null,
                platformVersion: null,
                deviceIP: null,
                deviceId: null
            };
        }
    }

    /**
     * 自动配置远程设备（使用发现的设备）
     */
    public async autoConfigureRemoteDevices(): Promise<void> {
        try {
            this.logger.info('Starting automatic remote device configuration...');
            
            // 获取当前设备IP
            const currentIP = await this.getCurrentDeviceIP();
            if (currentIP) {
                this.logger.info(`Current device IP: ${currentIP}`);
            }
            
            // 自动发现远程设备
            const discoveredDevices = await this.autoDiscoverDevices();
            
            if (discoveredDevices.length === 0) {
                this.logger.warn('No remote devices discovered');
                return;
            }
            
            // 自动配置发现的设备
            for (const device of discoveredDevices) {
                if (device.status === 'connected') {
                    // 获取当前设备的名称和版本信息
                    const currentDeviceName = await this.getCurrentDeviceName();
                    const currentPlatformVersion = await this.getCurrentDevicePlatformVersion();
                    
                    this.configureRemoteDevice(
                        device.deviceId,
                        device.ip,
                        device.port,
                        {
                            udid: device.deviceId,
                            deviceName: currentDeviceName || `Auto-discovered Device (${device.ip})`,
                            platformVersion: currentPlatformVersion || '17.0',
                            bundleId: 'com.viber'
                        }
                    );
                    this.logger.info(`Auto-configured remote device: ${device.deviceId} at ${device.ip}:${device.port}`);
                }
            }
            
            this.logger.info(`Auto-configuration completed. Configured ${discoveredDevices.filter(d => d.status === 'connected').length} devices`);
        } catch (error) {
            this.logger.error('Auto-configuration failed:', error);
        }
    }

    /**
     * 更新设备配置中的主机地址
     */
    public async updateDeviceHost(deviceId: string): Promise<void> {
        try {
            const currentIP = await this.getCurrentDeviceIP();
            const config = this.configManager.getDeviceConfig(deviceId);
            if (config && currentIP) {
                config.host = currentIP;
                this.logger.info(`Updated device ${deviceId} host to: ${currentIP}`);
            }
        } catch (error) {
            this.logger.error('Failed to update device host:', error);
        }
    }

    /**
     * 使用自动发现的设备进行远程连接
     */
    public async initializeDriverWithAutoDiscovery(deviceId?: string): Promise<WebdriverIO.Browser> {
        try {
            // 如果没有指定设备ID，尝试自动发现
            if (!deviceId) {
                this.logger.info('No device ID specified, attempting auto-discovery...');
                await this.autoConfigureRemoteDevices();
                
                const availableDevices = this.configManager.getAvailableDevices();
                if (availableDevices.length === 0) {
                    throw new Error('No devices available after auto-discovery');
                }
                
                deviceId = availableDevices[0];
                this.logger.info(`Using auto-discovered device: ${deviceId}`);
            }
            
            // 使用远程连接初始化驱动
            return await this.initializeDriver(deviceId, true);
        } catch (error) {
            this.logger.error('Failed to initialize driver with auto-discovery:', error);
            throw error;
        }
    }
} 