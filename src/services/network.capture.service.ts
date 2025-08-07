import { Logger } from '../utils/logger';
import { ApiResponse } from '../types';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CaptureScriptService } from '../scripts/capture.service';

export class NetworkCaptureService {
    private logger: Logger;
    private captureProcesses: Map<string, ChildProcess> = new Map();
    private capturedResponses: Map<string, ApiResponse[]> = new Map();
    private captureServices: Map<string, CaptureScriptService> = new Map();

    constructor() {
        this.logger = new Logger('NetworkCaptureService');
    }

    public async startCapture(deviceId: string): Promise<void> {
        try {
            this.logger.info(`Starting mitmproxy network capture for device: ${deviceId}`);
            this.capturedResponses.set(deviceId, []);
            const captureService = new CaptureScriptService();
            this.captureServices.set(deviceId, captureService);
            await captureService.startMitmproxyCapture(8888);
            await this.waitForMitmproxyReady();
            this.logger.info(`Mitmproxy network capture started for device: ${deviceId}`);
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
            }
            const captureService = this.captureServices.get(deviceId);
            if (captureService) {
                await captureService.stopMitmproxyCapture();
                this.captureServices.delete(deviceId);
            }
            this.logger.info(`Mitmproxy network capture stopped for device: ${deviceId}`);
        } catch (error) {
            this.logger.error(`Error stopping network capture for device: ${deviceId}`, error);
        }
    }

    private async waitForMitmproxyReady(): Promise<void> {
        return new Promise((resolve) => {
        setTimeout(resolve, 3000);
        });
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
} 