import { Logger } from '../utils/logger';
import { AppiumService } from '../services/appium.service';
import { IOSCertificateInstaller } from './ios.certificate.installer';
import { CaptureScriptService } from './capture.service';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ViberAPICaptureConfig {
    deviceId: string;
    proxyPort?: number;
    captureAllTraffic?: boolean;
    enableSSLInspection?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    autoInstallCertificate?: boolean;
    captureTimeout?: number;
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
}

export class IOSViberCapture {
    private logger: Logger;
    private appiumService: AppiumService;
    private certificateInstaller: IOSCertificateInstaller;
    private captureService: CaptureScriptService;
    private mitmProcess: ChildProcess | null = null;
    private isCapturing: boolean = false;
    private capturedResponses: ViberAPIResponse[] = [];
    private config: ViberAPICaptureConfig;

    constructor(config: ViberAPICaptureConfig) {
        this.config = {
            proxyPort: 8888,
            captureAllTraffic: false,
            enableSSLInspection: true,
            logLevel: 'info',
            autoInstallCertificate: true,
            captureTimeout: 300000, // 5 minutes
            ...config
        };
        
        this.logger = new Logger('IOSViberCapture');
        this.appiumService = new AppiumService();
        this.certificateInstaller = new IOSCertificateInstaller();
        this.captureService = new CaptureScriptService();
    }

    /**
     * 启动完整的iOS Viber API捕获
     */
    public async startCapture(): Promise<void> {
        try {
            this.logger.info(`🚀 开始iOS Viber API捕获 for device: ${this.config.deviceId}`);

            // 步骤1: 检查设备连接
            await this.checkDeviceConnection();

            // 步骤2: 安装证书（如果需要）
            if (this.config.autoInstallCertificate) {
                await this.installCertificate();
            }

            // 步骤3: 配置设备代理
            await this.setupDeviceProxy();

            // 步骤4: 启动mitmproxy
            await this.startMitmproxy();

            // 步骤5: 启动Viber应用
            await this.launchViberApp();

            // 步骤6: 开始监控API响应
            await this.startAPIMonitoring();

            this.isCapturing = true;
            this.logger.info('✅ iOS Viber API捕获已启动');

        } catch (error) {
            this.logger.error('❌ 启动iOS Viber API捕获失败', error);
            throw error;
        }
    }

    /**
     * 停止捕获
     */
    public async stopCapture(): Promise<void> {
        try {
            this.logger.info('🛑 停止iOS Viber API捕获...');

            // 停止mitmproxy
            if (this.mitmProcess) {
                this.mitmProcess.kill('SIGTERM');
                this.mitmProcess = null;
            }

            // 停止捕获服务
            await this.captureService.stopMitmproxyCapture();

            // 清理代理设置
            await this.cleanupProxySettings();

            this.isCapturing = false;
            this.logger.info('✅ iOS Viber API捕获已停止');

        } catch (error) {
            this.logger.error('❌ 停止捕获失败', error);
        }
    }

    /**
     * 检查设备连接
     */
    private async checkDeviceConnection(): Promise<void> {
        try {
            this.logger.info('检查设备连接...');
            
            const driver = await this.appiumService.initializeDriver(this.config.deviceId);
            try {
                // 检查设备是否响应
                const deviceInfo = await driver.executeScript('mobile: deviceInfo');
                this.logger.info(`✅ 设备连接正常: ${deviceInfo.name || this.config.deviceId}`);
            } finally {
                await this.appiumService.closeDriver(this.config.deviceId);
            }
        } catch (error) {
            this.logger.error('设备连接失败:', error);
            throw new Error(`无法连接到设备: ${this.config.deviceId}`);
        }
    }

    /**
     * 安装证书
     */
    private async installCertificate(): Promise<void> {
        try {
            this.logger.info('安装mitmproxy证书...');
            
            const success = await this.certificateInstaller.installCertificateComplete(this.config.deviceId);
            
            if (success) {
                this.logger.info('✅ 证书安装成功');
            } else {
                this.logger.warn('⚠️ 证书安装可能不完整，请手动验证');
            }
        } catch (error) {
            this.logger.error('证书安装失败:', error);
            throw error;
        }
    }

    /**
     * 配置设备代理
     */
    private async setupDeviceProxy(): Promise<void> {
        try {
            this.logger.info('配置设备代理...');
            
            const localIP = await this.getLocalIPAddress();
            const proxyPort = this.config.proxyPort!;
            
            this.logger.info(`📋 代理设置信息：`);
            this.logger.info(`   服务器: ${localIP}`);
            this.logger.info(`   端口: ${proxyPort}`);
            
            const driver = await this.appiumService.initializeDriver(this.config.deviceId);
            try {
                await this.configureProxyViaAppium(driver, localIP, proxyPort);
            } finally {
                await this.appiumService.closeDriver(this.config.deviceId);
            }
            
        } catch (error) {
            this.logger.error('代理配置失败:', error);
            throw error;
        }
    }

