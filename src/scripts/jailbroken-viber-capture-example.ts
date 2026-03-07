import { JailbrokenIOSViberCapture, JailbrokenViberCaptureConfig } from './jailbroken-ios-viber-capture';
import { Logger } from '../utils/logger';

const logger = new Logger('JailbrokenViberCaptureExample');

/**
 * 越狱手机 Viber 网络捕获使用示例
 * 
 * 这个示例展示了如何在越狱手机上使用 Appium 对 Viber 进行自动化测试时抓取网络请求数据
 */
export class JailbrokenViberCaptureExample {
    
    /**
     * 基本使用示例
     */
    public static async basicExample(): Promise<void> {
        try {
            logger.info('🚀 开始越狱手机 Viber 网络捕获示例');
            
            // 配置捕获参数
            const config: JailbrokenViberCaptureConfig = {
                deviceId: '00008101-00026C982160001E', // 替换为你的设备 ID
                proxyPort: 8888,
                captureAllTraffic: false,
                enableSSLInspection: true,
                logLevel: 'info',
                autoInstallCertificate: true,
                captureTimeout: 300000, // 5 分钟
                useJailbreakFeatures: true,
                bypassSSLVerification: true
            };
            
            // 创建捕获实例
            const capture = new JailbrokenIOSViberCapture(config);
            
            // 启动捕获
            await capture.startCapture();
            
            // 等待一段时间让用户操作 Viber
            logger.info('⏳ 等待用户操作 Viber 应用...');
            await new Promise(resolve => setTimeout(resolve, 60000)); // 等待 1 分钟
            
            // 获取捕获的响应
            const responses = capture.getCapturedResponses();
            const viberResponses = capture.getViberAPIResponses();
            
            logger.info(`📊 捕获统计：`);
            logger.info(`   总响应数: ${responses.length}`);
            logger.info(`   Viber API 响应数: ${viberResponses.length}`);
            
            // 显示 Viber API 响应
            if (viberResponses.length > 0) {
                logger.info('📡 Viber API 响应详情：');
                viberResponses.forEach((response, index) => {
                    logger.info(`   ${index + 1}. ${response.method} ${response.url} (${response.statusCode})`);
                    if (response.requestBody) {
                        logger.info(`      请求体: ${response.requestBody.substring(0, 100)}...`);
                    }
                    if (response.responseBody) {
                        logger.info(`      响应体: ${response.responseBody.substring(0, 100)}...`);
                    }
                });
            }
            
            // 停止捕获
            await capture.stopCapture();
            
            logger.info('✅ 越狱手机 Viber 网络捕获示例完成');
            
        } catch (error) {
            logger.error('❌ 越狱手机 Viber 网络捕获示例失败', error);
        }
    }
    
    /**
     * 高级使用示例 - 自定义配置
     */
    public static async advancedExample(): Promise<void> {
        try {
            logger.info('🚀 开始高级越狱手机 Viber 网络捕获示例');
            
            // 高级配置
            const config: JailbrokenViberCaptureConfig = {
                deviceId: '00008101-00026C982160001E', // 替换为你的设备 ID
                proxyPort: 8889, // 使用不同的端口
                captureAllTraffic: true, // 捕获所有流量
                enableSSLInspection: true,
                logLevel: 'debug',
                autoInstallCertificate: true,
                captureTimeout: 600000, // 10 分钟
                useJailbreakFeatures: true,
                bypassSSLVerification: true
            };
            
            const capture = new JailbrokenIOSViberCapture(config);
            
            // 启动捕获
            await capture.startCapture();
            
            // 监控捕获状态
            const monitorInterval = setInterval(() => {
                const stats = capture.getCaptureStats();
                logger.info(`📊 实时统计: 总响应=${stats.totalResponses}, Viber响应=${stats.viberResponses}, 正在捕获=${stats.isCapturing}`);
                
                if (!stats.isCapturing) {
                    clearInterval(monitorInterval);
                }
            }, 10000); // 每 10 秒检查一次
            
            // 等待捕获完成
            await new Promise(resolve => setTimeout(resolve, 300000)); // 等待 5 分钟
            
            clearInterval(monitorInterval);
            
            // 获取最终统计
            const finalStats = capture.getCaptureStats();
            logger.info(`📊 最终统计: 总响应=${finalStats.totalResponses}, Viber响应=${finalStats.viberResponses}`);
            
            // 停止捕获
            await capture.stopCapture();
            
            logger.info('✅ 高级越狱手机 Viber 网络捕获示例完成');
            
        } catch (error) {
            logger.error('❌ 高级越狱手机 Viber 网络捕获示例失败', error);
        }
    }
    
    /**
     * 错误处理示例
     */
    public static async errorHandlingExample(): Promise<void> {
        try {
            logger.info('🚀 开始错误处理示例');
            
            const config: JailbrokenViberCaptureConfig = {
                deviceId: 'invalid-device-id', // 故意使用无效的设备 ID
                proxyPort: 8888,
                captureAllTraffic: false,
                enableSSLInspection: true,
                logLevel: 'info',
                autoInstallCertificate: true,
                captureTimeout: 300000,
                useJailbreakFeatures: true,
                bypassSSLVerification: true
            };
            
            const capture = new JailbrokenIOSViberCapture(config);
            
            try {
                await capture.startCapture();
            } catch (error) {
                logger.warn('预期的错误被捕获:', error);
                logger.info('📋 这是正常的错误处理示例');
            }
            
            logger.info('✅ 错误处理示例完成');
            
        } catch (error) {
            logger.error('❌ 错误处理示例失败', error);
        }
    }
}

/**
 * 主函数 - 运行示例
 */
async function main() {
    try {
        logger.info('🎯 越狱手机 Viber 网络捕获示例程序');
        
        // 运行基本示例
        await JailbrokenViberCaptureExample.basicExample();
        
        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 运行高级示例
        await JailbrokenViberCaptureExample.advancedExample();
        
        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 运行错误处理示例
        await JailbrokenViberCaptureExample.errorHandlingExample();
        
        logger.info('🎉 所有示例运行完成');
        
    } catch (error) {
        logger.error('❌ 示例程序运行失败', error);
    }
}

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
    main().catch(console.error);
}

export default JailbrokenViberCaptureExample;




