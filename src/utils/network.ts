import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from './logger';

const execAsync = promisify(exec);
const logger = new Logger('Network');

/**
 * Check network connectivity status
 * @param driver - WebDriver instance
 * @returns Promise<boolean> - true if network is available, false otherwise
 */
export async function checkNetworkStatus(driver: any): Promise<boolean> {
    try {
        const response = await axios.get('https://www.baidu.com', {
            timeout: 5000 
        });
        if (response.status === 200 || response.status === 204) {
            return true;
        }
        logger.warn('检测到网络未连接，正在打开设置...');
        return false;
    } catch (error) {
        logger.warn('检测到网络未连接，正在打开设置...');
        return false;
    }
}

/**
 * Handle network permission settings for Viber
 * @param driver - WebDriver instance
 * @returns Promise<boolean> - true if permission setup successful, false otherwise
 */
export async function handleNetworkPermission(driver: any): Promise<boolean> {
    try {
        const hasNetwork = await checkNetworkStatus(driver);
        if (!hasNetwork) {
            await driver.execute('mobile: launchApp', {
                bundleId: 'com.apple.Preferences'
            });
            await driver.pause(2000);
            try {
                const searchField = await driver.$('//XCUIElementTypeSearchField');
                if (await searchField.isExisting()) {
                    await searchField.click();
                    await searchField.setValue('Viber');
                    await driver.pause(2000);
                    await driver.execute('mobile: tap', {
                        x: 162,
                        y: 127
                    });
                    await driver.pause(5000);
                    await driver.execute('mobile: tap', {
                        x: 373,
                        y: 395
                    });
                    await driver.pause(2000);
                    await driver.execute('mobile: tap', {
                        x: 267,
                        y: 269
                    });
                    await driver.pause(2000);
                    await driver.execute('mobile: launchApp', {
                        bundleId: 'com.viber'
                    });
                    await driver.pause(2000);
                    return true;
                } else {
                    logger.warn('未找到搜索框，请手动操作');
                    return false;
                }
            } catch (error) {
                logger.warn('自动设置网络权限失败，请手动操作');
                return false;
            }
        }
        return true;
    } catch (error) {
        logger.error(`处理网络权限时出错: ${error}`);
        return false;
    }
} 

export interface NetworkInterface {
    name: string;
    ip: string;
    type: 'wifi' | 'ethernet' | 'usb' | 'unknown';
}

export interface DeviceConnection {
    deviceId: string;
    ip: string;
    port: number;
    status: 'connected' | 'disconnected' | 'unknown';
}

/**
 * 获取本机所有网络接口的IP地址
 */
export async function getLocalIPs(): Promise<NetworkInterface[]> {
    try {
        const { stdout } = await execAsync('ifconfig');
        const interfaces: NetworkInterface[] = [];
        const lines = stdout.split('\n');
        let currentInterface: NetworkInterface = {
            name: '',
            ip: '',
            type: 'unknown'
        };
        for (const line of lines) {
            const interfaceMatch = line.match(/^(\w+):/);
            if (interfaceMatch) {
                if (currentInterface.name && currentInterface.ip) {
                    interfaces.push(currentInterface);
                }
                currentInterface = {
                    name: interfaceMatch[1],
                    ip: '',
                    type: 'unknown'
                };
                if (currentInterface.name === 'en0') {
                    currentInterface.type = 'wifi';
                } else if (currentInterface.name.startsWith('en') && currentInterface.name !== 'en0') {
                    currentInterface.type = 'ethernet';
                } else if (currentInterface.name.includes('wlan')) {
                    currentInterface.type = 'wifi';
                } else if (currentInterface.name.includes('eth')) {
                    currentInterface.type = 'ethernet';
                } else if (currentInterface.name.includes('usb')) {
                    currentInterface.type = 'usb';
                }
            }
            const ipMatch = line.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
            if (ipMatch && currentInterface.name) {
                const ip = ipMatch[1];
                if (!ip.startsWith('127.') && !ip.startsWith('169.254.')) {
                    currentInterface.ip = ip;
                }
            }
        }
        if (currentInterface.name && currentInterface.ip) {
            interfaces.push(currentInterface);
        }
        logger.info('Found network interfaces:', interfaces);
        return interfaces;
    } catch (error) {
        logger.error('Failed to get local IPs:', error);
        return [];
    }
}