    /**
     * 通过Appium配置代理
     */
    private async configureProxyViaAppium(driver: any, server: string, port: number): Promise<void> {
        try {
            this.logger.info('通过Appium配置代理...');
            
            // 激活设置应用
            await driver.activateApp('com.apple.Preferences');
            await driver.pause(2000);
            
            // 导航到Wi-Fi设置
            await this.navigateToWiFiSettings(driver);
            
            // 配置代理设置
            await this.configureProxySettings(driver, server, port);
            
            this.logger.info('✅ 代理配置完成');
            
        } catch (error) {
            this.logger.warn('Appium代理配置失败:', error);
            this.provideManualProxySetupGuide(server, port);
        }
    }

    /**
     * 导航到Wi-Fi设置
     */
    private async navigateToWiFiSettings(driver: any): Promise<void> {
        try {
            const wifiCell = await driver.$('~Wi-Fi');
            if (await wifiCell.isDisplayed()) {
                await wifiCell.click();
                await driver.pause(2000);
            }
        } catch (error) {
            this.logger.warn('Wi-Fi导航失败:', error);
        }
    }

    /**
     * 配置代理设置
     */
    private async configureProxySettings(driver: any, server: string, port: number): Promise<void> {
        try {
            // 尝试点击当前Wi-Fi网络的(i)图标
            const infoButton = await driver.$('~信息');
            if (await infoButton.isDisplayed()) {
                await infoButton.click();
                await driver.pause(2000);
            }
            
            // 滚动到底部
            await driver.executeScript('mobile: scroll', ['down']);
            await driver.pause(1000);
            
            // 点击配置代理
            const configureProxyButton = await driver.$('~配置代理');
            if (await configureProxyButton.isDisplayed()) {
                await configureProxyButton.click();
                await driver.pause(2000);
                
                // 选择手动模式
                const manualButton = await driver.$('~手动');
                if (await manualButton.isDisplayed()) {
                    await manualButton.click();
                    await driver.pause(2000);
                }
                
                // 输入服务器地址
                const serverField = await driver.$('~服务器');
                if (await serverField.isDisplayed()) {
                    await serverField.click();
                    await driver.pause(1000);
                    await serverField.setValue(server);
                    await driver.pause(1000);
                }
                
                // 输入端口
                const portField = await driver.$('~端口');
                if (await portField.isDisplayed()) {
                    await portField.click();
                    await driver.pause(1000);
                    await portField.setValue(port.toString());
                    await driver.pause(1000);
                }
                
                // 保存设置
                const saveButton = await driver.$('~保存');
                if (await saveButton.isDisplayed()) {
                    await saveButton.click();
                    await driver.pause(2000);
                }
            }
        } catch (error) {
            this.logger.warn('代理设置配置失败:', error);
        }
    }

    /**
     * 启动mitmproxy
     */
    private async startMitmproxy(): Promise<void> {
        try {
            this.logger.info('启动mitmproxy...');
            
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

            // 等待mitmproxy启动
            await this.waitForMitmproxyReady();
            this.logger.info('✅ mitmproxy启动成功');
            
        } catch (error) {
            this.logger.error('启动mitmproxy失败:', error);
            throw error;
        }
    }

    /**
     * 启动Viber应用
     */
    private async launchViberApp(): Promise<void> {
        try {
            this.logger.info('启动Viber应用...');
            
            const driver = await this.appiumService.initializeDriver(this.config.deviceId);
            try {
                // 尝试启动Viber应用
                await driver.activateApp('com.viber');
                await driver.pause(3000);
                
                this.logger.info('✅ Viber应用已启动');
                
            } finally {
                await this.appiumService.closeDriver(this.config.deviceId);
            }
            
        } catch (error) {
            this.logger.warn('启动Viber应用失败:', error);
            this.logger.info('📋 请手动启动Viber应用');
        }
    }

    /**
     * 开始API监控
     */
    private async startAPIMonitoring(): Promise<void> {
        try {
            this.logger.info('开始API监控...');
            
            // 启动捕获服务
            await this.captureService.startMitmproxyCapture(this.config.proxyPort!);
            
            // 设置响应监控
            const unwatch = this.captureService.watchForNewResponses((response) => {
                this.handleNewAPIResponse(response);
            });
            
            this.logger.info('✅ API监控已启动');
            
        } catch (error) {
            this.logger.error('启动API监控失败:', error);
            throw error;
        }
    }

    /**
     * 处理新的API响应
     */
    private handleNewAPIResponse(response: any): void {
        try {
            const viberResponse: ViberAPIResponse = {
                id: response.capture_id || this.generateResponseId(),
                timestamp: response.timestamp,
                method: response.method,
                url: response.url,
                statusCode: response.statusCode,
                requestHeaders: response.request_headers || {},
                responseHeaders: response.response_headers || {},
                requestBody: response.request_body,
                responseBody: response.body,
                isSSL: response.is_ssl || false,
                clientIP: response.client_ip,
                captureSource: this.isViberAPI(response.url) ? 'viber' : 'general'
            };
            
            this.capturedResponses.push(viberResponse);
            
            this.logger.info(`📡 捕获到新的API响应: ${viberResponse.method} ${viberResponse.url}`);
            this.logger.info(`📊 状态码: ${viberResponse.statusCode}, 来源: ${viberResponse.captureSource}`);
            
            // 如果是Viber API，进行特殊处理
            if (viberResponse.captureSource === 'viber') {
                this.handleViberAPIResponse(viberResponse);
            }
            
        } catch (error) {
            this.logger.error('处理API响应失败:', error);
        }
    }

