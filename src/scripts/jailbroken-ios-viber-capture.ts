import { Logger } from '../utils/logger';
import { AppiumService } from '../services/appium.service';
import { NetworkCaptureService } from '../services/network.capture.service';
import { IOSCertificateInstaller } from './ios.certificate.installer';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface JailbrokenViberCaptureConfig {
    deviceId: string;
    proxyPort?: number;
    captureAllTraffic?: boolean;
    enableSSLInspection?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    autoInstallCertificate?: boolean;
    captureTimeout?: number;
    useJailbreakFeatures?: boolean;
    bypassSSLVerification?: boolean;
}

export interface ViberAPIResponse {
    id: string;
    timestamp: string;
    method: string;
    url: string;
    statusCode: number;
    requestHeaders: Record<string, string>;
    responseHeaders: Record<string, string>;
    requestBody?: string;
    responseBody?: string;
    isSSL: boolean;
    clientIP?: string;
    captureSource: 'viber' | 'general';
    deviceInfo?: {
        deviceId: string;
        isJailbroken: boolean;
        iosVersion: string;
    };
}

export class JailbrokenIOSViberCapture {
    private logger: Logger;
    private appiumService: AppiumService;
    private networkCaptureService: NetworkCaptureService;
    private certificateInstaller: IOSCertificateInstaller;
    private mitmProcess: ChildProcess | null = null;
    private isCapturing: boolean = false;
    private capturedResponses: ViberAPIResponse[] = [];
    private config: JailbrokenViberCaptureConfig;

    constructor(config: JailbrokenViberCaptureConfig) {
        this.config = {
            proxyPort: 8888,
            captureAllTraffic: false,
            enableSSLInspection: true,
            logLevel: 'info',
            autoInstallCertificate: true,
            captureTimeout: 300000, // 5 minutes
            useJailbreakFeatures: true,
            bypassSSLVerification: true,
            ...config
        };
        
        this.logger = new Logger('JailbrokenIOSViberCapture');
        this.appiumService = new AppiumService();
        this.networkCaptureService = new NetworkCaptureService();
        this.certificateInstaller = new IOSCertificateInstaller();
    }

    /**
     * 启动越狱手机的 Viber 网络捕获
     */
    public async startCapture(): Promise<void> {
        try {
            this.logger.info(`🚀 开始越狱手机 Viber 网络捕获 for device: ${this.config.deviceId}`);

            // 步骤1: 检查设备连接和越狱状态
            await this.checkDeviceAndJailbreakStatus();

            // 步骤2: 配置越狱手机特有的网络设置
            await this.setupJailbrokenDeviceNetwork();

            // 步骤3: 安装证书（越狱手机可以自动信任）
            if (this.config.autoInstallCertificate) {
                await this.installCertificateForJailbrokenDevice();
            }

            // 步骤4: 启动 mitmproxy
            await this.startMitmproxy();

            // 步骤5: 配置系统级代理
            await this.configureSystemProxy();

            // 步骤6: 启动 Viber 应用
            await this.launchViberApp();

            // 步骤7: 开始监控 API 响应
            await this.startAPIMonitoring();

            this.isCapturing = true;
            this.logger.info('✅ 越狱手机 Viber 网络捕获已启动');

        } catch (error) {
            this.logger.error('❌ 启动越狱手机 Viber 网络捕获失败', error);
            throw error;
        }
    }

    /**
     * 检查设备连接和越狱状态
     */
    private async checkDeviceAndJailbreakStatus(): Promise<void> {
        try {
            this.logger.info('检查设备连接和越狱状态...');
            
            const driver = await this.appiumService.initializeDriver(this.config.deviceId);
            
            // 检查设备信息
            const deviceInfo = await this.appiumService.getCurrentDeviceInfo(this.config.deviceId);
            this.logger.info(`设备信息: ${JSON.stringify(deviceInfo)}`);

            // 检查越狱状态
            const isJailbroken = await this.checkJailbreakStatus(driver);
            if (isJailbroken) {
                this.logger.info('✅ 设备已越狱，可以使用高级功能');
            } else {
                this.logger.warn('⚠️ 设备未越狱，某些功能可能受限');
            }

            await this.appiumService.closeDriver(this.config.deviceId);
        } catch (error) {
            this.logger.error('检查设备状态失败:', error);
            throw error;
        }
    }

