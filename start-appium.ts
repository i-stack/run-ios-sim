#!/usr/bin/env ts-node

import { spawn } from 'child_process';
import { Logger } from './src/utils/logger';

const logger = new Logger('AppiumStarter');

interface AppiumOptions {
    host?: string;
    port?: number;
    basePath?: string;
    logLevel?: string;
    relaxedSecurity?: boolean;
    allowInsecure?: string[];
    log?: string;
}

class AppiumStarter {
    private process: any = null;
    private options: AppiumOptions;

    constructor(options: AppiumOptions = {}) {
        this.options = {
            host: options.host || '0.0.0.0',
            port: options.port || 4723,
            basePath: options.basePath || '/',
            logLevel: options.logLevel || 'debug',
            relaxedSecurity: options.relaxedSecurity !== false,
            allowInsecure: options.allowInsecure || ['chromedriver_autodownload'],
            log: options.log || './logs/appium.log'
        };
    }

    public async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            const args = [
                '--base-path', this.options.basePath!,
                '--host', this.options.host!,
                '--port', this.options.port!.toString(),
                '--log-level', this.options.logLevel!,
                '--log', this.options.log!
            ];

            if (this.options.relaxedSecurity) {
                args.push('--relaxed-security');
            }

            if (this.options.allowInsecure && this.options.allowInsecure.length > 0) {
                args.push('--allow-insecure', this.options.allowInsecure.join(','));
            }

            // Add timeout-related arguments
            args.push(
                '--session-override',
                '--local-timezone',
                '--use-plugins', 'execute-driver'
            );

            logger.info(`Starting Appium server with arguments: ${args.join(' ')}`);
            logger.info(`Server will be available at: http://${this.options.host}:${this.options.port}`);

            this.process = spawn('appium', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            let isStarted = false;

            this.process.stdout?.on('data', (data: Buffer) => {
                const output = data.toString();
                logger.info(`[Appium] ${output.trim()}`);
                
                // Check if Appium has started successfully
                if (output.includes('Appium REST http interface listener started') && !isStarted) {
                    isStarted = true;
                    logger.info('✅ Appium server started successfully!');
                    logger.info(`🌐 Server URL: http://${this.options.host}:${this.options.port}`);
                    logger.info('📱 Ready to accept connections from iOS devices');
                    resolve();
                }
            });

            this.process.stderr?.on('data', (data: Buffer) => {
                const output = data.toString();
                logger.warn(`[Appium Error] ${output.trim()}`);
            });

            this.process.on('error', (error: Error) => {
                logger.error('Failed to start Appium:', error);
                reject(error);
            });

            this.process.on('exit', (code: number) => {
                if (code !== 0) {
                    logger.error(`Appium process exited with code ${code}`);
                    reject(new Error(`Appium process exited with code ${code}`));
                } else {
                    logger.info('Appium process stopped gracefully');
                }
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!isStarted) {
                    logger.error('Appium failed to start within 30 seconds');
                    this.stop();
                    reject(new Error('Appium startup timeout'));
                }
            }, 30000);
        });
    }

    public stop(): void {
        if (this.process) {
            logger.info('Stopping Appium server...');
            this.process.kill('SIGTERM');
            this.process = null;
        }
    }

    public isRunning(): boolean {
        return this.process !== null && !this.process.killed;
    }
}

async function main() {
    const starter = new AppiumStarter({
        host: '0.0.0.0',
        port: 4723,
        logLevel: 'debug',
        relaxedSecurity: true,
        allowInsecure: ['chromedriver_autodownload'],
        log: './logs/appium.log'
    });

    try {
        await starter.start();
        
        // Keep the process running
        process.on('SIGINT', () => {
            logger.info('Received SIGINT, stopping Appium...');
            starter.stop();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            logger.info('Received SIGTERM, stopping Appium...');
            starter.stop();
            process.exit(0);
        });

        logger.info('Appium server is running. Press Ctrl+C to stop.');
        
    } catch (error) {
        logger.error('Failed to start Appium:', error);
        process.exit(1);
    }
}

// Run the starter
if (require.main === module) {
    main().catch(error => {
        logger.error('Startup failed:', error);
        process.exit(1);
    });
}

export { AppiumStarter };