/**
 * 获取当前设备的IP地址（优先返回WiFi IP）
 */
export async function getCurrentDeviceIP(): Promise<string | null> {
    try {
        const interfaces = await getLocalIPs();
        const wifiInterface = interfaces.find(iface => iface.type === 'wifi');
        if (wifiInterface) {
            logger.info(`Using WiFi IP: ${wifiInterface.ip}`);
            return wifiInterface.ip;
        }
        const ethernetInterface = interfaces.find(iface => iface.type === 'ethernet');
        if (ethernetInterface) {
            logger.info(`Using Ethernet IP: ${ethernetInterface.ip}`);
            return ethernetInterface.ip;
        }
        const anyInterface = interfaces.find(iface => iface.ip);
        if (anyInterface) {
            logger.info(`Using interface IP: ${anyInterface.ip}`);
            return anyInterface.ip;
        }
        logger.warn('No valid IP address found');
        return null;
    } catch (error) {
        logger.error('Failed to get current device IP:', error);
        return null;
    }
}

/**
 * 获取iOS设备的IP地址
 */
export async function getIOSDeviceIP(): Promise<string | null> {
    try {
        logger.info('=== 获取iOS设备IP地址 ===');
        logger.info('1. 使用 arp 命令查找iOS设备...');
        try {
            const { stdout } = await execAsync('arp -a');
            const lines = stdout.split('\n');
            const iosDevices: string[] = [];
            for (const line of lines) {
                if (line.includes('192.168.0.') && 
                    (line.includes('apple') || 
                     line.includes('Apple') || 
                     line.includes('iPhone') || 
                     line.includes('iPad'))) {
                    const ipMatch = line.match(/\(([0-9.]+)\)/);
                    if (ipMatch) {
                        const ip = ipMatch[1];
                        if (ip !== '192.168.0.123') { 
                            iosDevices.push(ip);
                            logger.info(`发现可能的iOS设备: ${ip}`);
                        }
                    }
                }
            }
            if (iosDevices.length > 0) {
                logger.info(`✓ 找到 ${iosDevices.length} 个可能的iOS设备IP`);
                return iosDevices[0]; 
            }
        } catch (error) {
            logger.warn('arp 命令执行失败:', error);
        }
        logger.warn('⚠ 未找到iOS设备IP地址');
        return null;
    } catch (error) {
        logger.error('获取iOS设备IP失败:', error);
        return null;
    }
}

/**
 * 获取所有可用的IP地址（用于调试）
 */
export async function getAllAvailableIPs(): Promise<{
    scutil: string | null;
    ifconfig: string | null;
    interfaces: NetworkInterface[];
}> {
    try {
        let scutilIP: string | null = null;
        try {
            const { stdout: scutilOutput } = await execAsync('scutil --nwi');
            const lines = scutilOutput.split('\n');
            for (const line of lines) {
                const match = line.match(/^\s*(\w+)\s*:\s*flags\s*:\s*0x\d+\s*\([^)]*\)\s*address\s*:\s*(\d+\.\d+\.\d+\.\d+)/);
                if (match && match[1] === 'en0') {
                    scutilIP = match[2];
                    break;
                }
            }
        } catch (error) {
            logger.warn('scutil command failed:', error);
        }
        const ifconfigIP = await getCurrentDeviceIP();
        const interfaces = await getLocalIPs();
        return {
            scutil: scutilIP,
            ifconfig: ifconfigIP,
            interfaces
        };
    } catch (error) {
        logger.error('Failed to get all available IPs:', error);
        return {
            scutil: null,
            ifconfig: null,
            interfaces: []
        };
    }
}

/**
 * 扫描网络中的iOS设备
 */
