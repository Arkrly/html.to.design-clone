/**
 * capture.js - Lightweight Screenshot Engine
 * Uses puppeteer-core with system browser for minimal footprint
 */

const puppeteer = require('puppeteer-core');
const chromeLauncher = require('chrome-launcher');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Default screenshot options
 */
const DEFAULT_OPTIONS = {
  width: 1200,
  height: 800,
  fullPage: false,
  delay: 0,
  format: 'png',
  quality: 90
};

/**
 * Find any Chromium-based browser on the system
 * Supports: Chrome, Edge, Brave, Chromium, Opera, Vivaldi, Arc
 * @returns {string|null} - Path to browser executable
 */
function findBrowser() {
  // Check environment variable first
  if (process.env.BROWSER_PATH && fs.existsSync(process.env.BROWSER_PATH)) {
    console.log(`Using browser from BROWSER_PATH: ${process.env.BROWSER_PATH}`);
    return process.env.BROWSER_PATH;
  }
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    console.log(`Using browser from CHROME_PATH: ${process.env.CHROME_PATH}`);
    return process.env.CHROME_PATH;
  }

  const possiblePaths = [];

  if (process.platform === 'win32') {
    // Windows paths - check all common Chromium-based browsers
    const prefixes = [
      process.env['PROGRAMFILES'],
      process.env['PROGRAMFILES(X86)'],
      process.env['LOCALAPPDATA'],
      'C:\\Program Files',
      'C:\\Program Files (x86)'
    ].filter(Boolean);

    const browsers = [
      // Google Chrome
      ['Google', 'Chrome', 'Application', 'chrome.exe'],
      // Microsoft Edge
      ['Microsoft', 'Edge', 'Application', 'msedge.exe'],
      // Brave
      ['BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'],
      // Vivaldi
      ['Vivaldi', 'Application', 'vivaldi.exe'],
      // Opera
      ['Opera Software', 'Opera Stable', 'opera.exe'],
      // Opera GX
      ['Opera Software', 'Opera GX Stable', 'opera.exe'],
      // Chromium
      ['Chromium', 'Application', 'chrome.exe'],
      // Arc (Windows)
      ['Arc', 'Application', 'arc.exe'],
      // Yandex Browser
      ['Yandex', 'YandexBrowser', 'Application', 'browser.exe'],
      // Naver Whale
      ['Naver', 'Whale', 'Application', 'whale.exe'],
    ];

    for (const prefix of prefixes) {
      for (const browserPath of browsers) {
        possiblePaths.push(path.join(prefix, ...browserPath));
      }
    }

    // Also check user's local app data
    if (process.env['LOCALAPPDATA']) {
      const localAppData = process.env['LOCALAPPDATA'];
      possiblePaths.push(
        path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        path.join(localAppData, 'Vivaldi', 'Application', 'vivaldi.exe'),
        path.join(localAppData, 'Programs', 'Opera', 'opera.exe'),
        path.join(localAppData, 'Programs', 'Opera GX', 'opera.exe'),
        path.join(localAppData, 'Chromium', 'Application', 'chrome.exe')
      );
    }

    // Try to find via Windows Registry (fallback)
    try {
      const regQuery = execSync(
        'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe" /ve',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      const match = regQuery.match(/REG_SZ\s+(.+)/);
      if (match && match[1] && fs.existsSync(match[1].trim())) {
        possiblePaths.unshift(match[1].trim());
      }
    } catch (e) {
      // Registry query failed, continue with file paths
    }

  } else if (process.platform === 'darwin') {
    // macOS paths
    possiblePaths.push(
      // Google Chrome
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      // Microsoft Edge
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      // Brave
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      // Vivaldi
      '/Applications/Vivaldi.app/Contents/MacOS/Vivaldi',
      // Opera
      '/Applications/Opera.app/Contents/MacOS/Opera',
      // Opera GX
      '/Applications/Opera GX.app/Contents/MacOS/Opera',
      // Arc
      '/Applications/Arc.app/Contents/MacOS/Arc',
      // Chromium
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      // Orion
      '/Applications/Orion.app/Contents/MacOS/Orion',
      // Sidekick
      '/Applications/Sidekick.app/Contents/MacOS/Sidekick'
    );

    // Also check user Applications folder
    const homeDir = process.env.HOME || '';
    if (homeDir) {
      possiblePaths.push(
        `${homeDir}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
        `${homeDir}/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
        `${homeDir}/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`,
        `${homeDir}/Applications/Arc.app/Contents/MacOS/Arc`
      );
    }

  } else {
    // Linux paths
    possiblePaths.push(
      // Google Chrome
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/opt/google/chrome/chrome',
      // Chromium
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/usr/lib/chromium/chromium',
      '/usr/lib/chromium-browser/chromium-browser',
      // Microsoft Edge
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
      '/opt/microsoft/msedge/msedge',
      // Brave
      '/usr/bin/brave-browser',
      '/usr/bin/brave',
      '/opt/brave.com/brave/brave-browser',
      '/snap/bin/brave',
      // Vivaldi
      '/usr/bin/vivaldi',
      '/usr/bin/vivaldi-stable',
      '/opt/vivaldi/vivaldi',
      // Opera
      '/usr/bin/opera',
      '/snap/bin/opera',
      // Flatpak locations
      '/var/lib/flatpak/exports/bin/com.google.Chrome',
      '/var/lib/flatpak/exports/bin/com.brave.Browser',
      '/var/lib/flatpak/exports/bin/com.microsoft.Edge'
    );

    // Check user's local bin
    const homeDir = process.env.HOME || '';
    if (homeDir) {
      possiblePaths.push(
        `${homeDir}/.local/bin/google-chrome`,
        `${homeDir}/.local/bin/chromium`,
        `${homeDir}/.local/share/flatpak/exports/bin/com.google.Chrome`
      );
    }
  }

  // Find first existing path
  for (const browserPath of possiblePaths) {
    try {
      if (fs.existsSync(browserPath)) {
        console.log(`Found browser at: ${browserPath}`);
        return browserPath;
      }
    } catch (e) {
      // Permission denied or other error, skip
    }
  }

  return null;
}

