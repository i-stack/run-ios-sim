/**
 * NetworkCaptureService - iOS设备网络捕获服务
 * 
 * 这个服务提供了完整的iOS设备网络流量捕获功能，包括：
 * 1. mitmproxy 代理服务器管理
 * 2. iOS设备代理配置
 * 3. mitmproxy 证书安装
 * 4. 网络流量监控和响应捕获
 * 
 * 使用示例：
 * 
 * ```typescript
 * import { NetworkCaptureService } from './network.capture.service';
 * 
 * const networkCapture = new NetworkCaptureService();
 * 
 * // 方法1: 使用完整的设置流程（推荐）
 * try {
 *     await networkCapture.setupCompleteNetworkCapture('device-id');
 *     console.log('网络捕获设置完成！');
 * } catch (error) {
 *     console.error('设置失败:', error);
 * }
 * 
 * // 方法2: 分步骤设置
 * try {
 *     // 步骤1: 启动 mitmproxy
 *     await networkCapture.startCapture('device-id');
 *     
 *     // 步骤2: 设置设备代理
 *     await networkCapture.setupProxyForDevice('device-id');
 *     
 *     // 步骤3: 安装证书
 *     await networkCapture.installMitmproxyCertificate('device-id');
 *     
 *     console.log('网络捕获设置完成！');
 * } catch (error) {
 *     console.error('设置失败:', error);
 * }
 * 
 * // 监控新的API响应
 * const unwatch = networkCapture.watchForNewResponses('device-id', (response) => {
 *     console.log('新的API响应:', response);
 * });
 * 
 * // 读取捕获的响应
 * const responses = networkCapture.readCapturedResponses('device-id');
 * console.log('捕获的响应数量:', responses.length);
 * 
 * // 清理设置
 * await networkCapture.cleanupNetworkCapture('device-id');
 * ```
 */

import { Logger } from '../utils/logger';
import { ApiResponse } from '../types';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
<<<<<<< Updated upstream

export class NetworkCaptureService {
	private logger: Logger;
	private captureProcesses: Map<string, ChildProcess> = new Map();
	private capturedResponses: Map<string, ApiResponse[]> = new Map();

	constructor() {
		this.logger = new Logger('NetworkCaptureService');
	}
=======
import { CaptureScriptService } from '../scripts/capture.service';
import { AppiumService } from './appium.service';

export class NetworkCaptureService {
    private logger: Logger;
    private captureProcesses: Map<string, ChildProcess> = new Map();
    private capturedResponses: Map<string, ApiResponse[]> = new Map();
    private captureServices: Map<string, CaptureScriptService> = new Map();
    private appiumService: AppiumService;

    constructor() {
        this.logger = new Logger('NetworkCaptureService');
        this.appiumService = new AppiumService();
    }
>>>>>>> Stashed changes

	public async startCapture(deviceId: string): Promise<void> {
		try {
			this.logger.info(`Starting network capture for device: ${deviceId}`);
			this.capturedResponses.set(deviceId, []);
			// 注意：这需要在iOS设备上安装并信任mitmproxy证书
			const mitmProcess = spawn('mitmdump', [
				'--mode', 'transparent',
				'--listen-port', '8888',
				'--set', 'confdir=./mitmproxy',
				'--script', path.join(__dirname, '../scripts/capture_script.py')
			]);

			mitmProcess.stdout?.on('data', (data) => {
				this.logger.debug(`Mitmproxy output: ${data}`);
			});

			mitmProcess.stderr?.on('data', (data) => {
				this.logger.error(`Mitmproxy error: ${data}`);
			});

<<<<<<< Updated upstream
			this.captureProcesses.set(deviceId, mitmProcess);
			await this.waitForMitmproxyReady();
			this.logger.info(`Network capture started for device: ${deviceId}`);
		} catch (error) {
			this.logger.error(`Failed to start network capture for device: ${deviceId}`, error);
			throw error;
		}
	}

	public async stopCapture(deviceId: string): Promise<void> {
		try {
			const process = this.captureProcesses.get(deviceId);
			if (process) {
				process.kill('SIGTERM');
				this.captureProcesses.delete(deviceId);
				this.logger.info(`Network capture stopped for device: ${deviceId}`);
			}
		} catch (error) {
			this.logger.error(`Error stopping network capture for device: ${deviceId}`, error);
		}
	}

	public async waitForApiResponses(deviceId: string, timeout: number = 30000): Promise<ApiResponse[]> {
		return new Promise((resolve) => {
			const startTime = Date.now();
			const checkInterval = setInterval(() => {
				const responses = this.capturedResponses.get(deviceId) || [];
				const viberResponses = responses.filter(response => 
				response.url.includes('viber.com') || 
				response.url.includes('api.viber.com')
				);

				if (viberResponses.length > 0 || (Date.now() - startTime) > timeout) {
				clearInterval(checkInterval);
				resolve(viberResponses);
				}
			}, 1000);
		});
	}

	public addApiResponse(deviceId: string, response: ApiResponse): void {
		const responses = this.capturedResponses.get(deviceId) || [];
		responses.push(response);
		this.capturedResponses.set(deviceId, responses);
		this.logger.info(`Captured API response for device: ${deviceId}`, {
			url: response.url,
			method: response.method,
			statusCode: response.statusCode
		});
	}

