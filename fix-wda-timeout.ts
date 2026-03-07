#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from './src/utils/logger';

const execAsync = promisify(exec);
const logger = new Logger('WDATimeoutFixer');

interface WDADiagnostic {
    isRunning: boolean;
    processes: string[];
    derivedDataExists: boolean;
    deviceConnected: boolean;
    xcodeVersion: string;
}

class WDATimeoutFixer {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('WDATimeoutFixer');
    }

    async diagnoseWDA(): Promise<WDADiagnostic> {
        const diagnostic: WDADiagnostic = {
            isRunning: false,
            processes: [],
            derivedDataExists: false,
            deviceConnected: false,
            xcodeVersion: ''
        };

        try {
            // Check if WDA processes are running
            const { stdout: processesOutput } = await execAsync('ps aux | grep -i webdriveragent | grep -v grep');
            diagnostic.processes = processesOutput.split('\n').filter(line => line.trim());
            diagnostic.isRunning = diagnostic.processes.length > 0;

            // Check derived data directory
            const { stdout: derivedDataOutput } = await execAsync('ls -la /tmp/WebDriverAgent 2>/dev/null || echo "not found"');
            diagnostic.derivedDataExists = !derivedDataOutput.includes('not found');

            // Check device connection
            const { stdout: deviceOutput } = await execAsync('xcrun devicectl list devices --json-output /tmp/devices_wda.json');
            const fs = require('fs');
            if (fs.existsSync('/tmp/devices_wda.json')) {
                const deviceData = JSON.parse(fs.readFileSync('/tmp/devices_wda.json', 'utf8'));
                diagnostic.deviceConnected = deviceData.result.devices.some((device: any) => 
                    device.hardwareProperties.productType.includes('iPhone')
                );
                fs.unlinkSync('/tmp/devices_wda.json');
            }

            // Get Xcode version
            const { stdout: xcodeVersion } = await execAsync('xcodebuild -version');
            diagnostic.xcodeVersion = xcodeVersion.split('\n')[0];

        } catch (error) {
            this.logger.error('Error during WDA diagnosis:', error);
        }

        return diagnostic;
    }

    async killWDAProcesses(): Promise<void> {
        try {
            this.logger.info('Killing existing WebDriverAgent processes...');
            await execAsync('pkill -f WebDriverAgent');
            await execAsync('pkill -f XCUITest');
            await execAsync('pkill -f "xcodebuild.*WebDriverAgent"');
            this.logger.info('✅ WebDriverAgent processes killed');
        } catch (error) {
            this.logger.warn('No WebDriverAgent processes found to kill');
        }
    }

    async clearDerivedData(): Promise<void> {
        try {
            this.logger.info('Clearing WebDriverAgent derived data...');
            await execAsync('rm -rf /tmp/WebDriverAgent');
            await execAsync('rm -rf ~/Library/Developer/Xcode/DerivedData/WebDriverAgent*');
            this.logger.info('✅ Derived data cleared');
        } catch (error) {
            this.logger.error('Error clearing derived data:', error);
        }
    }

    async checkDeviceTrust(): Promise<void> {
        try {
            this.logger.info('Checking device trust status...');
            const { stdout } = await execAsync('xcrun devicectl list devices --json-output /tmp/devices_trust.json');
            const fs = require('fs');
            
            if (fs.existsSync('/tmp/devices_trust.json')) {
                const deviceData = JSON.parse(fs.readFileSync('/tmp/devices_trust.json', 'utf8'));
                const devices = deviceData.result.devices.filter((device: any) => 
                    device.hardwareProperties.productType.includes('iPhone')
                );
                
                devices.forEach((device: any) => {
                    this.logger.info(`Device: ${device.deviceProperties.name}`);
                    this.logger.info(`  UDID: ${device.hardwareProperties.udid}`);
                    this.logger.info(`  State: ${device.state}`);
                    this.logger.info(`  Trust Status: ${device.deviceProperties.trustState || 'Unknown'}`);
                });
                
                fs.unlinkSync('/tmp/devices_trust.json');
            }
        } catch (error) {
            this.logger.error('Error checking device trust:', error);
        }
    }

    async buildWDA(): Promise<void> {
        try {
            this.logger.info('Building WebDriverAgent...');
            
            // Set environment variables for WDA build
            process.env.DERIVED_FILE_DIR = '/tmp/WebDriverAgent';
            process.env.SHARED_PRECOMPS_DIR = '/tmp/WebDriverAgent';
            
            const buildCommand = [
                'xcodebuild',
                '-project', '/usr/local/lib/node_modules/appium/node_modules/appium-webdriveragent/WebDriverAgent.xcodeproj',
                '-scheme', 'WebDriverAgentRunner',
                '-destination', 'id=00008101-00026C982160001E', // Use the UDID from your error
                '-derivedDataPath', '/tmp/WebDriverAgent',
                'build-for-testing',
                'test-without-building'
            ].join(' ');
            
            this.logger.info(`Running: ${buildCommand}`);
            const { stdout, stderr } = await execAsync(buildCommand, { timeout: 300000 }); // 5 minute timeout
            
            this.logger.info('✅ WebDriverAgent build completed');
            this.logger.info('Build output:', stdout);
            
            if (stderr) {
                this.logger.warn('Build warnings:', stderr);
            }
        } catch (error) {
            this.logger.error('WebDriverAgent build failed:', error);
            throw error;
        }
    }

    async suggestFixes(diagnostic: WDADiagnostic): Promise<void> {
        this.logger.info('=== Suggested Fixes ===');
        
        if (!diagnostic.deviceConnected) {
            this.logger.info('❌ No iOS device connected');
            this.logger.info('💡 Fix: Connect device via USB and ensure it\'s unlocked');
        }
        
        if (diagnostic.isRunning) {
            this.logger.info('⚠️  WebDriverAgent processes are running');
            this.logger.info('💡 Fix: Kill existing processes before retrying');
        }
        
        if (!diagnostic.derivedDataExists) {
            this.logger.info('⚠️  No WebDriverAgent derived data found');
            this.logger.info('💡 Fix: This is normal for first run, will be created automatically');
        }
        
        this.logger.info('');
        this.logger.info('🔧 Recommended Actions:');
        this.logger.info('1. Kill existing WDA processes');
        this.logger.info('2. Clear derived data');
        this.logger.info('3. Check device trust settings');
        this.logger.info('4. Restart Appium server');
        this.logger.info('5. Try session creation again');
    }

    async performFullFix(): Promise<void> {
        this.logger.info('🔧 Starting full WDA timeout fix...');
        
        // Step 1: Diagnose current state
        this.logger.info('=== Step 1: Diagnosis ===');
        const diagnostic = await this.diagnoseWDA();
        this.logger.info(`WDA Running: ${diagnostic.isRunning}`);
        this.logger.info(`Device Connected: ${diagnostic.deviceConnected}`);
        this.logger.info(`Derived Data Exists: ${diagnostic.derivedDataExists}`);
        this.logger.info(`Xcode Version: ${diagnostic.xcodeVersion}`);
        
        // Step 2: Kill existing processes
        this.logger.info('=== Step 2: Kill Processes ===');
        await this.killWDAProcesses();
        
        // Step 3: Clear derived data
        this.logger.info('=== Step 3: Clear Derived Data ===');
        await this.clearDerivedData();
        
        // Step 4: Check device trust
        this.logger.info('=== Step 4: Check Device Trust ===');
        await this.checkDeviceTrust();
        
        // Step 5: Suggest additional fixes
        this.logger.info('=== Step 5: Additional Fixes ===');
        await this.suggestFixes(diagnostic);
        
        this.logger.info('');
        this.logger.info('✅ Full WDA timeout fix completed!');
        this.logger.info('💡 Next steps:');
        this.logger.info('1. Restart Appium server: npm run start-appium');
        this.logger.info('2. Test connection: npm run test-connection');
        this.logger.info('3. If issues persist, check device trust settings in iOS Settings');
    }
}

async function main() {
    const fixer = new WDATimeoutFixer();
    
    try {
        await fixer.performFullFix();
    } catch (error) {
        logger.error('WDA timeout fix failed:', error);
        process.exit(1);
    }
}

// Run the fixer
if (require.main === module) {
    main().catch(error => {
        logger.error('Fix failed:', error);
        process.exit(1);
    });
}

export { WDATimeoutFixer };
