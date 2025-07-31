import { Logger } from '../utils/logger';
import { ApiResponse } from '../types';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export class NetworkCaptureService {
  private logger: Logger;
  private captureProcesses: Map<string, ChildProcess> = new Map();
  private capturedResponses: Map<string, ApiResponse[]> = new Map();

  constructor() {
    this.logger = new Logger('NetworkCaptureService');
  }

  public async startCapture(deviceId: string): Promise<void> {
    try {
      this.logger.info(`Starting network capture for device: ${deviceId}`);
      
      // 清空之前的捕获数据
      this.capturedResponses.set(deviceId, []);

      // 使用mitmproxy进行网络抓包
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

      this.captureProcesses.set(deviceId, mitmProcess);

      // 等待mitmproxy启动
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
        
        // 检查是否有Viber相关的API响应
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
      setTimeout(resolve, 3000); // 等待3秒让mitmproxy启动
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
} 