    /**
     * 检查越狱状态
     */
    private async checkJailbreakStatus(driver: any): Promise<boolean> {
        try {
            // 检查常见的越狱文件
            const jailbreakFiles = [
                '/Applications/Cydia.app',
                '/Applications/Sileo.app',
                '/Applications/Zebra.app',
                '/Library/MobileSubstrate',
                '/usr/bin/ssh',
                '/usr/sbin/sshd'
            ];

            for (const file of jailbreakFiles) {
                try {
                    const result = await driver.executeScript('mobile: shell', {
                        command: `test -e "${file}" && echo "exists" || echo "not_exists"`
                    });
                    if (result && result.includes('exists')) {
                        this.logger.info(`发现越狱文件: ${file}`);
                        return true;
                    }
                } catch (error) {
                    // 忽略错误，继续检查下一个文件
                }
            }

            // 检查是否可以执行特权命令
            try {
                const result = await driver.executeScript('mobile: shell', {
                    command: 'whoami'
                });
                if (result && result.includes('root')) {
                    this.logger.info('设备以 root 权限运行');
                    return true;
                }
            } catch (error) {
                // 忽略错误
            }

            return false;
        } catch (error) {
            this.logger.warn('检查越狱状态失败:', error);
            return false;
        }
    }

    /**
     * 配置越狱手机特有的网络设置
     */
    private async setupJailbrokenDeviceNetwork(): Promise<void> {
        try {
            this.logger.info('配置越狱手机网络设置...');
            
            const driver = await this.appiumService.initializeDriver(this.config.deviceId);
            
            // 检查是否可以修改系统网络设置
            const isJailbroken = await this.checkJailbreakStatus(driver);
            
            if (isJailbroken) {
                // 越狱手机可以修改系统级网络设置
                await this.configureSystemNetworkSettings(driver);
            } else {
                // 普通设备只能修改应用级代理
                await this.configureAppLevelProxy(driver);
            }

            await this.appiumService.closeDriver(this.config.deviceId);
        } catch (error) {
            this.logger.error('配置网络设置失败:', error);
            throw error;
        }
    }

    /**
     * 配置系统级网络设置（越狱手机）
     */
    private async configureSystemNetworkSettings(driver: any): Promise<void> {
        try {
            this.logger.info('配置系统级网络设置...');
            
            // 获取本地 IP 地址
            const localIP = await this.getLocalIPAddress();
            
            // 使用系统命令配置代理
            const proxyCommands = [
                `networksetup -setwebproxy "Wi-Fi" ${localIP} ${this.config.proxyPort}`,
                `networksetup -setsecurewebproxy "Wi-Fi" ${localIP} ${this.config.proxyPort}`,
                `networksetup -setwebproxystate "Wi-Fi" on`,
                `networksetup -setsecurewebproxystate "Wi-Fi" on`
            ];

            for (const command of proxyCommands) {
                try {
                    await driver.executeScript('mobile: shell', {
                        command: command
                    });
                    this.logger.debug(`执行命令成功: ${command}`);
                } catch (error) {
                    this.logger.warn(`执行命令失败: ${command}`, error);
                }
            }

            this.logger.info('✅ 系统级网络设置配置完成');
        } catch (error) {
            this.logger.error('配置系统级网络设置失败:', error);
            throw error;
        }
    }

    /**
     * 配置应用级代理（普通设备）
     */
    private async configureAppLevelProxy(driver: any): Promise<void> {
        try {
            this.logger.info('配置应用级代理...');
            
            // 使用 Appium 配置代理
            await this.networkCaptureService.setupProxyForDevice(this.config.deviceId);
            
            this.logger.info('✅ 应用级代理配置完成');
        } catch (error) {
            this.logger.error('配置应用级代理失败:', error);
            throw error;
        }
    }

    /**
     * 为越狱设备安装证书
     */
    private async installCertificateForJailbrokenDevice(): Promise<void> {
        try {
            this.logger.info('为越狱设备安装证书...');
            
            const driver = await this.appiumService.initializeDriver(this.config.deviceId);
            
            // 检查越狱状态
            const isJailbroken = await this.checkJailbreakStatus(driver);
            
            if (isJailbroken) {
                // 越狱设备可以直接安装证书到系统
                await this.installCertificateToSystem(driver);
            } else {
                // 普通设备使用标准安装方法
                await this.certificateInstaller.installCertificateComplete(this.config.deviceId);
            }

            await this.appiumService.closeDriver(this.config.deviceId);
        } catch (error) {
            this.logger.error('安装证书失败:', error);
            throw error;
        }
    }