/**
 * Get browser name from path
 * @param {string} browserPath - Path to browser executable
 * @returns {string} - Browser name
 */
function getBrowserName(browserPath) {
  if (!browserPath) return 'Unknown';
  const lowerPath = browserPath.toLowerCase();
  
  if (lowerPath.includes('chrome') && !lowerPath.includes('chromium')) return 'Google Chrome';
  if (lowerPath.includes('msedge') || lowerPath.includes('microsoft-edge')) return 'Microsoft Edge';
  if (lowerPath.includes('brave')) return 'Brave';
  if (lowerPath.includes('vivaldi')) return 'Vivaldi';
  if (lowerPath.includes('opera')) return 'Opera';
  if (lowerPath.includes('chromium')) return 'Chromium';
  if (lowerPath.includes('arc')) return 'Arc';
  if (lowerPath.includes('whale')) return 'Naver Whale';
  if (lowerPath.includes('yandex')) return 'Yandex Browser';
  
  return 'Chromium-based Browser';
}

/**
 * Screenshot engine class
 */
class ScreenshotEngine {
  constructor() {
    this.browser = null;
    this.chrome = null;
    this.browserPath = null;
    this.browserName = null;
  }

  /**
   * Initialize browser connection
   */
  async init() {
    if (this.browser) return;

    // Find any Chromium-based browser
    this.browserPath = findBrowser();
    
    if (!this.browserPath) {
      throw new Error(
        'No Chromium-based browser found. Please install one of: Google Chrome, Microsoft Edge, Brave, Vivaldi, Opera, Chromium, or set BROWSER_PATH environment variable.'
      );
    }

    this.browserName = getBrowserName(this.browserPath);
    console.log(`Using ${this.browserName} for screenshot capture`);

    try {
      // Try using chrome-launcher first
      this.chrome = await chromeLauncher.launch({
        chromePath: this.browserPath,
        chromeFlags: [
          '--headless',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-sync',
          '--disable-translate',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-first-run'
        ]
      });

      // Connect puppeteer to Chrome
      this.browser = await puppeteer.connect({
        browserURL: `http://localhost:${this.chrome.port}`,
        defaultViewport: null
      });
    } catch (launcherError) {
      console.warn('chrome-launcher failed, trying direct puppeteer launch:', launcherError.message);
      
      // Fallback: launch directly with puppeteer-core
      this.browser = await puppeteer.launch({
        executablePath: this.browserPath,
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-sync',
          '--disable-translate',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-first-run'
        ]
      });
    }
  }

  /**
   * Close browser connection
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    if (this.chrome) {
      await this.chrome.kill();
      this.chrome = null;
    }
  }

  /**
   * Capture screenshot from URL
   * @param {string} url - URL to capture
   * @param {Object} options - Screenshot options
   * @returns {Promise<Object>} - Screenshot result
   */
  async captureUrl(url, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    await this.init();

    const page = await this.browser.newPage();

    try {
      // Set viewport
      await page.setViewport({
        width: opts.width,
        height: opts.height,
        deviceScaleFactor: 1
      });

      // Navigate to URL
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Optional delay
      if (opts.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, opts.delay));
      }

      // Take screenshot
      const screenshotOptions = {
        type: opts.format,
        fullPage: opts.fullPage
      };

      if (opts.format === 'jpeg') {
        screenshotOptions.quality = opts.quality;
      }

      const buffer = await page.screenshot(screenshotOptions);

      // Get page info
      const title = await page.title();
      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight
      }));

      return {
        success: true,
        buffer,
        title,
        url,
        dimensions,
        viewport: { width: opts.width, height: opts.height },
        fullPage: opts.fullPage,
        timestamp: new Date().toISOString()
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Capture screenshot from HTML string
   * @param {string} html - HTML content
   * @param {Object} options - Screenshot options
   * @returns {Promise<Object>} - Screenshot result
   */
  async captureHtml(html, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    await this.init();

    const page = await this.browser.newPage();

    try {
      // Set viewport
      await page.setViewport({
        width: opts.width,
        height: opts.height,
        deviceScaleFactor: 1
      });

      // Set HTML content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Optional delay
      if (opts.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, opts.delay));
      }

      // Take screenshot
      const screenshotOptions = {
        type: opts.format,
        fullPage: opts.fullPage
      };

      if (opts.format === 'jpeg') {
        screenshotOptions.quality = opts.quality;
      }

      const buffer = await page.screenshot(screenshotOptions);

      // Get page info
      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight
      }));

      return {
        success: true,
        buffer,
        dimensions,
        viewport: { width: opts.width, height: opts.height },
        fullPage: opts.fullPage,
        timestamp: new Date().toISOString()
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Capture and save screenshot
   * @param {string} url - URL to capture
   * @param {string} outputPath - Output file path
   * @param {Object} options - Screenshot options
   * @returns {Promise<Object>} - Result with file path
   */
  async captureAndSave(url, outputPath, options = {}) {
    const result = await this.captureUrl(url, options);

    if (result.success) {
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(outputPath, result.buffer);

      return {
        ...result,
        filePath: outputPath,
        fileSize: result.buffer.length
      };
    }

    return result;
  }
}

