import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from './src/utils/logger';

const execAsync = promisify(exec);
const logger = new Logger('DeviceSetup');

async function setupDevice() {
    try {
        logger.info('Setting up iOS device for Appium...');
        
        // Check if Xcode is installed
        try {
            await execAsync('xcode-select --print-path');
            logger.info('Xcode is installed');
        } catch (error) {
            logger.error('Xcode is not installed. Please install Xcode from the App Store.');
            return;
        }
        
        // List available devices
        logger.info('Available iOS devices:');
        const { stdout: devicesOutput } = await execAsync('xcrun devicectl list devices');
        console.log(devicesOutput);
        
        // Check if WebDriverAgent is installed
        logger.info('Checking WebDriverAgent installation...');
        try {
            await execAsync('xcrun devicectl list devices --json');
            logger.info('WebDriverAgent should be automatically installed by Appium');
        } catch (error) {
            logger.warn('Could not check WebDriverAgent status');
        }
        
        logger.info('\n=== Device Setup Instructions ===');
        logger.info('1. Connect your iOS device via USB');
        logger.info('2. Unlock the device and trust this computer');
        logger.info('3. Open Xcode and go to Window > Devices and Simulators');
        logger.info('4. Select your device and click "Pair" if not already paired');
        logger.info('5. Make sure the device shows as "Available" in the list above');
        logger.info('6. Run this script again to test the connection');
        
        // Test if we can access the device
        logger.info('\nTesting device accessibility...');
        const { stdout: deviceInfo } = await execAsync('xcrun devicectl list devices --json');
        const devices = JSON.parse(deviceInfo);
        
        const availableDevices = devices.devices?.filter((d: any) => 
            d.state === 'available' && d.deviceType === 'iPhone'
        ) || [];
        
        if (availableDevices.length > 0) {
            logger.info(`Found ${availableDevices.length} available iPhone(s):`);
            availableDevices.forEach((device: any) => {
                logger.info(`- ${device.name} (${device.identifier})`);
            });
        } else {
            logger.error('No available iPhone devices found. Please:');
            logger.error('1. Connect an iPhone via USB');
            logger.error('2. Unlock the device');
            logger.error('3. Trust this computer when prompted');
            logger.error('4. Run this script again');
        }
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Setup failed:', errorMessage);
    }
}

if (require.main === module) {
    setupDevice().catch(error => {
        logger.error(`Setup failed: ${error.message}`);
        process.exit(1);
    });
} 