    /**
     * 将证书安装到系统（越狱设备）
     */
    private async installCertificateToSystem(driver: any): Promise<void> {
        try {
            this.logger.info('将证书安装到系统...');
            
            // 生成证书路径
            const certDir = path.join(process.cwd(), 'mitmproxy');
            const certPath = path.join(certDir, 'mitmproxy-ca-cert.pem');
            
            if (!fs.existsSync(certPath)) {
                this.logger.info('生成 mitmproxy 证书...');
                await this.generateMitmproxyCertificate(certDir);
            }

            // 将证书复制到设备
            const deviceCertPath = '/var/root/mitmproxy-ca-cert.pem';
            
            // 使用 scp 或类似方法将证书传输到设备
            await this.transferCertificateToDevice(certPath, deviceCertPath);

            // 安装证书到系统
            const installCommands = [
                `cp ${deviceCertPath} /etc/ssl/certs/`,
                `security add-trusted-cert -d -r trustRoot -k /System/Library/Keychains/SystemRootCertificates.keychain /etc/ssl/certs/mitmproxy-ca-cert.pem`,
                `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /etc/ssl/certs/mitmproxy-ca-cert.pem`
            ];

            // 注意：mobile: shell 命令在 iOS 上可能不被支持
            // 这里提供手动指导
            this.logger.info('📋 由于 iOS 限制，请手动执行以下命令：');
            for (const command of installCommands) {
                this.logger.info(`   ${command}`);
            }
            this.logger.info('📋 请通过 SSH 连接到设备并执行上述命令');

            this.logger.info('✅ 证书已安装到系统');
        } catch (error) {
            this.logger.error('安装证书到系统失败:', error);
            throw error;
        }
    }

    /**
     * 传输证书到设备
     */
    private async transferCertificateToDevice(localPath: string, devicePath: string): Promise<void> {
        try {
            this.logger.info(`传输证书到设备: ${localPath} -> ${devicePath}`);
            
            // 这里需要实现证书传输逻辑
            // 可以使用 scp、AirDrop 或其他方法
            this.logger.info('请手动将证书传输到设备，或使用 AirDrop 等方法');
            
        } catch (error) {
            this.logger.error('传输证书失败:', error);
            throw error;
        }
    }

    /**
     * 生成 mitmproxy 证书
     */
    private async generateMitmproxyCertificate(certDir: string): Promise<void> {
        try {
            this.logger.info('生成 mitmproxy 证书...');
            
            if (!fs.existsSync(certDir)) {
                fs.mkdirSync(certDir, { recursive: true });
            }

            const certPath = path.join(certDir, 'mitmproxy-ca-cert.pem');
            const keyPath = path.join(certDir, 'mitmproxy-ca-cert.key');

            if (!fs.existsSync(certPath)) {
                // 使用 mitmdump 生成证书
                const mitmProcess = spawn('mitmdump', [
                    '--set', `confdir=${certDir}`,
                    '--set', 'ssl_insecure=true'
                ]);

                await new Promise((resolve, reject) => {
                    setTimeout(() => {
                        mitmProcess.kill('SIGTERM');
                        resolve(true);
                    }, 5000);
                });

                this.logger.info('✅ mitmproxy 证书生成完成');
            } else {
                this.logger.info('证书已存在，跳过生成');
            }
        } catch (error) {
            this.logger.error('生成证书失败:', error);
            throw error;
        }
    }

    /**
     * 启动 mitmproxy
     */
    private async startMitmproxy(): Promise<void> {
        try {
            this.logger.info('启动 mitmproxy...');
            
            const scriptPath = path.join(__dirname, 'capture.script.py');
            const certDir = path.join(process.cwd(), 'mitmproxy');
            
            this.mitmProcess = spawn('mitmdump', [
                '--mode', 'transparent',
                '--listen-port', this.config.proxyPort!.toString(),
                '--set', `confdir=${certDir}`,
                '--set', 'ssl_insecure=true',
                '--script', scriptPath
            ]);

            this.mitmProcess.stdout?.on('data', (data) => {
                this.logger.debug(`Mitmproxy: ${data}`);
            });

            this.mitmProcess.stderr?.on('data', (data) => {
                this.logger.error(`Mitmproxy error: ${data}`);
            });

            this.mitmProcess.on('close', (code) => {
                this.logger.info(`Mitmproxy process exited with code: ${code}`);
            });

            // 等待 mitmproxy 启动
            await this.waitForMitmproxyReady();
            this.logger.info('✅ mitmproxy 启动成功');
            
        } catch (error) {
            this.logger.error('启动 mitmproxy 失败:', error);
            throw error;
        }
    }