export async function scanIOSDevices(): Promise<DeviceConnection[]> {
    try {
        const devices: DeviceConnection[] = [];
        const iosIP = await getIOSDeviceIP();
        if (iosIP) {
            devices.push({
                deviceId: `ios-${iosIP.replace(/\./g, '-')}`,
                ip: iosIP,
                port: 4723,
                status: 'connected'
            });
            logger.info(`Found iOS device at IP: ${iosIP}`);
        }
        logger.info(`Found ${devices.length} iOS devices`);
        return devices;
    } catch (error) {
        logger.error('Failed to scan iOS devices:', error);
        return [];
    }
}

/**
 * 自动发现并配置远程设备
 */
export async function autoDiscoverRemoteDevices(): Promise<DeviceConnection[]> {
    try {
        logger.info('Starting automatic device discovery...');
        const discoveredDevices = await scanIOSDevices();
        logger.info(`Auto-discovery completed. Found ${discoveredDevices.length} devices`);
        return discoveredDevices;
    } catch (error) {
        logger.error('Auto-discovery failed:', error);
        return [];
    }
}

/**
 * 扫描网络中的设备
 */
export async function scanNetworkForDevices(): Promise<Array<{ip: string, mac: string, isApple: boolean}>> {
    try {
        logger.info('=== 扫描网络中的设备 ===');
        const { stdout: ifconfigOutput } = await execAsync('ifconfig en0');
        const ipMatch = ifconfigOutput.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
        const macIP = ipMatch ? ipMatch[1] : null;
        logger.info(`Mac IP: ${macIP}`);
        const { stdout: arpOutput } = await execAsync('arp -a');
        const lines = arpOutput.split('\n');
        const devices: Array<{ip: string, mac: string, isApple: boolean}> = [];
        logger.info('网络中的设备:');
        for (const line of lines) {
            if (line.includes('192.168.0.')) {
                const ipMatch = line.match(/\(([0-9.]+)\)/);
                const macMatch = line.match(/at\s+([0-9a-f:]+)/i);
                if (ipMatch && macMatch) {
                    const ip = ipMatch[1];
                    const mac = macMatch[1];
                    if (ip !== macIP) {
                        const isApple = line.toLowerCase().includes('apple') || 
                                       line.toLowerCase().includes('iphone') || 
                                       line.toLowerCase().includes('ipad');
                        devices.push({ ip, mac, isApple });
                        const status = isApple ? '✓' : '?';
                        logger.info(`  ${status} ${ip} (${mac}) ${isApple ? '- Apple设备' : ''}`);
                    }
                }
            }
        }
        return devices;
    } catch (error) {
        logger.error('网络扫描失败:', error);
        return [];
    }
}

/**
 * 测试iOS设备连接
 */
export async function testIOSDeviceConnection(iosIP: string): Promise<boolean> {
    try {
        logger.info(`=== 测试iOS设备连接: ${iosIP} ===`);
        logger.info('1. 测试网络连通性...');
        const { stdout } = await execAsync(`ping -c 3 -W 1000 ${iosIP}`);
        if (stdout.includes('3 packets transmitted, 3 packets received')) {
            logger.info('✓ 网络连通性正常');
            logger.info('2. 测试Appium端口...');
            try {
                const response = await fetch(`http://${iosIP}:4723/status`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });
                if (response.ok) {
                    logger.info('✓ Appium服务器可访问');
                    return true;
                } else {
                    logger.warn('⚠ Appium服务器不可访问');
                }
            } catch (error) {
                logger.warn('⚠ Appium服务器不可访问 (连接失败)');
            }
            logger.info('3. 设置建议...');
            logger.info('要在iOS设备上运行Appium服务器，请执行以下步骤:');
            logger.info('  1. 在iOS设备上安装Appium');
            logger.info('  2. 启动Appium服务器: appium --host 0.0.0.0 --port 4723');
            logger.info('  3. 确保防火墙允许4723端口');
        } else {
            logger.error('✗ 网络连通性异常');
        }
        return false;
    } catch (error) {
        logger.error('iOS设备连接测试失败:', error);
        return false;
    }
}

 