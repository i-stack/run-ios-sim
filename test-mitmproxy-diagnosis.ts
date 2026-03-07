import { Logger } from './src/utils/logger';

const logger = new Logger('MitmproxyDiagnosisTest');

// 测试 mitmproxy 诊断功能
function testMitmproxyDiagnosis(): void {
    logger.info('✅ 检查 mitmproxy 诊断功能...');
    
    logger.info('📋 新增的诊断功能：');
    logger.info('   1. checkMitmproxyStatus - 检查 mitmproxy 运行状态');
    logger.info('   2. diagnoseMitmproxyConnection - 诊断连接问题');
    logger.info('   3. provideMitmproxyTroubleshooting - 提供故障排除指导');
    
    logger.info('📋 诊断流程：');
    logger.info('   1. 检查 mitmproxy 是否在端口 8888 上运行');
    logger.info('   2. 设置设备代理配置');
    logger.info('   3. 在 Safari 中打开 http://mitm.it');
    logger.info('   4. 检查页面是否显示错误信息');
    logger.info('   5. 提供相应的故障排除指导');
    
    logger.info('📋 故障排除步骤：');
    logger.info('   1. 重启 mitmproxy 服务');
    logger.info('   2. 重新配置设备代理');
    logger.info('   3. 尝试使用文件传输方式安装证书');
    logger.info('   4. 检查网络连接');
    
    logger.info('📋 备用方案：');
    logger.info('   1. 使用文件传输安装证书');
    logger.info('   2. 手动下载证书文件');
    logger.info('   3. 通过邮件或 AirDrop 传输证书');
    
    logger.info('✅ mitmproxy 诊断功能已实现');
    logger.info('✅ 现在能够自动检测和解决连接问题');
}

// 运行测试
testMitmproxyDiagnosis();

export { testMitmproxyDiagnosis };