    /**
     * 处理Viber API响应
     */
    private handleViberAPIResponse(response: ViberAPIResponse): void {
        try {
            this.logger.info(`🎯 Viber API响应: ${response.method} ${response.url}`);
            
            // 分析响应内容
            if (response.responseBody) {
                try {
                    const jsonResponse = JSON.parse(response.responseBody);
                    this.analyzeViberResponse(jsonResponse, response);
                } catch (error) {
                    this.logger.warn('响应不是有效的JSON格式');
                }
            }
            
            // 保存到专门的Viber响应文件
            this.saveViberResponse(response);
            
        } catch (error) {
            this.logger.error('处理Viber API响应失败:', error);
        }
    }

    /**
     * 分析Viber响应
     */
    private analyzeViberResponse(jsonResponse: any, response: ViberAPIResponse): void {
        try {
            // 检查响应类型
            if (jsonResponse.status) {
                this.logger.info(`📊 Viber API状态: ${jsonResponse.status}`);
            }
            
            if (jsonResponse.message) {
                this.logger.info(`💬 Viber消息: ${jsonResponse.message}`);
            }
            
            if (jsonResponse.data) {
                this.logger.info(`📦 Viber数据: ${JSON.stringify(jsonResponse.data).substring(0, 100)}...`);
            }
            
        } catch (error) {
            this.logger.warn('分析Viber响应失败:', error);
        }
    }

    /**
     * 保存Viber响应
     */
    private saveViberResponse(response: ViberAPIResponse): void {
        try {
            const viberLogDir = path.join(process.cwd(), 'viber-responses');
            if (!fs.existsSync(viberLogDir)) {
                fs.mkdirSync(viberLogDir, { recursive: true });
            }
            
            const filename = `${response.timestamp.replace(/[:.]/g, '-')}_${response.id}.json`;
            const filepath = path.join(viberLogDir, filename);
            
            fs.writeFileSync(filepath, JSON.stringify(response, null, 2), 'utf8');
            this.logger.info(`💾 Viber响应已保存: ${filename}`);
            
        } catch (error) {
            this.logger.error('保存Viber响应失败:', error);
        }
    }

    /**
     * 检查是否为Viber API
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
     * 生成响应ID
     */
    private generateResponseId(): string {
        return Math.random().toString(36).substring(2, 10);
    }

    /**
     * 获取本机IP地址
     */
    private async getLocalIPAddress(): Promise<string> {
        try {
            const { stdout } = await execAsync('ifconfig | grep "inet " | grep -v 127.0.0.1 | awk \'{print $2}\' | head -1');
            const ip = stdout.trim();
            this.logger.info(`本机IP地址: ${ip}`);
            return ip;
        } catch (error) {
            this.logger.warn('获取本机IP失败，使用默认IP');
            return '192.168.1.100';
        }
    }

    /**
     * 等待mitmproxy准备就绪
     */
    private async waitForMitmproxyReady(): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, 3000);
        });
    }

    /**
     * 清理代理设置
     */
    private async cleanupProxySettings(): Promise<void> {
        try {
            this.logger.info('清理代理设置...');
            
            const driver = await this.appiumService.initializeDriver(this.config.deviceId);
            try {
                await driver.activateApp('com.apple.Preferences');
                await driver.pause(2000);
                
                await this.navigateToWiFiSettings(driver);
                
                // 尝试关闭代理设置
                await this.disableProxySettings(driver);
                
            } finally {
                await this.appiumService.closeDriver(this.config.deviceId);
            }
            
        } catch (error) {
            this.logger.warn('清理代理设置失败:', error);
        }
    }

    /**
     * 禁用代理设置
     */
    private async disableProxySettings(driver: any): Promise<void> {
        try {
            const infoButton = await driver.$('~信息');
            if (await infoButton.isDisplayed()) {
                await infoButton.click();
                await driver.pause(2000);
                
                await driver.executeScript('mobile: scroll', ['down']);
                await driver.pause(1000);
                
                const configureProxyButton = await driver.$('~配置代理');
                if (await configureProxyButton.isDisplayed()) {
                    await configureProxyButton.click();
                    await driver.pause(2000);
                    
                    const offButton = await driver.$('~关闭');
                    if (await offButton.isDisplayed()) {
                        await offButton.click();
                        await driver.pause(2000);
                        this.logger.info('✅ 代理设置已禁用');
                    }
                }
            }
        } catch (error) {
            this.logger.warn('禁用代理设置失败:', error);
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
    }

    /**
     * 获取捕获的响应
     */
    public getCapturedResponses(): ViberAPIResponse[] {
        return [...this.capturedResponses];
    }

    /**
     * 获取Viber API响应
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
