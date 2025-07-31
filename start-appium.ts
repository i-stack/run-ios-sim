#!/usr/bin/env ts-node

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('🚀 Appium服务器启动脚本');
console.log('=====================');

class AppiumServer {
    private process: ChildProcess | null = null;
    private logFile: string = 'appium.log';

    constructor() {
        this.checkPrerequisites();
    }

    private async checkPrerequisites(): Promise<void> {
        console.log('📋 检查前置条件...');

        // 检查Appium是否安装
        try {
            const { execSync } = require('child_process');
            const version = execSync('appium --version', { encoding: 'utf8' }).trim();
            console.log(`✅ Appium已安装，版本: ${version}`);
        } catch (error) {
            console.log('❌ Appium未安装，正在安装...');
            this.installAppium();
        }

        // 检查iOS驱动
        try {
            const { execSync } = require('child_process');
            const drivers = execSync('appium driver list --installed', { encoding: 'utf8' });
            if (drivers.includes('xcuitest')) {
                console.log('✅ iOS驱动已安装');
            } else {
                console.log('📱 安装iOS驱动...');
                this.installIOSDriver();
            }
        } catch (error) {
            console.log('📱 安装iOS驱动...');
            this.installIOSDriver();
        }

        // 检查端口占用
        this.checkPortAvailability();
    }

    private installAppium(): void {
        try {
            const { execSync } = require('child_process');
            console.log('📦 安装Appium...');
            execSync('npm install -g appium', { stdio: 'inherit' });
            console.log('✅ Appium安装完成');
        } catch (error) {
            console.error('❌ Appium安装失败:', error);
            process.exit(1);
        }
    }

    private installIOSDriver(): void {
        try {
            const { execSync } = require('child_process');
            console.log('📱 安装iOS驱动...');
            execSync('appium driver install xcuitest', { stdio: 'inherit' });
            console.log('✅ iOS驱动安装完成');
        } catch (error) {
            console.error('❌ iOS驱动安装失败:', error);
            process.exit(1);
        }
    }

    private checkPortAvailability(): void {
        try {
            const { execSync } = require('child_process');
            const result = execSync('netstat -an | findstr :4723', { encoding: 'utf8' });
            if (result.trim()) {
                console.log('⚠️  端口4723已被占用，正在停止占用进程...');
                this.killProcessOnPort(4723);
            }
        } catch (error) {
            // 端口未被占用，这是正常情况
        }
    }

    private killProcessOnPort(port: number): void {
        try {
            const { execSync } = require('child_process');
            const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
            const lines = result.split('\n');
            for (const line of lines) {
                if (line.includes(`:${port}`)) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && !isNaN(Number(pid))) {
                        console.log(`🔪 杀死进程 PID: ${pid}`);
                        execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' });
                    }
                }
            }
        } catch (error) {
            console.log('⚠️  无法停止占用进程，请手动检查');
        }
    }

    public start(): void {
        console.log('🚀 启动Appium服务器...');
        console.log('📍 服务器地址: http://localhost:4723');
        console.log('📝 日志文件:', this.logFile);
        console.log('');

        // 创建日志目录
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        // 启动Appium服务器
        this.process = spawn('appium', [
            '--port', '4723',
            '--host', '0.0.0.0',
            '--log', this.logFile,
            '--local-timezone',
            '--allow-insecure', 'chromedriver_autodownload'
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // 处理输出
        this.process.stdout?.on('data', (data) => {
            console.log(`[Appium] ${data.toString().trim()}`);
        });

        this.process.stderr?.on('data', (data) => {
            console.error(`[Appium Error] ${data.toString().trim()}`);
        });

        this.process.on('close', (code) => {
            console.log(`Appium服务器已停止，退出码: ${code}`);
        });

        this.process.on('error', (error) => {
            console.error('Appium启动失败:', error);
        });

        // 处理进程退出信号
        process.on('SIGINT', () => {
            console.log('\n🛑 收到停止信号，正在关闭Appium服务器...');
            this.stop();
        });

        process.on('SIGTERM', () => {
            console.log('\n🛑 收到终止信号，正在关闭Appium服务器...');
            this.stop();
        });

        console.log('✅ Appium服务器已启动');
        console.log('按Ctrl+C停止服务器');
    }

    public stop(): void {
        if (this.process) {
            this.process.kill('SIGTERM');
            console.log('✅ Appium服务器已停止');
        }
        process.exit(0);
    }

    public getStatus(): boolean {
        return this.process !== null && !this.process.killed;
    }
}

// 启动Appium服务器
const appiumServer = new AppiumServer();
appiumServer.start(); 