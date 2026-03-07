# Appium Timeout Fixes Guide

This guide addresses common Appium timeout issues with XCUITest driver and provides solutions to improve connection stability.

## Common Timeout Issues

### 1. "Failed to receive any data within the timeout: 5000"
- **Cause**: Network connectivity issues or slow device response
- **Solution**: Increased timeout values and retry mechanisms

### 2. "timeout of 1000ms exceeded"
- **Cause**: WebDriverAgent initialization taking too long
- **Solution**: Extended launch timeout and improved WDA configuration

### 3. "Matched '/status' to command name 'getStatus'"
- **Cause**: Appium server not responding properly
- **Solution**: Enhanced server configuration and connection retry logic

## Applied Fixes

### 1. Increased Timeout Values

**Before:**
```typescript
'appium:newCommandTimeout': 180,
'appium:launchTimeout': 60000,
connectionRetryCount: 10,
connectionRetryTimeout: 60000,
waitforTimeout: 30000,
waitforInterval: 1000
```

**After:**
```typescript
'appium:newCommandTimeout': 300,        // 5 minutes
'appium:launchTimeout': 120000,         // 2 minutes
connectionRetryCount: 15,               // More retries
connectionRetryTimeout: 120000,         // 2 minutes
waitforTimeout: 60000,                  // 1 minute
waitforInterval: 2000                   // Longer intervals
```

### 2. Enhanced WebDriverAgent Configuration

Added these capabilities for better stability:
```typescript
'appium:useNewWDA': true,              // Use fresh WDA instance
'appium:usePrebuiltWDA': false,        // Build WDA from source
'appium:derivedDataPath': '/tmp/WebDriverAgent', // Custom build path
'appium:showXcodeLog': true,           // Enable Xcode logging
'appium:showIOSLog': true              // Enable iOS device logging
```

### 3. Improved Connection Management

- **Remote connections**: Enhanced retry logic with 15 attempts
- **Local connections**: Increased retry count to 10 attempts
- **Server health checks**: Added pre-connection validation

## Usage

### 1. Start Appium with Optimal Settings

```bash
# Use the optimized starter script
npm run start-appium

# Or manually with these arguments
appium --base-path / --relaxed-security --log-level debug --session-override --local-timezone --use-plugins execute-driver
```

### 2. Test Connection

```bash
# Test Appium connection and device detection
npm run test-connection
```

### 3. Troubleshoot Issues

```bash
# Run comprehensive troubleshooting
npm run troubleshoot
```

### 4. Manual Device Setup

```bash
# List available devices
npm run list-devices-detailed

# Setup device configuration
npm run setup-device
```

## Troubleshooting Steps

### Step 1: Check Appium Server
```bash
curl http://localhost:4723/status
```

### Step 2: Verify Device Connection
```bash
xcrun devicectl list devices
```

### Step 3: Check WebDriverAgent
```bash
ls -la /tmp/WebDriverAgent
```

### Step 4: Network Connectivity
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## Device Trust Settings

1. **On iOS Device:**
   - Go to Settings > General > Device Management
   - Trust the developer certificate
   - Ensure device is unlocked during connection

2. **On Mac:**
   - Open Xcode
   - Window > Devices and Simulators
   - Verify device is connected and trusted

## Environment Variables

Set these environment variables for optimal performance:

```bash
export APPIUM_HOST=0.0.0.0
export APPIUM_PORT=4723
export VIBER_BUNDLE_ID=com.viber
export NODE_ENV=development
```

## Log Files

Check these log files for debugging:

- `./logs/appium.log` - Appium server logs
- `./logs/combined.log` - Combined application logs
- `./logs/error.log` - Error logs only

## Performance Tips

1. **Clear Derived Data:**
   ```bash
   rm -rf /tmp/WebDriverAgent
   ```

2. **Restart WebDriverAgent:**
   ```bash
   pkill -f WebDriverAgent
   ```

3. **Reset Device Trust:**
   - Disconnect and reconnect device
   - Re-trust developer certificate

4. **Use Wired Connection:**
   - Prefer USB connection over WiFi
   - Ensure stable network for remote devices

## Monitoring

Use the test script to monitor connection health:

```bash
# Run continuous monitoring
while true; do
  npm run test-connection
  sleep 30
done
```

## Emergency Recovery

If all else fails:

1. **Kill all Appium processes:**
   ```bash
   pkill -f appium
   ```

2. **Clear all temporary data:**
   ```bash
   rm -rf /tmp/WebDriverAgent
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```

3. **Restart Appium with clean state:**
   ```bash
   npm run start-appium
   ```

4. **Reconnect device:**
   - Disconnect USB cable
   - Wait 10 seconds
   - Reconnect and trust device

## Support

If issues persist:

1. Run the troubleshooting script: `npm run troubleshoot`
2. Check logs in `./logs/` directory
3. Verify device compatibility with current iOS version
4. Ensure Xcode and command line tools are up to date

## Version Compatibility

- **Appium**: 2.19.0+
- **WebDriverAgent**: Latest from Facebook
- **iOS**: 15.0+
- **Xcode**: 15.0+
- **Node.js**: 18.0+

This configuration has been tested and optimized for the Viber automation project to resolve timeout issues and improve connection stability.