    /**
     * 配置系统代理
     */
    private async configureSystemProxy(): Promise<void> {
        try {
            this.logger.info('配置系统代理...');
            
            const driver = await this.appiumService.initializeDriver(this.config.deviceId);
            
            // 检查越狱状态
            const isJailbroken = await this.checkJailbreakStatus(driver);
            
            if (isJailbroken) {
                // 越狱设备可以配置系统级代理
                await this.configureSystemLevelProxy(driver);
            } else {
                // 普通设备配置应用级代理
                await this.configureAppLevelProxy(driver);
            }

            await this.appiumService.closeDriver(this.config.deviceId);
        } catch (error) {
            this.logger.error('配置系统代理失败:', error);
            throw error;
        }
    }

    /**
     * 配置系统级代理（越狱设备）
     */
    private async configureSystemLevelProxy(driver: any): Promise<void> {
        try {
            this.logger.info('配置系统级代理...');
            
            const localIP = await this.getLocalIPAddress();
            
            // 使用系统命令配置代理
            const proxyCommands = [
                `networksetup -setwebproxy "Wi-Fi" ${localIP} ${this.config.proxyPort}`,
                `networksetup -setsecurewebproxy "Wi-Fi" ${localIP} ${this.config.proxyPort}`,
                `networksetup -setwebproxystate "Wi-Fi" on`,
                `networksetup -setsecurewebproxystate "Wi-Fi" on`
            ];

            for (const command of proxyCommands) {
                try {
                    await driver.executeScript('mobile: shell', {
                        command: command
                    });
                    this.logger.debug(`执行代理命令: ${command}`);
                } catch (error) {
                    this.logger.warn(`代理命令失败: ${command}`, error);
                }
            }

            this.logger.info('✅ 系统级代理配置完成');
        } catch (error) {
            this.logger.error('配置系统级代理失败:', error);
            throw error;
        }
    }

    /**
     * 启动 Viber 应用
     */
    private async launchViberApp(): Promise<void> {
        try {
            this.logger.info('启动 Viber 应用...');
            
            const driver = await this.appiumService.initializeDriver(this.config.deviceId);
            
            // 启动 Viber 应用
            await driver.activateApp('com.viber');
            await driver.pause(5000);
            
            this.logger.info('✅ Viber 应用已启动');
            
            await this.appiumService.closeDriver(this.config.deviceId);
        } catch (error) {
            this.logger.error('启动 Viber 应用失败:', error);
            throw error;
        }
    }

    /**
     * 开始 API 监控
     */
    private async startAPIMonitoring(): Promise<void> {
        try {
            this.logger.info('开始 API 监控...');
            
            // 监控新的 API 响应
            const unwatch = this.networkCaptureService.watchForNewResponses(this.config.deviceId, (response) => {
                this.handleNewAPIResponse(response);
            });

            this.logger.info('✅ API 监控已启动');
        } catch (error) {
            this.logger.error('启动 API 监控失败:', error);
            throw error;
        }
    }

    /**
     * 处理新的 API 响应
     */
    private handleNewAPIResponse(response: any): void {
        try {
            const viberResponse: ViberAPIResponse = {
                id: this.generateResponseId(),
                timestamp: new Date().toISOString(),
                method: response.method || 'GET',
                url: response.url || '',
                statusCode: response.statusCode || 0,
                requestHeaders: response.requestHeaders || {},
                responseHeaders: response.responseHeaders || {},
                requestBody: response.requestBody,
                responseBody: response.responseBody,
                isSSL: response.isSSL || false,
                clientIP: response.clientIP,
                captureSource: this.isViberAPI(response.url) ? 'viber' : 'general',
                deviceInfo: {
                    deviceId: this.config.deviceId,
                    isJailbroken: true,
                    iosVersion: 'Unknown'
                }
            };

            this.capturedResponses.push(viberResponse);
            this.saveViberResponse(viberResponse);
            
            this.logger.info(`📡 捕获到新的 API 响应: ${viberResponse.method} ${viberResponse.url}`);
        } catch (error) {
            this.logger.error('处理 API 响应失败:', error);
        }
    }

