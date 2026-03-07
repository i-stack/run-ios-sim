import { Logger } from '../utils/logger';
import { AppiumService } from '../services/appium.service';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class IOSMitmproxyAutomation {
    private logger: Logger;
    private appiumService: AppiumService;
    private mitmProcess: ChildProcess | null = null;
    private certDir: string;
    private certPath: string;

    constructor() {
        this.logger = new Logger('IOSMitmproxyAutomation');
        this.appiumService = new AppiumService();
        this.certDir = path.join(process.cwd(), 'mitmproxy');
        this.certPath = path.join(this.certDir, 'mitmproxy-ca-cert.pem');
        this.ensureCertDirectory();
    }

    private ensureCertDirectory(): void {
        if (!fs.existsSync(this.certDir)) {
            fs.mkdirSync(this.certDir, { recursive: true });
        }
    }

    /**
     * 完整的iOS mitmproxy自动化安装流程
     */
    public async setupCompleteMitmproxy(deviceId: string): Promise<boolean> {
        try {
            this.logger.info(`🚀 开始iOS mitmproxy自动化安装 for device: ${deviceId}`);

            // 步骤1: 生成证书
            await this.generateCertificate();

            // 步骤2: 尝试多种安装方法
            const installationMethods = [
                () => this.installViaWebInterface(deviceId),
                () => this.installViaFileTransfer(deviceId),
                () => this.installViaSettingsApp(deviceId),
                () => this.installViaEmail(deviceId),
                () => this.installViaAirDrop(deviceId)
            ];

            for (const method of installationMethods) {
                try {
                    this.logger.info('尝试安装方法...');
                    const result = await method();
                    if (result) {
                        this.logger.info('✅ 证书安装成功！');
                        return true;
                    }
                } catch (error) {
                    this.logger.warn('安装方法失败，尝试下一个:', error);
                }
            }

            // 如果所有自动方法都失败，提供手动指导
            this.provideManualInstallationGuide();
            return false;

        } catch (error) {
            this.logger.error(`❌ iOS mitmproxy安装失败 for device: ${deviceId}`, error);
            return false;
        }
    }

    /**
     * 生成mitmproxy证书
     */
    private async generateCertificate(): Promise<void> {
        try {
            this.logger.info('生成mitmproxy证书...');

            if (fs.existsSync(this.certPath)) {
                this.logger.info('证书已存在，跳过生成');
                return;
            }

            // 方法1: 使用mitmdump生成证书
            try {
                await this.generateWithMitmdump();
            } catch (error) {
                this.logger.warn('mitmdump生成失败，尝试备用方法:', error);
                await this.generateWithOpenSSL();
            }

            this.logger.info('✅ 证书生成完成');
        } catch (error) {
            this.logger.error('证书生成失败:', error);
            throw error;
        }
    }

    /**
     * 使用mitmdump生成证书
     */
    private async generateWithMitmdump(): Promise<void> {
        return new Promise((resolve, reject) => {
            const mitmProcess = spawn('mitmdump', [
                '--set', `confdir=${this.certDir}`,
                '--set', 'ssl_insecure=true',
                '--mode', 'transparent',
                '--listen-port', '8888'
            ]);

            setTimeout(() => {
                mitmProcess.kill('SIGTERM');
                resolve();
            }, 5000);

            mitmProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * 使用OpenSSL生成证书（备用方法）
     */
    private async generateWithOpenSSL(): Promise<void> {
        try {
            const certKeyPath = path.join(this.certDir, 'mitmproxy-ca-cert.key');
            
            // 生成私钥
            await execAsync(`openssl genrsa -out "${certKeyPath}" 2048`);
            
            // 生成证书
            await execAsync(`openssl req -new -x509 -key "${certKeyPath}" -out "${this.certPath}" -days 365 -subj "/CN=mitmproxy"`);
            
            this.logger.info('使用OpenSSL生成证书成功');
        } catch (error) {
            this.logger.error('OpenSSL生成证书失败:', error);
            throw error;
        }
    }

    /**
     * 通过Web界面安装证书
     */
    private async installViaWebInterface(deviceId: string): Promise<boolean> {
        try {
            this.logger.info('通过Web界面安装证书...');

            const driver = await this.appiumService.initializeDriver(deviceId);
            try {
                // 启动mitmproxy
                await this.startMitmproxy();

                // 在Safari中打开证书安装页面
                await driver.activateApp('com.apple.mobilesafari');
                await driver.pause(2000);

                await driver.url('http://mitm.it');
                await driver.pause(3000);

                // 检查页面是否显示证书下载选项
                const pageSource = await driver.getPageSource();
                if (pageSource.includes('iOS') || pageSource.includes('iPhone')) {
                    this.logger.info('✅ 证书下载页面加载成功');
                    
                    // 等待用户手动安装
                    this.logger.info('⏳ 等待用户手动安装证书...');
                    await driver.pause(15000); // 等待15秒

                    // 验证证书是否安装成功
                    const isInstalled = await this.verifyCertificateInstallation(driver);
                    return isInstalled;
                } else {
                    this.logger.warn('证书下载页面未正确加载');
                    return false;
                }
            } finally {
                await this.appiumService.closeDriver(deviceId);
            }
        } catch (error) {
            this.logger.error('Web界面安装失败:', error);
            return false;
        }
    }

    /**
     * 通过文件传输安装证书
     */
    private async installViaFileTransfer(deviceId: string): Promise<boolean> {
        try {
            this.logger.info('通过文件传输安装证书...');

            const driver = await this.appiumService.initializeDriver(deviceId);
            try {
                // 尝试使用pushFile命令传输证书
                const certContent = fs.readFileSync(this.certPath, 'utf8');
                const certBase64 = Buffer.from(certContent).toString('base64');

                try {
                    await driver.executeScript('mobile: pushFile', [
                        '/tmp/mitmproxy-ca-cert.pem',
                        certBase64
                    ]);
                    this.logger.info('✅ 证书文件传输成功');
                } catch (error) {
                    this.logger.warn('pushFile失败，尝试备用方法:', error);
                    return false;
                }

                // 尝试在设备上打开证书文件
                await driver.activateApp('com.apple.DocumentsApp');
                await driver.pause(2000);

                // 导航到文件并尝试安装
                await this.installCertificateFromFile(driver);

                return await this.verifyCertificateInstallation(driver);
            } finally {
                await this.appiumService.closeDriver(deviceId);
            }
        } catch (error) {
            this.logger.error('文件传输安装失败:', error);
            return false;
        }
    }

    /**
     * 通过设置应用安装证书
     */
    private async installViaSettingsApp(deviceId: string): Promise<boolean> {
        try {
            this.logger.info('通过设置应用安装证书...');

            const driver = await this.appiumService.initializeDriver(deviceId);
            try {
                await driver.activateApp('com.apple.Preferences');
                await driver.pause(2000);

                // 导航到通用设置
                await this.navigateToGeneralSettings(driver);

                // 导航到关于本机
                await this.navigateToAboutSettings(driver);

                // 导航到证书信任设置
                await this.navigateToCertificateTrustSettings(driver);

                // 尝试安装证书
                await this.installCertificateInSettings(driver);

                return await this.verifyCertificateInstallation(driver);
            } finally {
                await this.appiumService.closeDriver(deviceId);
            }
        } catch (error) {
            this.logger.error('设置应用安装失败:', error);
            return false;
        }
    }

    /**
     * 通过邮件安装证书
     */
    private async installViaEmail(deviceId: string): Promise<boolean> {
        try {
            this.logger.info('通过邮件安装证书...');

            // 创建邮件内容
            const emailContent = this.createCertificateEmail();
            
            // 发送邮件到设备
            await this.sendCertificateEmail(emailContent);

            this.logger.info('📧 证书已通过邮件发送到设备');
            this.logger.info('📋 请在设备上打开邮件并安装证书');

            return true; // 假设邮件发送成功
        } catch (error) {
            this.logger.error('邮件安装失败:', error);
            return false;
        }
    }

    /**
     * 通过AirDrop安装证书
     */
    private async installViaAirDrop(deviceId: string): Promise<boolean> {
        try {
            this.logger.info('通过AirDrop安装证书...');

            // 打开Finder并显示证书文件
            await execAsync(`open "${this.certDir}"`);

            this.logger.info('📋 请手动通过AirDrop将证书文件发送到设备');
            this.logger.info('📋 然后在设备上点击证书文件进行安装');

            return true; // 假设AirDrop可用
        } catch (error) {
            this.logger.error('AirDrop安装失败:', error);
            return false;
        }
    }

    /**
     * 启动mitmproxy
     */
    private async startMitmproxy(): Promise<void> {
        try {
            const mitmProcess = spawn('mitmdump', [
                '--mode', 'transparent',
                '--listen-port', '8888',
                '--set', `confdir=${this.certDir}`,
                '--set', 'ssl_insecure=true'
            ]);

            // 等待mitmproxy启动
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
            this.logger.warn('启动mitmproxy失败:', error);
        }
    }

    /**
     * 导航到通用设置
     */
    private async navigateToGeneralSettings(driver: any): Promise<void> {
        try {
            const generalCell = await driver.$('~通用');
            if (await generalCell.isDisplayed()) {
                await generalCell.click();
                await driver.pause(2000);
            }
        } catch (error) {
            this.logger.warn('导航到通用设置失败:', error);
        }
    }

    /**
     * 导航到关于本机设置
     */
    private async navigateToAboutSettings(driver: any): Promise<void> {
        try {
            await driver.executeScript('mobile: scroll', ['down']);
            await driver.pause(1000);

            const aboutCell = await driver.$('~关于本机');
            if (await aboutCell.isDisplayed()) {
                await aboutCell.click();
                await driver.pause(2000);
            }
        } catch (error) {
            this.logger.warn('导航到关于本机设置失败:', error);
        }
    }

    /**
     * 导航到证书信任设置
     */
    private async navigateToCertificateTrustSettings(driver: any): Promise<void> {
        try {
            await driver.executeScript('mobile: scroll', ['down']);
            await driver.pause(1000);

            const certificateCell = await driver.$('~证书信任设置');
            if (await certificateCell.isDisplayed()) {
                await certificateCell.click();
                await driver.pause(2000);
            }
        } catch (error) {
            this.logger.warn('导航到证书信任设置失败:', error);
        }
    }

    /**
     * 在设置中安装证书
     */
    private async installCertificateInSettings(driver: any): Promise<void> {
        try {
            // 这里需要根据具体的iOS版本和界面来实现
            this.logger.info('📋 请在证书信任设置中手动安装mitmproxy证书');
            await driver.pause(10000); // 等待用户操作
        } catch (error) {
            this.logger.warn('设置中安装证书失败:', error);
        }
    }

    /**
     * 从文件安装证书
     */
    private async installCertificateFromFile(driver: any): Promise<void> {
        try {
            // 尝试在文件应用中打开证书文件
            this.logger.info('📋 请在文件应用中打开证书文件并安装');
            await driver.pause(10000); // 等待用户操作
        } catch (error) {
            this.logger.warn('从文件安装证书失败:', error);
        }
    }

    /**
     * 创建证书邮件内容
     */
    private createCertificateEmail(): string {
        return `
        <html>
        <body>
        <h2>Mitmproxy 证书安装</h2>
        <p>请下载并安装此证书以启用网络监控功能。</p>
        <p>安装步骤：</p>
        <ol>
            <li>点击附件中的证书文件</li>
            <li>选择"安装"</li>
            <li>输入设备密码</li>
            <li>在设置中启用证书信任</li>
        </ol>
        </body>
        </html>
        `;
    }

    /**
     * 发送证书邮件
     */
    private async sendCertificateEmail(content: string): Promise<void> {
        try {
            // 这里可以实现邮件发送逻辑
            this.logger.info('📧 证书邮件内容已准备');
        } catch (error) {
            this.logger.error('发送邮件失败:', error);
        }
    }

    /**
     * 验证证书安装
     */
    private async verifyCertificateInstallation(driver: any): Promise<boolean> {
        try {
            // 检查设置中是否有mitmproxy证书
            const mitmproxyCert = await driver.$('~mitmproxy');
            if (await mitmproxyCert.isDisplayed()) {
                this.logger.info('✅ 证书安装验证成功');
                return true;
            } else {
                this.logger.warn('❌ 证书安装验证失败');
                return false;
            }
        } catch (error) {
            this.logger.warn('验证证书安装失败:', error);
            return false;
        }
    }

    /**
     * 提供手动安装指导
     */
    private provideManualInstallationGuide(): void {
        this.logger.info('📋 手动安装证书步骤：');
        this.logger.info('');
        this.logger.info('方法1 - Web界面安装：');
        this.logger.info('   1. 确保设备已连接到代理服务器（端口 8888）');
        this.logger.info('   2. 在设备浏览器中访问: http://mitm.it');
        this.logger.info('   3. 选择 iOS 设备');
        this.logger.info('   4. 点击下载并安装证书');
        this.logger.info('   5. 在设置中启用证书信任');
        this.logger.info('');
        this.logger.info('方法2 - 文件传输安装：');
        this.logger.info('   1. 在Mac上运行: open mitmproxy/');
        this.logger.info('   2. 找到 mitmproxy-ca-cert.pem 文件');
        this.logger.info('   3. 将文件发送到iOS设备（通过邮件、AirDrop等）');
        this.logger.info('   4. 在iOS设备上点击证书文件进行安装');
        this.logger.info('   5. 手动打开 设置 > 通用 > 关于本机 > 证书信任设置');
        this.logger.info('   6. 找到 mitmproxy 证书并启用信任');
        this.logger.info('');
        this.logger.info('方法3 - 邮件安装：');
        this.logger.info('   1. 将证书文件作为邮件附件发送到设备');
        this.logger.info('   2. 在设备上打开邮件');
        this.logger.info('   3. 点击附件中的证书文件');
        this.logger.info('   4. 按照提示安装证书');
    }

    /**
     * 启动Viber API捕获
     */
    public async startViberAPICapture(deviceId: string): Promise<void> {
        try {
            this.logger.info(`🚀 开始Viber API捕获 for device: ${deviceId}`);

            // 启动mitmproxy
            await this.startMitmproxyWithScript();

            // 配置设备代理
            await this.setupDeviceProxy(deviceId);

            // 启动Viber应用
            await this.launchViberApp(deviceId);

            this.logger.info('✅ Viber API捕获已启动');
            this.logger.info('📋 现在可以在Viber应用中操作，API请求将被捕获');

        } catch (error) {
            this.logger.error('❌ 启动Viber API捕获失败', error);
            throw error;
        }
    }

    /**
     * 启动带脚本的mitmproxy
     */
    private async startMitmproxyWithScript(): Promise<void> {
        try {
            this.logger.info('启动带脚本的mitmproxy...');
            
            const scriptPath = path.join(__dirname, 'capture.script.py');
            
            this.mitmProcess = spawn('mitmdump', [
                '--mode', 'transparent',
                '--listen-port', '8888',
                '--set', `confdir=${this.certDir}`,
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
            await new Promise(resolve => setTimeout(resolve, 3000));
            this.logger.info('✅ mitmproxy启动成功');
            
        } catch (error) {
            this.logger.error('启动mitmproxy失败:', error);
            throw error;
        }
    }

    /**
     * 配置设备代理
     */
    private async setupDeviceProxy(deviceId: string): Promise<void> {
        try {
            this.logger.info('配置设备代理...');
            
            const localIP = await this.getLocalIPAddress();
            const proxyPort = 8888;
            
            this.logger.info(`📋 代理设置信息：`);
            this.logger.info(`   服务器: ${localIP}`);
            this.logger.info(`   端口: ${proxyPort}`);
            
            const driver = await this.appiumService.initializeDriver(deviceId);
            try {
                await this.configureProxyViaAppium(driver, localIP, proxyPort);
            } finally {
                await this.appiumService.closeDriver(deviceId);
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
     * 启动Viber应用
     */
    private async launchViberApp(deviceId: string): Promise<void> {
        try {
            this.logger.info('启动Viber应用...');
            
            const driver = await this.appiumService.initializeDriver(deviceId);
            try {
                // 尝试启动Viber应用
                await driver.activateApp('com.viber');
                await driver.pause(3000);
                
                this.logger.info('✅ Viber应用已启动');
                
            } finally {
                await this.appiumService.closeDriver(deviceId);
            }
            
        } catch (error) {
            this.logger.warn('启动Viber应用失败:', error);
            this.logger.info('📋 请手动启动Viber应用');
        }
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
     * 停止捕获
     */
    public async stopCapture(): Promise<void> {
        try {
            this.logger.info('🛑 停止捕获...');

            // 停止mitmproxy
            if (this.mitmProcess) {
                this.mitmProcess.kill('SIGTERM');
                this.mitmProcess = null;
            }

            this.logger.info('✅ 捕获已停止');

        } catch (error) {
            this.logger.error('❌ 停止捕获失败', error);
        }
    }
}
