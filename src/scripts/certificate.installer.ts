#!/usr/bin/env ts-node

import { NetworkCaptureService } from '../services/network.capture.service';
import { Logger } from '../utils/logger';

export class CertificateInstaller {
    private networkCapture: NetworkCaptureService;
    private logger: Logger;

    constructor() {
        this.networkCapture = new NetworkCaptureService();
        this.logger = new Logger('CertificateInstaller');
    }

    /**
     * 安装证书到指定设备
     */
    public async installCertificate(deviceId: string, forceReinstall: boolean = false, existingDriver?: WebdriverIO.Browser): Promise<void> {
        try {
            this.logger.info(`=== 开始安装mitmproxy证书到设备: ${deviceId} ===`);
            if (forceReinstall) {
                this.logger.info('🔄 强制重新安装模式');
            } else {
                const isAlreadyInstalled = await this.networkCapture.verifyCertificateInstallation(deviceId);
                if (isAlreadyInstalled) {
                    this.logger.info('✅ 证书已安装，跳过安装步骤');
                    this.logger.info('📋 如需重新安装，请使用 forceReinstall=true 参数');
                    return;
                }
            }
            await this.networkCapture.installMitmproxyCertificate(deviceId, existingDriver);
            const isInstalled = await this.networkCapture.verifyCertificateInstallation(deviceId);
            if (isInstalled) {
                this.logger.info('✅ 证书安装成功！');
                this.logger.info('📋 下一步操作：');
                this.logger.info('   1. 在iOS设备上打开 设置 > 通用 > 关于本机 > 证书信任设置');
                this.logger.info('   2. 找到 "mitmproxy" 证书并启用信任');
                this.logger.info('   3. 重启设备以确保证书生效');
            } else {
                this.logger.warn('⚠️  证书安装可能未完成，请手动检查');
                this.logger.info('📋 手动安装步骤：');
                this.logger.info('   1. 在Mac上运行: open ~/.mitmproxy/');
                this.logger.info('   2. 将 mitmproxy-ca-cert.pem 文件发送到iOS设备');
                this.logger.info('   3. 在iOS设备上点击证书文件进行安装');
                this.logger.info('   4. 在设置中启用证书信任');
            }
        } catch (error) {
            this.logger.error('❌ 证书安装失败:', error);
            throw error;
        }
    }

    /**
     * 强制重新安装证书
     */
    public async reinstallCertificate(deviceId: string): Promise<void> {
        return await this.installCertificate(deviceId, true);
    }

    /**
     * 批量安装证书到多个设备
     */
    public async installCertificateToMultipleDevices(deviceIds: string[]): Promise<void> {
        this.logger.info(`=== 批量安装证书到 ${deviceIds.length} 个设备 ===`);
        for (const deviceId of deviceIds) {
            try {
                await this.installCertificate(deviceId);
                this.logger.info(`✅ 设备 ${deviceId} 证书安装完成`);
            } catch (error) {
                this.logger.error(`❌ 设备 ${deviceId} 证书安装失败:`, error);
            }
        }
    }

    /**
     * 验证所有设备的证书安装状态
     */
    public async verifyAllDevices(deviceIds: string[]): Promise<Map<string, boolean>> {
        const results = new Map<string, boolean>();
        for (const deviceId of deviceIds) {
            try {
                const isInstalled = await this.networkCapture.verifyCertificateInstallation(deviceId);
                results.set(deviceId, isInstalled);
                this.logger.info(`设备 ${deviceId}: ${isInstalled ? '✅ 已安装' : '❌ 未安装'}`);
            } catch (error) {
                results.set(deviceId, false);
                this.logger.error(`设备 ${deviceId} 验证失败:`, error);
            }
        }
        return results;
    }

    /**
     * 显示安装说明
     */
    public showInstallationInstructions(): void {
        this.logger.info('=== mitmproxy证书安装说明 ===');
        this.logger.info('');
        this.logger.info('📱 iOS设备要求：');
        this.logger.info('   - iOS 12.0 或更高版本');
        this.logger.info('   - 设备已连接到Mac');
        this.logger.info('   - 已在Xcode中信任设备');
        this.logger.info('');
        this.logger.info('🔧 前置条件：');
        this.logger.info('   - 已安装mitmproxy: brew install mitmproxy');
        this.logger.info('   - 已安装Appium: npm install -g appium');
        this.logger.info('   - Appium服务器正在运行');
        this.logger.info('');
        this.logger.info('🚀 使用方法：');
        this.logger.info('   const installer = new CertificateInstaller();');
        this.logger.info('   await installer.installCertificate("设备ID");');
        this.logger.info('');
        this.logger.info('⚠️  注意事项：');
        this.logger.info('   - 安装后需要在iOS设置中手动启用证书信任');
        this.logger.info('   - 某些iOS版本可能需要重启设备');
        this.logger.info('   - 企业证书可能需要额外的配置');
    }
}

if (require.main === module) {
    const installer = new CertificateInstaller();
    installer.showInstallationInstructions();
    const deviceId = process.argv[2];
    const forceReinstall = process.argv.includes('--force') || process.argv.includes('-f');
    if (deviceId) {
        if (forceReinstall) {
            console.log('🔄 强制重新安装模式');
        }
        installer.installCertificate(deviceId, forceReinstall)
            .then(() => {
                console.log('证书安装完成');
                process.exit(0);
            })
            .catch((error) => {
                console.error('证书安装失败:', error);
                process.exit(1);
            });
    } else {
        console.log('使用方法:');
        console.log('  ts-node certificate.installer.ts <设备ID>');
        console.log('  ts-node certificate.installer.ts <设备ID> --force');
        console.log('');
        console.log('示例:');
        console.log('  ts-node certificate.installer.ts 00008101-00026C982160001E');
        console.log('  ts-node certificate.installer.ts 00008101-00026C982160001E --force');
        console.log('');
        console.log('参数说明:');
        console.log('  --force, -f    强制重新安装证书（即使已安装）');
    }
}