    /**
     * 判断是否为 Viber API
     */
    private isViberAPI(url: string): boolean {
        const viberDomains = [
            'api.viber.com',
            'api.viber.me',
            'api.viber.net',
            'viber.com',
            'viber.me',
            'viber.net'
        ];
        
        return viberDomains.some(domain => url.includes(domain));
    }

    /**
     * 生成响应 ID
     */
    private generateResponseId(): string {
        return `viber_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 保存 Viber 响应
     */
    private saveViberResponse(response: ViberAPIResponse): void {
        try {
            const responseDir = path.join(process.cwd(), 'api-responses', this.config.deviceId);
            if (!fs.existsSync(responseDir)) {
                fs.mkdirSync(responseDir, { recursive: true });
            }

            const filename = `${response.id}.json`;
            const filepath = path.join(responseDir, filename);
            
            fs.writeFileSync(filepath, JSON.stringify(response, null, 2));
            this.logger.debug(`保存响应到: ${filepath}`);
        } catch (error) {
            this.logger.error('保存响应失败:', error);
        }
    }

    /**
     * 获取本地 IP 地址
     */
    private async getLocalIPAddress(): Promise<string> {
        try {
            const { stdout } = await execAsync('ifconfig | grep "inet " | grep -v 127.0.0.1 | awk \'{print $2}\' | head -n 1');
            return stdout.trim();
        } catch (error) {
            this.logger.warn('获取本地 IP 失败，使用默认地址:', error);
            return '192.168.1.100';
        }
    }

    /**
     * 等待 mitmproxy 准备就绪
     */
    private async waitForMitmproxyReady(): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, 3000);
        });
    }

    /**
     * 停止捕获
     */
    public async stopCapture(): Promise<void> {
        try {
            this.logger.info('停止 Viber 网络捕获...');
            
            if (this.mitmProcess) {
                this.mitmProcess.kill('SIGTERM');
                this.mitmProcess = null;
            }

            // 清理代理设置
            await this.cleanupProxySettings();
            
            this.isCapturing = false;
            this.logger.info('✅ Viber 网络捕获已停止');
        } catch (error) {
            this.logger.error('停止捕获失败:', error);
        }
    }

    /**
     * 清理代理设置
     */
    private async cleanupProxySettings(): Promise<void> {
        try {
            this.logger.info('清理代理设置...');
            
            const driver = await this.appiumService.initializeDriver(this.config.deviceId);
            
            // 检查越狱状态
            const isJailbroken = await this.checkJailbreakStatus(driver);
            
            if (isJailbroken) {
                // 清理系统级代理设置
                const cleanupCommands = [
                    `networksetup -setwebproxystate "Wi-Fi" off`,
                    `networksetup -setsecurewebproxystate "Wi-Fi" off`
                ];

                for (const command of cleanupCommands) {
                    try {
                        await driver.executeScript('mobile: shell', {
                            command: command
                        });
                    } catch (error) {
                        this.logger.warn(`清理命令失败: ${command}`, error);
                    }
                }
            }

            await this.appiumService.closeDriver(this.config.deviceId);
            this.logger.info('✅ 代理设置已清理');
        } catch (error) {
            this.logger.error('清理代理设置失败:', error);
        }
    }

    /**
     * 获取捕获的响应
     */
    public getCapturedResponses(): ViberAPIResponse[] {
        return this.capturedResponses;
    }

    /**
     * 获取 Viber API 响应
     */
    public getViberAPIResponses(): ViberAPIResponse[] {
        return this.capturedResponses.filter(response => response.captureSource === 'viber');
    }

    /**
     * 检查是否正在捕获
     */
    public isCapturingActive(): boolean {
        return this.isCapturing;
    }

    /**
     * 获取捕获统计信息
     */
    public getCaptureStats(): {
        totalResponses: number;
        viberResponses: number;
        generalResponses: number;
        isCapturing: boolean;
    } {
        return {
            totalResponses: this.capturedResponses.length,
            viberResponses: this.capturedResponses.filter(r => r.captureSource === 'viber').length,
            generalResponses: this.capturedResponses.filter(r => r.captureSource === 'general').length,
            isCapturing: this.isCapturing
        };
    }
}