/**
 * Singleton instance
 */
let engineInstance = null;

/**
 * Get screenshot engine instance
 * @returns {ScreenshotEngine}
 */
function getEngine() {
  if (!engineInstance) {
    engineInstance = new ScreenshotEngine();
  }
  return engineInstance;
}

/**
 * Capture screenshot from URL (convenience function)
 * @param {string} url - URL to capture
 * @param {Object} options - Screenshot options
 * @returns {Promise<Object>} - Screenshot result
 */
async function captureScreenshot(url, options = {}) {
  const engine = getEngine();
  return engine.captureUrl(url, options);
}

/**
 * Capture and save screenshot with timestamp filename
 * @param {string} url - URL to capture
 * @param {string} outputDir - Output directory
 * @param {Object} options - Screenshot options
 * @returns {Promise<Object>} - Result with file path
 */
async function captureAndSaveWithTimestamp(url, outputDir, options = {}) {
  const engine = getEngine();
  const timestamp = Date.now();
  const format = options.format || 'png';
  const filename = `${timestamp}.${format}`;
  const outputPath = path.join(outputDir, filename);
  
  return engine.captureAndSave(url, outputPath, options);
}

/**
 * Get HTML content from URL
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} - HTML content
 */
async function getPageHtml(url) {
  const engine = getEngine();
  await engine.init();

  const page = await engine.browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    const html = await page.content();
    return html;

  } finally {
    await page.close();
  }
}

/**
 * Cleanup resources
 */
async function cleanup() {
  if (engineInstance) {
    await engineInstance.close();
    engineInstance = null;
  }
}

// Handle process exit
process.on('exit', () => {
  if (engineInstance && engineInstance.chrome) {
    engineInstance.chrome.kill();
  }
});

module.exports = {
  ScreenshotEngine,
  getEngine,
  captureScreenshot,
  captureAndSaveWithTimestamp,
  getPageHtml,
  cleanup,
  DEFAULT_OPTIONS
};
