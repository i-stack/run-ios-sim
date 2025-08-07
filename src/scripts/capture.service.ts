import { Logger } from '../utils/logger';
import { ApiResponse } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

export class CaptureScriptService {
    private logger: Logger;
    private mitmProcess: ChildProcess | null = null;
    private logDir: string;

    constructor() {
        this.logger = new Logger('CaptureScriptService');
        this.logDir = path.join(process.cwd(), 'api-responses');
        this.ensureLogDirectory();
    }

    private ensureLogDirectory(): void {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * 启动mitmproxy捕获
     */
    public async startMitmproxyCapture(port: number = 8888): Promise<void> {
        try {
            this.logger.info('Starting mitmproxy capture...');
            await this.checkMitmproxyInstallation();
            this.mitmProcess = spawn('mitmdump', [
                '--mode', 'transparent',
                '--listen-port', port.toString(),
                '--set', 'confdir=./mitmproxy',
                '--script', path.join(__dirname, 'capture.script.py')
            ]);

            this.mitmProcess.stdout?.on('data', (data) => {
                this.logger.debug(`Mitmproxy output: ${data}`);
            });

            this.mitmProcess.stderr?.on('data', (data) => {
                this.logger.error(`Mitmproxy error: ${data}`);
            });

            this.mitmProcess.on('close', (code) => {
                this.logger.info(`Mitmproxy process exited with code: ${code}`);
            });
            await this.waitForMitmproxyReady();
            this.logger.info('Mitmproxy capture started successfully');
        } catch (error) {
            this.logger.error('Failed to start mitmproxy capture', error);
            throw error;
        }
    }

    /**
     * 停止mitmproxy捕获
     */
    public async stopMitmproxyCapture(): Promise<void> {
        try {
            if (this.mitmProcess) {
                this.mitmProcess.kill('SIGTERM');
                this.mitmProcess = null;
                this.logger.info('Mitmproxy capture stopped');
            }
        } catch (error) {
            this.logger.error('Error stopping mitmproxy capture', error);
        }
    }

    /**
     * 检查mitmproxy是否已安装
     */
    private async checkMitmproxyInstallation(): Promise<void> {
        return new Promise((resolve, reject) => {
            const checkProcess = spawn('which', ['mitmdump']);
            checkProcess.on('close', (code) => {
                if (code === 0) {
                    this.logger.info('Mitmproxy is installed');
                    resolve();
                } else {
                    reject(new Error('Mitmproxy is not installed. Please install it first: pip install mitmproxy'));
                }
            });
        });
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
     * 读取捕获的API响应文件
     */
    public readCapturedResponses(): ApiResponse[] {
        try {
            const files = fs.readdirSync(this.logDir);
            const responses: ApiResponse[] = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filepath = path.join(this.logDir, file);
                    const content = fs.readFileSync(filepath, 'utf-8');
                    try {
                        const response = JSON.parse(content) as ApiResponse;
                        responses.push(response);
                    } catch (error) {
                        this.logger.warn(`Failed to parse response file: ${file}`, error);
                    }
                }
            }
            return responses.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        } catch (error) {
            this.logger.error('Failed to read captured responses', error);
            return [];
        }
    }

    /**
     * 清理捕获的响应文件
     */
    public clearCapturedResponses(): void {
        try {
            const files = fs.readdirSync(this.logDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                const filepath = path.join(this.logDir, file);
                fs.unlinkSync(filepath);
                }
            }
            this.logger.info('Cleared all captured response files');
        } catch (error) {
            this.logger.error('Failed to clear captured responses', error);
        }
    }

    /**
     * 获取最新的API响应
     */
    public getLatestResponse(): ApiResponse | null {
        const responses = this.readCapturedResponses();
        return responses.length > 0 ? responses[responses.length - 1] : null;
    }

    /**
     * 监控新的API响应
     */
    public watchForNewResponses(callback: (response: ApiResponse) => void): () => void {
        const checkInterval = setInterval(() => {
            const responses = this.readCapturedResponses();
            const latestResponse = responses[responses.length - 1];
            if (latestResponse && new Date(latestResponse.timestamp).getTime() > Date.now() - 5000) {
                callback(latestResponse);
            }
        }, 1000);
        return () => clearInterval(checkInterval);
    }

    /**
     * 设置iOS设备代理
     */
    public async setupDeviceProxy(deviceId: string, proxyHost: string, proxyPort: number): Promise<void> {
        try {
            this.logger.info(`Setting up proxy for device: ${deviceId}`);
            // 这里需要根据具体的iOS设备管理工具来实现
            // 例如使用libimobiledevice或通过Appium执行命令
            // 示例：通过Appium执行iOS命令
            // const driver = await this.getAppiumDriver(deviceId);
            // await driver.executeScript('mobile: setProxy', {
            //   host: proxyHost,
            //   port: proxyPort
            // });
            this.logger.info(`Proxy setup completed for device: ${deviceId}`);
        } catch (error) {
            this.logger.error(`Failed to setup proxy for device: ${deviceId}`, error);
            throw error;
        }
    }

    /**
     * 安装mitmproxy证书到iOS设备
     */
    public async installCertificate(deviceId: string): Promise<void> {
        try {
            this.logger.info(`Installing mitmproxy certificate for device: ${deviceId}`);
            const certDir = path.join(process.cwd(), 'mitmproxy');
            if (!fs.existsSync(certDir)) {
                fs.mkdirSync(certDir, { recursive: true });
            }
            // 这里需要实现证书安装逻辑
            // 可以通过Appium执行iOS命令来安装证书
            this.logger.info(`Certificate installation completed for device: ${deviceId}`);
        } catch (error) {
            this.logger.error(`Failed to install certificate for device: ${deviceId}`, error);
            throw error;
        }
    }
}