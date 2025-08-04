/**
 * Find button element by text
 * @param driver WebDriver instance
 * @param text Text to search for
 * @returns Promise<any>
 */
export async function findByButton(driver: any, text: string): Promise<any> {
    try {
        const el = driver.$(`//XCUIElementTypeButton[contains(@name, "${text}")]`);
        const exists = await el.isExisting();
        if (exists) {
            return el;
        } 
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Find text field element by name
 * @param driver WebDriver instance
 * @param text Text to search for
 * @returns Promise<any>
 */
export async function findByTextFieldWithName(driver: any, text: string): Promise<any> {
    try {
        const el = driver.$(`//XCUIElementTypeTextField[contains(@name, "${text}")]`);
        const exists = await el.isExisting();
        if (exists) {
            return el;
        } 
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Find text field element by value
 * @param driver WebDriver instance
 * @param text Text to search for
 * @returns Promise<any>
 */
export async function findByTextFieldWithValue(driver: any, text: string): Promise<any> {
    try {
        const el = driver.$(`//XCUIElementTypeTextField[contains(@value, "${text}")]`);
        const exists = await el.isExisting();
        if (exists) {
            return el;
        } 
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Find tab bar element by text
 * @param driver WebDriver instance
 * @param text Text to search for
 * @returns Promise<any>
 */
export async function findByTabBar(driver: any, text: string): Promise<any> {
    try {
        const el = driver.$(`//XCUIElementTypeTabBar[contains(@name, "${text}")]`);
        const exists = await el.isExisting();
        if (exists) {
            return el;
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Check if safe login page is loaded
 * @param driver WebDriver instance
 * @returns Promise<boolean>
 */
export async function safeLoginPage(driver: any): Promise<boolean> {
    const maxAttempts = 3;
    const timeout = 5000;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const pageSource = await driver.getPageSource();
            const isNewPage = pageSource.includes('安全登录，保护账户') || 
                            pageSource.includes('以后再说');
            
            if (isNewPage) {
                console.log('新页面已加载');
                return true;
            }
            await driver.pause(timeout);
        } catch (error) {
            console.log(`第 ${attempt} 次检查失败:`, error);
            if (attempt === maxAttempts) {
                return false;
            }
        }
    }
    return false;
}

/**
 * Find static text element by text
 * @param driver WebDriver instance
 * @param text Text to search for
 * @returns Promise<any>
 */
export async function findByStaticText(driver: any, text: string): Promise<any> {
    try {
        const el = driver.$(`//XCUIElementTypeStaticText[contains(@name, "${text}")]`);
        const exists = await el.isExisting();
        if (exists) {
            return el;
        } 
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Find text field element by placeholder
 * @param driver WebDriver instance
 * @param placeholder Placeholder text to search for
 * @returns Promise<any>
 */
export async function findByTextFieldWithPlaceholder(driver: any, placeholder: string): Promise<any> {
    try {
        const el = driver.$(`//XCUIElementTypeTextField[contains(@placeholder, "${placeholder}")]`);
        const exists = await el.isExisting();
        if (exists) {
            return el;
        } 
        return null;
    } catch (error) {
        return null;
    }
} 