	private async waitForMitmproxyReady(): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, 3000); 
		});
	}

	public getCapturedResponses(deviceId: string): ApiResponse[] {
		return this.capturedResponses.get(deviceId) || [];
	}

	public clearCapturedResponses(deviceId: string): void {
		this.capturedResponses.delete(deviceId);
	}

	public async setupProxyForDevice(deviceId: string): Promise<void> {
		try {
			// 设置iOS设备的代理配置
			// 这需要通过Appium执行iOS命令来配置代理
			this.logger.info(`Setting up proxy for device: ${deviceId}`);
			// 这里需要根据具体的iOS设备管理工具来实现
			// 例如使用libimobiledevice或通过Appium执行命令
		} catch (error) {
			this.logger.error(`Failed to setup proxy for device: ${deviceId}`, error);
			throw error;
		}
	}

	public async installMitmproxyCertificate(deviceId: string): Promise<void> {
		try {
			this.logger.info(`Installing mitmproxy certificate for device: ${deviceId}`);
			// 生成mitmproxy证书
			const certDir = path.join(process.cwd(), 'mitmproxy');
			if (!fs.existsSync(certDir)) {
				fs.mkdirSync(certDir, { recursive: true });
			}
			// 这里需要实现证书安装逻辑
			// 可以通过Appium执行iOS命令来安装证书
		} catch (error) {
			this.logger.error(`Failed to install mitmproxy certificate for device: ${deviceId}`, error);
			throw error;
		}
	}
