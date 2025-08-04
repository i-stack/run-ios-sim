import { spawn } from 'child_process';
import { Logger } from './src/utils/logger';

const logger = new Logger('AppiumStarter');

export async function startAppiumServer(port: number = 4723): Promise<void> {
    return new Promise((resolve, reject) => {
        logger.info(`Starting Appium server on port ${port}...`);
        
        const appium = spawn('appium', [
            '--port', port.toString(),
            '--log-level', 'info'
        ], {
            stdio: 'pipe'
        });

        appium.stdout?.on('data', (data) => {
            const output = data.toString();
            logger.info(`Appium: ${output.trim()}`);
            
            // Check if Appium is ready
            if (output.includes('Appium REST http interface listener started') || output.includes('Appium v')) {
                logger.info('Appium server started successfully!');
                resolve();
            }
        });

        appium.stderr?.on('data', (data) => {
            const error = data.toString();
            logger.error(`Appium error: ${error.trim()}`);
        });

        appium.on('error', (error) => {
            logger.error(`Failed to start Appium: ${error.message}`);
            reject(error);
        });

        appium.on('close', (code) => {
            if (code !== 0) {
                logger.error(`Appium process exited with code ${code}`);
                reject(new Error(`Appium process exited with code ${code}`));
            }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            appium.kill();
            reject(new Error('Appium server startup timeout'));
        }, 30000);
    });
}

// If run directly
if (require.main === module) {
    const port = parseInt(process.argv[2]) || 4723;
    startAppiumServer(port).catch(error => {
        logger.error(`Failed to start Appium server: ${error.message}`);
        process.exit(1);
    });
} 