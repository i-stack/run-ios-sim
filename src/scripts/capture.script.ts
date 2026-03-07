import * as fs from 'fs';
import * as path from 'path';

interface ApiResponse {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    timestamp: string;
    statusCode: number;
}

class MitmproxyCaptureScript {
    private logDir: string;

    constructor() {
        this.logDir = path.join(process.cwd(), 'api-responses');
        this.ensureLogDirectory();
    }

    private ensureLogDirectory(): void {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * 处理HTTP请求
     */
    public request(flow: any): void {
        // 记录请求信息
        const request = flow.request;
        console.log(`[REQUEST] ${request.method} ${request.url}`);
        
        // 可以在这里添加请求过滤逻辑
        // 例如只捕获特定域名的请求
        if (this.shouldCaptureRequest(request)) {
            this.logRequest(request);
        }
    }

    /**
     * 处理HTTP响应
     */
    public response(flow: any): void {
        const request = flow.request;
        const response = flow.response;
        
        console.log(`[RESPONSE] ${response.status_code} ${request.method} ${request.url}`);
        
        // 只捕获特定类型的响应
        if (this.shouldCaptureResponse(request, response)) {
            this.captureResponse(request, response);
        }
    }

    /**
     * 判断是否应该捕获请求
     */
    private shouldCaptureRequest(request: any): boolean {
        // 过滤条件：只捕获Viber相关的API请求
        const viberDomains = [
            'api.viber.com',
            'api.viber.me',
            'api.viber.net',
            'viber.com',
            'viber.me'
        ];
        
        const url = request.url.toLowerCase();
        return viberDomains.some(domain => url.includes(domain));
    }

    /**
     * 判断是否应该捕获响应
     */
    private shouldCaptureResponse(request: any, response: any): boolean {
        // 只捕获成功的响应和特定的内容类型
        const contentType = response.headers.get('content-type', '');
        return response.status_code >= 200 && 
               response.status_code < 300 &&
               (contentType.includes('application/json') || 
                contentType.includes('text/plain'));
    }

    /**
     * 记录请求信息
     */
    private logRequest(request: any): void {
        const requestData = {
            method: request.method,
            url: request.url,
            headers: Object.fromEntries(request.headers.entries()),
            timestamp: new Date().toISOString()
        };
        
        console.log(`[CAPTURE] Request: ${JSON.stringify(requestData, null, 2)}`);
    }

    /**
     * 捕获并保存响应
     */
    private async captureResponse(request: any, response: any): Promise<void> {
        try {
            const responseBody = await this.getResponseBody(response);
            
            const apiResponse: ApiResponse = {
                url: request.url,
                method: request.method,
                headers: Object.fromEntries(response.headers.entries()),
                body: responseBody,
                timestamp: new Date().toISOString(),
                statusCode: response.status_code
            };

            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const urlHash = this.hashString(request.url);
            const filename = `${timestamp}_${urlHash}.json`;
            const filepath = path.join(this.logDir, filename);

            // 保存响应到文件
            fs.writeFileSync(filepath, JSON.stringify(apiResponse, null, 2));
            
            console.log(`[CAPTURE] Saved response to: ${filename}`);
            console.log(`[CAPTURE] URL: ${request.url}`);
            console.log(`[CAPTURE] Status: ${response.status_code}`);
            
        } catch (error) {
            console.error(`[ERROR] Failed to capture response: ${error}`);
        }
    }

    /**
     * 获取响应体内容
     */
    private async getResponseBody(response: any): Promise<string> {
        try {
            const content = response.content;
            if (content) {
                return content.toString('utf-8');
            }
            return '';
        } catch (error) {
            console.error(`[ERROR] Failed to get response body: ${error}`);
            return '';
        }
    }

    /**
     * 简单的字符串哈希函数
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
}

// 创建实例
const captureScript = new MitmproxyCaptureScript();

// 导出函数供mitmproxy调用
export function request(flow: any): void {
    captureScript.request(flow);
}

export function response(flow: any): void {
    captureScript.response(flow);
}

// 如果直接运行此脚本，显示使用说明
if (require.main === module) {
    console.log('This script is designed to be used with mitmproxy.');
    console.log('Usage: mitmdump --script capture.script.ts');
    console.log('Or: mitmdump --script capture.script.js');
}