=======
    public async setupProxyForDevice(deviceId: string): Promise<void> {
        try {
            this.logger.info(`Setting up proxy for device: ${deviceId}`);
            
            // 获取本机IP地址
            const localIP = await this.getLocalIPAddress();
            const proxyPort = 8888;
            
            this.logger.info(`📋 代理设置信息：`);
            this.logger.info(`   服务器: ${localIP}`);
            this.logger.info(`   端口: ${proxyPort}`);
            
            // 尝试通过Appium自动配置代理
            try {
                const driver = await this.appiumService.initializeDriver(deviceId);
                try {
                    await this.configureProxyViaAppium(driver, localIP, proxyPort);
                } finally {
                    await this.appiumService.closeDriver(deviceId);
                }
            } catch (error) {
                this.logger.warn('自动代理配置失败，提供手动指导:', error);
                this.provideManualProxySetupGuide(localIP, proxyPort);
            }
            
        } catch (error) {
            this.logger.error(`Failed to setup proxy for device: ${deviceId}`, error);
            throw error;
        }
    }

    /**
     * 通过Appium配置设备代理
     */
    private async configureProxyViaAppium(driver: WebdriverIO.Browser, server: string, port: number): Promise<void> {
        try {
            this.logger.info('Attempting to configure proxy via Appium...');
            
            // 激活设置应用
            await driver.activateApp('com.apple.Preferences');
            await driver.pause(2000);
            
            // 导航到Wi-Fi设置
            await this.navigateToWiFiSettings(driver);
            
            // 尝试配置代理设置
            await this.configureProxySettings(driver, server, port);
            
            this.logger.info('✅ Proxy configuration completed via Appium');
            
        } catch (error) {
            this.logger.warn('Appium proxy configuration failed:', error);
            throw error;
        }
    }

    /**
     * 提供手动代理设置指导
     */
    private provideManualProxySetupGuide(server: string, port: number): void {
        this.logger.info('📋 手动代理设置步骤：');
        this.logger.info('   1. 打开 设置 > Wi-Fi');
        this.logger.info('   2. 点击当前网络旁边的 (i) 图标');
        this.logger.info('   3. 滚动到底部，点击"配置代理"');
        this.logger.info('   4. 选择"手动"');
        this.logger.info(`   5. 服务器: ${server}`);
        this.logger.info(`   6. 端口: ${port}`);
        this.logger.info('   7. 点击"保存"');
        this.logger.info('');
        this.logger.info('📋 验证代理设置：');
        this.logger.info('   1. 在设备浏览器中访问: http://mitm.it');
        this.logger.info('   2. 如果显示证书下载页面，说明代理设置成功');
        this.logger.info('   3. 如果无法访问，请检查网络连接和代理设置');
    }

    public async installMitmproxyCertificate(deviceId: string, existingDriver?: WebdriverIO.Browser): Promise<void> {
        try {
            this.logger.info(`Checking mitmproxy certificate installation for device: ${deviceId}`);
            if (existingDriver) {
                this.logger.info('Using existing driver to check certificate status');
                const isAlreadyInstalled = await this.verifyCertificateInstallationWithDriver(existingDriver, deviceId);
                if (isAlreadyInstalled) {
                    this.logger.info(`Mitmproxy certificate is already installed on device: ${deviceId}`);
                    return;
                }
                this.logger.info(`Certificate not found, proceeding with installation for device: ${deviceId}`);
            } 
            const certDir = path.join(process.cwd(), 'mitmproxy');
            if (!fs.existsSync(certDir)) {
                fs.mkdirSync(certDir, { recursive: true });
            }
            const certPath = path.join(certDir, 'mitmproxy-ca-cert.pem');
            const certKeyPath = path.join(certDir, 'mitmproxy-ca-cert.key');
            if (!fs.existsSync(certPath)) {
                this.logger.info('Generating mitmproxy certificate...');
                await this.generateMitmproxyCertificate(certDir);
            }
            let driver: WebdriverIO.Browser;
            let shouldCloseDriver = false;
            if (existingDriver) {
                this.logger.info('Using existing driver instance');
                driver = existingDriver;
            } else {
                this.logger.info('Initializing new driver instance');
                driver = await this.appiumService.initializeDriver(deviceId);
                shouldCloseDriver = true;
                const isAlreadyInstalled = await this.verifyCertificateInstallationWithDriver(driver, deviceId);
                if (isAlreadyInstalled) {
                    this.logger.info(`Mitmproxy certificate is already installed on device: ${deviceId}`);
                    return;
                }
                this.logger.info(`Certificate not found, proceeding with installation for device: ${deviceId}`);
            }
            
            try {
                await this.installCertificateViaWebInterface(driver);

                // 等待一段时间让用户完成安装
                this.logger.info('⏳ 等待证书安装完成...');
                await driver.pause(10000); // 等待10秒
                
                // 验证证书安装
                const isInstalled = await this.verifyCertificateInstallationWithDriver(driver, deviceId);
                if (isInstalled) {
                    this.logger.info(`✅ Mitmproxy certificate installed successfully for device: ${deviceId}`);
                } else {
                    this.logger.warn(`⚠️  Certificate installation may not be complete for device: ${deviceId}`);
                    this.logger.info('📋 请手动检查: 设置 > 通用 > 关于本机 > 证书信任设置');
                    this.provideManualInstallationGuide();
                }
            } finally {
                if (shouldCloseDriver) {
                    await this.appiumService.closeDriver(deviceId);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to install mitmproxy certificate for device: ${deviceId}`, error);
            throw error;
        }
    }

    /**
     * 生成mitmproxy证书
     */
    private async generateMitmproxyCertificate(certDir: string): Promise<void> {
        try {
            const mitmProcess = spawn('mitmdump', [
                '--set', `confdir=${certDir}`,
                '--set', 'ssl_insecure=true'
            ]);
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    mitmProcess.kill('SIGTERM');
                    resolve();
                }, 3000);
                mitmProcess.on('error', (error) => {
                    this.logger.error('Failed to generate mitmproxy certificate:', error);
                    reject(error);
                });
            });
        } catch (error) {
            this.logger.error('Error generating mitmproxy certificate:', error);
            throw error;
        }
    }

    /**
     * 将证书文件传输到iOS设备
     */
    private async transferCertificateToDevice(driver: WebdriverIO.Browser, certPath: string, deviceId: string): Promise<void> {
        try {
            this.logger.info(`Transferring certificate to device: ${deviceId}`);
            // 跳过文件传输，直接使用设置应用安装证书
            // 因为 mobile: pushFile 命令不被支持
            this.logger.info('Skipping file transfer, will use Settings app for certificate installation');
        } catch (error) {
            this.logger.error('Failed to transfer certificate to device:', error);
            throw error;
        }
    }

    /**
     * 在iOS设备上安装证书
     */
    private async installCertificateOnDevice(driver: WebdriverIO.Browser, deviceId: string): Promise<void> {
        try {
            this.logger.info(`Installing certificate on device: ${deviceId}`);
            // 直接使用设置应用安装证书，因为 mobile: shell 不被支持
            await this.installCertificateViaSettings(driver);
        } catch (error) {
            this.logger.error('Failed to install certificate on device:', error);
            throw error;
        }
    }

    /**
     * 通过iOS设置应用安装证书
     */
    private async installCertificateViaSettings(driver: WebdriverIO.Browser): Promise<void> {
        try {
            this.logger.info('Installing certificate via iOS Settings app...');
            
            // 首先尝试生成证书文件
            await this.generateAndTransferCertificate(driver);
            
            // 尝试打开设置应用并导航到证书信任设置
            await driver.activateApp('com.apple.Preferences');
            await driver.pause(3000);
            
            try {
                // 尝试多种导航方法
                await this.navigateToCertificateSettings(driver);
            } catch (navigationError) {
                this.logger.warn('自动导航失败，提供手动指导:', navigationError);
                this.provideManualInstallationGuide();
            }
            
            this.logger.info('Certificate installation guidance provided');
        } catch (error) {
            this.logger.error('Failed to provide certificate installation guidance:', error);
            throw error;
        }
    }

    /**
     * 生成并传输证书文件
     */
    private async generateAndTransferCertificate(driver: WebdriverIO.Browser): Promise<void> {
        try {
            this.logger.info('Generating and transferring certificate...');
            
            // 生成证书文件
            const certDir = path.join(process.cwd(), 'mitmproxy');
            if (!fs.existsSync(certDir)) {
                fs.mkdirSync(certDir, { recursive: true });
            }
            
            const certPath = path.join(certDir, 'mitmproxy-ca-cert.pem');
            if (!fs.existsSync(certPath)) {
                this.logger.info('Generating mitmproxy certificate...');
                await this.generateMitmproxyCertificate(certDir);
            }
            
            // 尝试使用 mitmproxy Web 界面安装证书
            await this.installCertificateViaWebInterface(driver);
            
        } catch (error) {
            this.logger.warn('Certificate generation/transfer failed:', error);
            this.provideManualInstallationGuide();
        }
    }

    /**
     * 通过 mitmproxy Web 界面安装证书
     */
    private async installCertificateViaWebInterface(driver: WebdriverIO.Browser): Promise<void> {
        try {
            this.logger.info('Installing certificate via mitmproxy Web interface...');
            
            // 首先检查 mitmproxy 是否正在运行
            await this.checkMitmproxyStatus();
            
            // 设置设备代理
            await this.setupDeviceProxy(driver);
            
            // 启动 mitmproxy 并获取证书安装地址
            const proxyPort = 8888; // 使用我们配置的端口
            const certInstallUrl = `http://mitm.it`;
            
            this.logger.info(`📋 证书安装地址: ${certInstallUrl}`);
            this.logger.info('📋 请按照以下步骤安装证书：');
            this.logger.info('   1. 确保设备已连接到代理服务器');
            this.logger.info('   2. 在设备浏览器中访问: http://mitm.it');
            this.logger.info('   3. 选择 iOS 设备');
            this.logger.info('   4. 点击下载并安装证书');
            this.logger.info('   5. 在设置中启用证书信任');
            
            // 尝试在设备上打开证书安装页面
            try {
                await driver.activateApp('com.apple.mobilesafari');
                await driver.pause(2000);
                
                // 导航到证书安装页面
                await driver.url(certInstallUrl);
                await driver.pause(3000);
                
                this.logger.info('✅ 已在 Safari 中打开证书安装页面');
                this.logger.info('📋 请按照页面提示安装证书');
                
                // 检查页面内容，如果显示错误信息，提供诊断
                await this.diagnoseMitmproxyConnection(driver);
                
            } catch (safariError) {
                this.logger.warn('Safari 导航失败:', safariError);
                this.logger.info('请手动在设备浏览器中访问: http://mitm.it');
                await this.provideMitmproxyTroubleshooting();
            }
            
        } catch (error) {
            this.logger.error('Web interface installation failed:', error);
            this.provideManualInstallationGuide();
        }
    }

    /**
     * 尝试传输证书文件（备用方法）
     */
    private async tryTransferCertificate(driver: WebdriverIO.Browser, certPath: string): Promise<void> {
        try {
            const certContent = fs.readFileSync(certPath, 'utf8');
            
            // 方法1：尝试使用 pushFile
            try {
                await driver.executeScript('mobile: pushFile', [
                    '/tmp/mitmproxy-ca-cert.pem',
                    Buffer.from(certContent).toString('base64')
                ]);
                this.logger.info('✅ Certificate transferred using pushFile');
                return;
            } catch (error1) {
                this.logger.warn('pushFile failed:', error1);
            }
            
            // 方法2：尝试使用对象格式
            try {
                await driver.executeScript('mobile: pushFile', {
                    path: '/tmp/mitmproxy-ca-cert.pem',
                    data: Buffer.from(certContent).toString('base64')
                } as any);
                this.logger.info('✅ Certificate transferred using object format');
                return;
            } catch (error2) {
                this.logger.warn('Object format failed:', error2);
            }
            
            // 如果都失败了，提供手动指导
            this.logger.warn('❌ All transfer methods failed, providing manual guide');
            this.provideManualInstallationGuide();
            
        } catch (error) {
            this.logger.error('Certificate transfer failed:', error);
            this.provideManualInstallationGuide();
        }
    }

    /**
     * 导航到证书设置
     */
    private async navigateToCertificateSettings(driver: WebdriverIO.Browser): Promise<void> {
        try {
            // 方法1：尝试直接点击通用
            try {
                const generalCell = await driver.$('~通用');
                if (await generalCell.isDisplayed()) {
                    await generalCell.click();
                    await driver.pause(2000);
                }
            } catch (error) {
                this.logger.warn('Direct general click failed:', error);
            }
            
            // 方法2：尝试滚动查找
            try {
                await driver.executeScript('mobile: scroll', ['down']);
                await driver.pause(1000);
            } catch (error) {
                this.logger.warn('Scroll failed:', error);
            }
            
            // 尝试点击关于本机
            try {
                const aboutCell = await driver.$('~关于本机');
                if (await aboutCell.isDisplayed()) {
                    await aboutCell.click();
                    await driver.pause(2000);
                }
            } catch (error) {
                this.logger.warn('About click failed:', error);
            }
            
            // 再次滚动
            try {
                await driver.executeScript('mobile: scroll', ['down']);
                await driver.pause(1000);
            } catch (error) {
                this.logger.warn('Second scroll failed:', error);
            }
            
            // 尝试点击证书信任设置
            try {
                const certificateCell = await driver.$('~证书信任设置');
                if (await certificateCell.isDisplayed()) {
                    await certificateCell.click();
                    await driver.pause(2000);
                    this.logger.info('✅ Successfully navigated to certificate trust settings');
                    return;
                }
            } catch (error) {
                this.logger.warn('Certificate settings click failed:', error);
            }
            
            // 如果所有方法都失败，抛出异常
            throw new Error('Failed to navigate to certificate settings');
            
        } catch (error) {
            this.logger.error('Navigation to certificate settings failed:', error);
            throw error;
        }
    }

    /**
     * 检查 mitmproxy 状态
     */
    private async checkMitmproxyStatus(): Promise<void> {
        try {
            this.logger.info('Checking mitmproxy status...');
            
            // 检查端口是否被占用
            const { exec } = require('child_process');
            const proxyPort = 8888;
            
            return new Promise((resolve, reject) => {
                exec(`lsof -i :${proxyPort}`, (error: any, stdout: string) => {
                    if (error || !stdout.trim()) {
                        this.logger.warn(`⚠️  mitmproxy 可能没有在端口 ${proxyPort} 上运行`);
                        this.logger.info('📋 请确保 mitmproxy 已启动：');
                        this.logger.info('   1. 检查 mitmproxy 进程是否运行');
                        this.logger.info('   2. 确认端口 8888 没有被其他程序占用');
                        this.logger.info('   3. 尝试重启 mitmproxy 服务');
                    } else {
                        this.logger.info(`✅ mitmproxy 正在端口 ${proxyPort} 上运行`);
                    }
                    resolve();
                });
            });
        } catch (error) {
            this.logger.warn('Failed to check mitmproxy status:', error);
        }
    }

    /**
     * 设置设备代理
     */
    private async setupDeviceProxy(driver: WebdriverIO.Browser): Promise<void> {
        try {
            this.logger.info('Setting up device proxy...');
            
            // 获取本机IP地址
            const localIP = await this.getLocalIPAddress();
            const proxyPort = 8888;
            
            this.logger.info(`📋 代理设置信息：`);
            this.logger.info(`   服务器: ${localIP}`);
            this.logger.info(`   端口: ${proxyPort}`);
            
            // 尝试通过设置应用配置代理
            try {
                await driver.activateApp('com.apple.Preferences');
                await driver.pause(2000);
                
                // 导航到Wi-Fi设置
                await this.navigateToWiFiSettings(driver);
                
                // 配置代理设置
                await this.configureProxySettings(driver, localIP, proxyPort);
                
            } catch (error) {
                this.logger.warn('自动代理设置失败:', error);
                this.logger.info('📋 请手动设置代理：');
                this.logger.info(`   1. 打开 设置 > Wi-Fi`);
                this.logger.info(`   2. 点击当前网络旁边的 (i) 图标`);
                this.logger.info(`   3. 滚动到底部，点击"配置代理"`);
                this.logger.info(`   4. 选择"手动"`);
                this.logger.info(`   5. 服务器: ${localIP}`);
                this.logger.info(`   6. 端口: ${proxyPort}`);
            }
            
        } catch (error) {
            this.logger.error('Failed to setup device proxy:', error);
        }
    }

    /**
     * 获取本机IP地址
     */
    private async getLocalIPAddress(): Promise<string> {
        try {
            const { exec } = require('child_process');
            return new Promise((resolve, reject) => {
                exec('ifconfig | grep "inet " | grep -v 127.0.0.1 | awk \'{print $2}\' | head -1', (error: any, stdout: string) => {
                    if (error) {
                        this.logger.warn('Failed to get local IP, using default:', error);
                        resolve('192.168.1.100'); // 默认IP
                    } else {
                        const ip = stdout.trim();
                        this.logger.info(`Local IP address: ${ip}`);
                        resolve(ip);
                    }
                });
            });
        } catch (error) {
            this.logger.warn('Failed to get local IP, using default');
            return '192.168.1.100'; // 默认IP
        }
    }

    /**
     * 导航到Wi-Fi设置
     */
    private async navigateToWiFiSettings(driver: WebdriverIO.Browser): Promise<void> {
        try {
            // 尝试点击Wi-Fi
            const wifiCell = await driver.$('~Wi-Fi');
            if (await wifiCell.isDisplayed()) {
                await wifiCell.click();
                await driver.pause(2000);
            }
        } catch (error) {
            this.logger.warn('Wi-Fi navigation failed:', error);
        }
    }

    /**
     * 配置代理设置
     */
    private async configureProxySettings(driver: WebdriverIO.Browser, server: string, port: number): Promise<void> {
        try {
            this.logger.info('Attempting to configure proxy settings via iOS Settings app...');
            
            // 尝试点击当前Wi-Fi网络的(i)图标
            try {
                const infoButton = await driver.$('~信息');
                if (await infoButton.isDisplayed()) {
                    await infoButton.click();
                    await driver.pause(2000);
                    this.logger.info('✅ Successfully clicked on Wi-Fi network info');
                }
            } catch (error) {
                this.logger.warn('Failed to click on Wi-Fi network info:', error);
            }
            
            // 尝试滚动到底部找到代理设置
            try {
                await driver.executeScript('mobile: scroll', ['down']);
                await driver.pause(1000);
                await driver.executeScript('mobile: scroll', ['down']);
                await driver.pause(1000);
            } catch (error) {
                this.logger.warn('Failed to scroll in Wi-Fi settings:', error);
            }
            
            // 尝试点击配置代理
            try {
                const configureProxyButton = await driver.$('~配置代理');
                if (await configureProxyButton.isDisplayed()) {
                    await configureProxyButton.click();
                    await driver.pause(2000);
                    this.logger.info('✅ Successfully clicked on Configure Proxy');
                }
            } catch (error) {
                this.logger.warn('Failed to click Configure Proxy:', error);
            }
            
            // 尝试选择手动模式
            try {
                const manualButton = await driver.$('~手动');
                if (await manualButton.isDisplayed()) {
                    await manualButton.click();
                    await driver.pause(2000);
                    this.logger.info('✅ Successfully selected Manual proxy mode');
                }
            } catch (error) {
                this.logger.warn('Failed to select Manual proxy mode:', error);
            }
            
            // 尝试输入服务器地址
            try {
                const serverField = await driver.$('~服务器');
                if (await serverField.isDisplayed()) {
                    await serverField.click();
                    await driver.pause(1000);
                    await serverField.setValue(server);
                    await driver.pause(1000);
                    this.logger.info(`✅ Successfully entered server: ${server}`);
                }
            } catch (error) {
                this.logger.warn('Failed to enter server address:', error);
            }
            
            // 尝试输入端口
            try {
                const portField = await driver.$('~端口');
                if (await portField.isDisplayed()) {
                    await portField.click();
                    await driver.pause(1000);
                    await portField.setValue(port.toString());
                    await driver.pause(1000);
                    this.logger.info(`✅ Successfully entered port: ${port}`);
                }
            } catch (error) {
                this.logger.warn('Failed to enter port:', error);
            }
            
            // 尝试点击保存
            try {
                const saveButton = await driver.$('~保存');
                if (await saveButton.isDisplayed()) {
                    await saveButton.click();
                    await driver.pause(2000);
                    this.logger.info('✅ Successfully saved proxy settings');
                }
            } catch (error) {
                this.logger.warn('Failed to save proxy settings:', error);
            }
            
            // 验证代理设置是否成功
            await this.verifyProxyConfiguration(driver, server, port);
            
        } catch (error) {
            this.logger.warn('Proxy configuration failed:', error);
            this.logger.info('📋 请手动配置代理设置：');
            this.logger.info(`   服务器: ${server}`);
            this.logger.info(`   端口: ${port}`);
        }
    }

    /**
     * 验证代理配置是否成功
     */
    private async verifyProxyConfiguration(driver: WebdriverIO.Browser, server: string, port: number): Promise<void> {
        try {
            this.logger.info('Verifying proxy configuration...');
            
            // 尝试访问 mitm.it 来验证代理设置
            await driver.activateApp('com.apple.mobilesafari');
            await driver.pause(2000);
            
            try {
                await driver.url('http://mitm.it');
                await driver.pause(3000);
                
                const pageSource = await driver.getPageSource();
                if (pageSource.includes('mitmproxy') || pageSource.includes('certificate')) {
                    this.logger.info('✅ Proxy configuration verified successfully');
                    this.logger.info('📋 代理设置成功，可以继续安装证书');
                } else {
                    this.logger.warn('⚠️  Proxy configuration may not be working correctly');
                    this.logger.info('📋 请检查代理设置或手动配置');
                }
            } catch (error) {
                this.logger.warn('Failed to verify proxy via Safari:', error);
            }
            
        } catch (error) {
            this.logger.warn('Failed to verify proxy configuration:', error);
        }
    }

    /**
     * 诊断 mitmproxy 连接问题
     */
    private async diagnoseMitmproxyConnection(driver: WebdriverIO.Browser): Promise<void> {
        try {
            // 等待页面加载
            await driver.pause(2000);
            
            // 检查页面是否显示错误信息
            const pageSource = await driver.getPageSource();
            if (pageSource.includes('traffic is not passing through mitmproxy')) {
                this.logger.warn('⚠️  检测到 mitmproxy 连接问题');
                await this.provideMitmproxyTroubleshooting();
            } else {
                this.logger.info('✅ mitmproxy 连接正常');
            }
        } catch (error) {
            this.logger.warn('Failed to diagnose mitmproxy connection:', error);
        }
    }

    /**
     * 提供 mitmproxy 故障排除指导
     */
    private async provideMitmproxyTroubleshooting(): Promise<void> {
        this.logger.info('🔧 mitmproxy 故障排除指南：');
        this.logger.info('');
        this.logger.info('📋 问题诊断：');
        this.logger.info('   1. 检查 mitmproxy 是否正在运行');
        this.logger.info('   2. 确认设备代理设置是否正确');
        this.logger.info('   3. 验证网络连接');
        this.logger.info('');
        this.logger.info('📋 解决步骤：');
        this.logger.info('   1. 重启 mitmproxy 服务');
        this.logger.info('   2. 重新配置设备代理');
        this.logger.info('   3. 尝试使用文件传输方式安装证书');
        this.logger.info('');
        this.logger.info('📋 备用方案：');
        this.logger.info('   1. 使用文件传输安装证书');
        this.logger.info('   2. 手动下载证书文件');
        this.logger.info('   3. 通过邮件或 AirDrop 传输证书');
    }

    /**
     * 提供手动安装指导
     */
    private provideManualInstallationGuide(): void {
        this.logger.info('📋 手动安装证书步骤（推荐方法）：');
        this.logger.info('   方法1 - Web 界面安装：');
        this.logger.info('   1. 确保设备已连接到代理服务器（端口 8888）');
        this.logger.info('   2. 在设备浏览器中访问: http://mitm.it');
        this.logger.info('   3. 选择 iOS 设备');
        this.logger.info('   4. 点击下载并安装证书');
        this.logger.info('   5. 在设置中启用证书信任');
        this.logger.info('');
        this.logger.info('   方法2 - 文件传输安装：');
        this.logger.info('   1. 在Mac上运行: open mitmproxy/');
        this.logger.info('   2. 找到 mitmproxy-ca-cert.pem 文件');
        this.logger.info('   3. 将文件发送到iOS设备（通过邮件、AirDrop等）');
        this.logger.info('   4. 在iOS设备上点击证书文件进行安装');
        this.logger.info('   5. 手动打开 设置 > 通用 > 关于本机 > 证书信任设置');
        this.logger.info('   6. 找到 mitmproxy 证书并启用信任');
    }

    /**
     * 配置证书信任设置
     */
    private async configureCertificateTrust(driver: WebdriverIO.Browser, deviceId: string): Promise<void> {
        try {
            this.logger.info(`Configuring certificate trust for device: ${deviceId}`);
            // 证书信任配置通过设置应用完成，因为 mobile: shell 不被支持
            // 在 installCertificateViaSettings 方法中已经处理了证书信任设置
            this.logger.info('Certificate trust configuration handled via Settings app');
        } catch (error) {
            this.logger.warn('Failed to configure certificate trust (this may be normal):', error);
        }
    }

    /**
     * 验证证书安装是否成功（使用已初始化的驱动）
     */
    private async verifyCertificateInstallationWithDriver(driver: WebdriverIO.Browser, deviceId: string): Promise<boolean> {
        try {
            this.logger.info(`Verifying certificate installation for device: ${deviceId}`);
            // 直接使用设置应用验证证书，因为 mobile: shell 不被支持
            return await this.verifyCertificateViaSettings(driver);
        } catch (error) {
            this.logger.error('Failed to verify certificate installation:', error);
            return false;
        }
    }

    /**
     * 验证证书安装是否成功（独立方法，会初始化驱动）
     */
    public async verifyCertificateInstallation(deviceId: string): Promise<boolean> {
        try {
            this.logger.info(`Verifying certificate installation for device: ${deviceId}`);
            const driver = await this.appiumService.initializeDriver(deviceId);
            try {
                return await this.verifyCertificateInstallationWithDriver(driver, deviceId);
            } finally {
                await this.appiumService.closeDriver(deviceId);
            }
        } catch (error) {
            this.logger.error('Failed to verify certificate installation:', error);
            return false;
        }
    }

    /**
     * 通过设置应用验证证书安装
     */
    private async verifyCertificateViaSettings(driver: WebdriverIO.Browser): Promise<boolean> {
        try {
            this.logger.info('Verifying certificate via iOS Settings app...');
            await driver.activateApp('com.apple.Preferences');
            await driver.pause(2000);
            
            try {
                const generalCell = await driver.$('~通用');
                if (await generalCell.isDisplayed()) {
                    await generalCell.click();
                    await driver.pause(1000);
                }
                await driver.executeScript('mobile: scroll', ['down']);
                await driver.pause(1000);
                const aboutCell = await driver.$('~关于本机');
                if (await aboutCell.isDisplayed()) {
                    await aboutCell.click();
                    await driver.pause(1000);
                }
                await driver.executeScript('mobile: scroll', ['down']);
                await driver.pause(1000);
                const certificateCell = await driver.$('~证书信任设置');
                if (await certificateCell.isDisplayed()) {
                    await certificateCell.click();
                    await driver.pause(1000);
                    const mitmproxyCert = await driver.$('~mitmproxy');
                    if (await mitmproxyCert.isDisplayed()) {
                        this.logger.info('✅ Certificate found in Settings app');
                        return true;
                    } else {
                        this.logger.info('❌ Certificate not found in Settings app');
                        this.logger.info('📋 请手动安装证书：');
                        this.logger.info('   1. 在Mac上运行: open ~/.mitmproxy/');
                        this.logger.info('   2. 找到 mitmproxy-ca-cert.pem 文件');
                        this.logger.info('   3. 将文件发送到iOS设备');
                        this.logger.info('   4. 在iOS设备上点击证书文件进行安装');
                        return false;
                    }
                } else {
                    this.logger.warn('Certificate Trust Settings not found');
                    this.logger.info('请手动导航到 设置 > 通用 > 关于本机 > 证书信任设置');
                    return false;
                }
            } catch (navigationError) {
                this.logger.warn('导航到证书设置失败:', navigationError);
                this.logger.info('请手动打开 设置 > 通用 > 关于本机 > 证书信任设置');
                return false;
            }
        } catch (error) {
            this.logger.error('Failed to verify certificate via Settings app:', error);
            return false;
        }
    }

    /**
     * 监控新的API响应
     */
    public watchForNewResponses(deviceId: string, callback: (response: ApiResponse) => void): (() => void) | null {
        const captureService = this.captureServices.get(deviceId);
        if (captureService) {
            return captureService.watchForNewResponses(callback);
        }
        return null;
    }

    /**
     * 读取捕获的响应
     */
    public readCapturedResponses(deviceId: string): ApiResponse[] {
        const captureService = this.captureServices.get(deviceId);
        if (captureService) {
            return captureService.readCapturedResponses();
        }
        return [];
    }

    /**
     * 完整的网络捕获设置流程
     */
    public async setupCompleteNetworkCapture(deviceId: string): Promise<void> {
        try {
            this.logger.info(`🚀 开始完整的网络捕获设置流程 for device: ${deviceId}`);
            
            // 步骤1: 启动 mitmproxy 捕获
            this.logger.info('📋 步骤 1: 启动 mitmproxy 网络捕获');
            await this.startCapture(deviceId);
            
            // 步骤2: 设置设备代理
            this.logger.info('📋 步骤 2: 设置设备代理');
            await this.setupProxyForDevice(deviceId);
            
            // 步骤3: 安装 mitmproxy 证书
            this.logger.info('📋 步骤 3: 安装 mitmproxy 证书');
            await this.installMitmproxyCertificate(deviceId);
            
            // 步骤4: 验证设置
            this.logger.info('📋 步骤 4: 验证网络捕获设置');
            await this.verifyNetworkCaptureSetup(deviceId);
            
            this.logger.info('✅ 网络捕获设置完成！');
            this.logger.info('📋 现在可以开始监控网络流量了');
            
        } catch (error) {
            this.logger.error(`❌ 网络捕获设置失败 for device: ${deviceId}`, error);
            throw error;
        }
    }

    /**
     * 验证网络捕获设置
     */
    private async verifyNetworkCaptureSetup(deviceId: string): Promise<void> {
        try {
            this.logger.info('Verifying network capture setup...');
            
            // 验证 mitmproxy 是否正在运行
            await this.checkMitmproxyStatus();
            
            // 验证证书是否已安装
            const isCertInstalled = await this.verifyCertificateInstallation(deviceId);
            if (!isCertInstalled) {
                this.logger.warn('⚠️  mitmproxy 证书可能未正确安装');
                this.logger.info('📋 请手动安装证书：');
                this.logger.info('   1. 在设备浏览器中访问: http://mitm.it');
                this.logger.info('   2. 下载并安装证书');
                this.logger.info('   3. 在设置中启用证书信任');
            } else {
                this.logger.info('✅ mitmproxy 证书已正确安装');
            }
            
            // 验证代理设置
            await this.verifyProxySettings(deviceId);
            
        } catch (error) {
            this.logger.warn('Failed to verify network capture setup:', error);
        }
    }

    /**
     * 验证代理设置
     */
    private async verifyProxySettings(deviceId: string): Promise<void> {
        try {
            this.logger.info('Verifying proxy settings...');
            
            const driver = await this.appiumService.initializeDriver(deviceId);
            try {
                // 尝试访问 mitm.it 来验证代理设置
                await driver.activateApp('com.apple.mobilesafari');
                await driver.pause(2000);
                
                await driver.url('http://mitm.it');
                await driver.pause(3000);
                
                const pageSource = await driver.getPageSource();
                if (pageSource.includes('mitmproxy') || pageSource.includes('certificate')) {
                    this.logger.info('✅ 代理设置验证成功');
                } else {
                    this.logger.warn('⚠️  代理设置可能有问题');
                    this.logger.info('📋 请检查设备代理设置');
                }
            } finally {
                await this.appiumService.closeDriver(deviceId);
            }
            
        } catch (error) {
            this.logger.warn('Failed to verify proxy settings:', error);
        }
    }

    /**
     * 清理网络捕获设置
     */
    public async cleanupNetworkCapture(deviceId: string): Promise<void> {
        try {
            this.logger.info(`🧹 清理网络捕获设置 for device: ${deviceId}`);
            
            // 停止网络捕获
            await this.stopCapture(deviceId);
            
            // 清理代理设置（可选）
            await this.cleanupProxySettings(deviceId);
            
            this.logger.info('✅ 网络捕获设置清理完成');
            
        } catch (error) {
            this.logger.error(`❌ 清理网络捕获设置失败 for device: ${deviceId}`, error);
        }
    }

    /**
     * 清理代理设置
     */
    private async cleanupProxySettings(deviceId: string): Promise<void> {
        try {
            this.logger.info('Cleaning up proxy settings...');
            
            const driver = await this.appiumService.initializeDriver(deviceId);
            try {
                await driver.activateApp('com.apple.Preferences');
                await driver.pause(2000);
                
                // 导航到Wi-Fi设置
                await this.navigateToWiFiSettings(driver);
                
                // 尝试关闭代理设置
                await this.disableProxySettings(driver);
                
            } finally {
                await this.appiumService.closeDriver(deviceId);
            }
            
        } catch (error) {
            this.logger.warn('Failed to cleanup proxy settings:', error);
        }
    }

    /**
     * 禁用代理设置
     */
    private async disableProxySettings(driver: WebdriverIO.Browser): Promise<void> {
        try {
            // 尝试点击当前Wi-Fi网络的(i)图标
            const infoButton = await driver.$('~信息');
            if (await infoButton.isDisplayed()) {
                await infoButton.click();
                await driver.pause(2000);
                
                // 滚动到底部
                await driver.executeScript('mobile: scroll', ['down']);
                await driver.pause(1000);
                
                // 尝试点击配置代理
                const configureProxyButton = await driver.$('~配置代理');
                if (await configureProxyButton.isDisplayed()) {
                    await configureProxyButton.click();
                    await driver.pause(2000);
                    
                    // 尝试选择关闭
                    const offButton = await driver.$('~关闭');
                    if (await offButton.isDisplayed()) {
                        await offButton.click();
                        await driver.pause(2000);
                        this.logger.info('✅ Successfully disabled proxy settings');
                    }
                }
            }
        } catch (error) {
            this.logger.warn('Failed to disable proxy settings:', error);
        }
    }
>>>>>>> Stashed changes
} 