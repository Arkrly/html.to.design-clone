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

/**
 * Extract components from a page
 * Identifies reusable UI components like buttons, cards, navbars, etc.
 * @param {string} url - URL to analyze
 * @param {Object} options - Options
 * @returns {Promise<Object>} - Components data
 */
async function extractComponents(url, options = {}) {
  const engine = getEngine();
  await engine.init();

  const page = await engine.browser.newPage();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    await page.setViewport({
      width: opts.width,
      height: opts.height,
      deviceScaleFactor: 1
    });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    if (opts.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, opts.delay));
    }

    // Extract components from the page
    const components = await page.evaluate(() => {
      const result = {
        buttons: [],
        cards: [],
        navbars: [],
        headers: [],
        footers: [],
        forms: [],
        inputs: [],
        images: [],
        links: [],
        lists: [],
        modals: [],
        sections: [],
        articles: [],
        icons: [],
        badges: [],
        alerts: [],
        tables: [],
        custom: []
      };

      // Helper to get computed styles
      function getStyles(el) {
        const computed = window.getComputedStyle(el);
        return {
          background: computed.backgroundColor,
          color: computed.color,
          fontSize: computed.fontSize,
          fontFamily: computed.fontFamily,
          fontWeight: computed.fontWeight,
          padding: computed.padding,
          margin: computed.margin,
          border: computed.border,
          borderRadius: computed.borderRadius,
          boxShadow: computed.boxShadow,
          display: computed.display,
          position: computed.position,
          width: computed.width,
          height: computed.height
        };
      }

      // Helper to get bounding rect
      function getBounds(el) {
        const rect = el.getBoundingClientRect();
        return {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        };
      }

      // Helper to get element info
      function getElementInfo(el, type) {
        const bounds = getBounds(el);
        if (bounds.w === 0 || bounds.h === 0) return null;
        
        return {
          type,
          tagName: el.tagName.toLowerCase(),
          id: el.id || null,
          classes: Array.from(el.classList),
          text: el.innerText?.substring(0, 100) || null,
          html: el.outerHTML.substring(0, 500),
          bounds,
          styles: getStyles(el),
          attributes: Array.from(el.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {})
        };
      }

      // Detect buttons
      document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], .btn, .button, a.btn').forEach(el => {
        const info = getElementInfo(el, 'button');
        if (info) result.buttons.push(info);
      });

      // Detect cards (common card patterns)
      document.querySelectorAll('.card, [class*="card"], article, .panel, .tile, .box').forEach(el => {
        const info = getElementInfo(el, 'card');
        if (info && info.bounds.h > 50) result.cards.push(info);
      });

      // Detect navigation
      document.querySelectorAll('nav, [role="navigation"], .navbar, .nav, header nav, .navigation').forEach(el => {
        const info = getElementInfo(el, 'navbar');
        if (info) result.navbars.push(info);
      });

      // Detect headers
      document.querySelectorAll('header, [role="banner"], .header').forEach(el => {
        const info = getElementInfo(el, 'header');
        if (info) result.headers.push(info);
      });

      // Detect footers
      document.querySelectorAll('footer, [role="contentinfo"], .footer').forEach(el => {
        const info = getElementInfo(el, 'footer');
        if (info) result.footers.push(info);
      });

      // Detect forms
      document.querySelectorAll('form').forEach(el => {
        const info = getElementInfo(el, 'form');
        if (info) result.forms.push(info);
      });

      // Detect inputs
      document.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach(el => {
        const info = getElementInfo(el, 'input');
        if (info) {
          info.inputType = el.type || el.tagName.toLowerCase();
          info.placeholder = el.placeholder || null;
          result.inputs.push(info);
        }
      });

      // Detect images
      document.querySelectorAll('img, picture, [role="img"], svg').forEach(el => {
        const info = getElementInfo(el, 'image');
        if (info && info.bounds.w > 20 && info.bounds.h > 20) {
          info.src = el.src || el.querySelector('img')?.src || null;
          info.alt = el.alt || null;
          result.images.push(info);
        }
      });

      // Detect links
      document.querySelectorAll('a[href]').forEach(el => {
        const info = getElementInfo(el, 'link');
        if (info && !result.buttons.some(b => b.html === info.html)) {
          info.href = el.href;
          result.links.push(info);
        }
      });

      // Detect lists
      document.querySelectorAll('ul, ol, dl, [role="list"]').forEach(el => {
        const info = getElementInfo(el, 'list');
        if (info && info.bounds.h > 30) {
          info.itemCount = el.children.length;
          result.lists.push(info);
        }
      });

      // Detect modals/dialogs
      document.querySelectorAll('[role="dialog"], .modal, .popup, .overlay, dialog').forEach(el => {
        const info = getElementInfo(el, 'modal');
        if (info) result.modals.push(info);
      });

      // Detect sections
      document.querySelectorAll('section, .section, [class*="section"]').forEach(el => {
        const info = getElementInfo(el, 'section');
        if (info && info.bounds.h > 100) result.sections.push(info);
      });

      // Detect articles
      document.querySelectorAll('article, .article, .post, .blog-post').forEach(el => {
        const info = getElementInfo(el, 'article');
        if (info) result.articles.push(info);
      });

      // Detect icons
      document.querySelectorAll('i[class*="icon"], .icon, svg[class*="icon"], [class*="fa-"], [class*="material-icon"]').forEach(el => {
        const info = getElementInfo(el, 'icon');
        if (info && info.bounds.w > 10 && info.bounds.w < 100) result.icons.push(info);
      });

      // Detect badges/tags
      document.querySelectorAll('.badge, .tag, .label, .chip, [class*="badge"]').forEach(el => {
        const info = getElementInfo(el, 'badge');
        if (info) result.badges.push(info);
      });

      // Detect alerts/notifications
      document.querySelectorAll('.alert, .notification, .message, [role="alert"], .toast').forEach(el => {
        const info = getElementInfo(el, 'alert');
        if (info) result.alerts.push(info);
      });

      // Detect tables
      document.querySelectorAll('table, [role="table"], .table').forEach(el => {
        const info = getElementInfo(el, 'table');
        if (info) {
          info.rows = el.rows?.length || 0;
          info.cols = el.rows?.[0]?.cells?.length || 0;
          result.tables.push(info);
        }
      });

      // Detect custom components (elements with data-component or specific patterns)
      document.querySelectorAll('[data-component], [data-testid], [class*="component"]').forEach(el => {
        const info = getElementInfo(el, 'custom');
        if (info) {
          info.componentName = el.dataset.component || el.dataset.testid || null;
          result.custom.push(info);
        }
      });

      return result;
    });

    // Get page title
    const title = await page.title();

    return {
      success: true,
      url,
      title,
      components,
      summary: {
        buttons: components.buttons.length,
        cards: components.cards.length,
        navbars: components.navbars.length,
        headers: components.headers.length,
        footers: components.footers.length,
        forms: components.forms.length,
        inputs: components.inputs.length,
        images: components.images.length,
        links: components.links.length,
        lists: components.lists.length,
        modals: components.modals.length,
        sections: components.sections.length,
        articles: components.articles.length,
        icons: components.icons.length,
        badges: components.badges.length,
        alerts: components.alerts.length,
        tables: components.tables.length,
        custom: components.custom.length,
        total: Object.values(components).reduce((sum, arr) => sum + arr.length, 0)
      },
      timestamp: new Date().toISOString()
    };

  } finally {
    await page.close();
  }
}

/**
 * Capture screenshot of a specific element/component
 * @param {string} url - URL to capture from
 * @param {string} selector - CSS selector of the component
 * @param {Object} options - Options
 * @returns {Promise<Object>} - Screenshot result
 */
async function captureComponent(url, selector, options = {}) {
  const engine = getEngine();
  await engine.init();

  const page = await engine.browser.newPage();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    await page.setViewport({
      width: opts.width,
      height: opts.height,
      deviceScaleFactor: opts.scale || 2
    });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    if (opts.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, opts.delay));
    }

    // Find the element
    const element = await page.$(selector);
    if (!element) {
      return {
        success: false,
        error: `Element not found: ${selector}`
      };
    }

    // Get element bounds
    const bounds = await element.boundingBox();
    if (!bounds) {
      return {
        success: false,
        error: 'Element has no visible bounds'
      };
    }

    // Capture screenshot of just this element
    const buffer = await element.screenshot({
      type: opts.format || 'png',
      omitBackground: opts.transparent || false
    });

    // Get element info
    const info = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      
      const computed = window.getComputedStyle(el);
      return {
        tagName: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: Array.from(el.classList),
        text: el.innerText?.substring(0, 200) || null,
        styles: {
          background: computed.backgroundColor,
          color: computed.color,
          fontSize: computed.fontSize,
          borderRadius: computed.borderRadius,
          boxShadow: computed.boxShadow
        }
      };
    }, selector);

    return {
      success: true,
      buffer,
      selector,
      bounds: {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        w: Math.round(bounds.width),
        h: Math.round(bounds.height)
      },
      info,
      timestamp: new Date().toISOString()
    };

  } finally {
    await page.close();
  }
}

/**
 * Capture all detected components as separate screenshots
 * @param {string} url - URL to capture from
 * @param {string} outputDir - Output directory for screenshots
 * @param {Object} options - Options
 * @returns {Promise<Object>} - Results
 */
async function captureAllComponents(url, outputDir, options = {}) {
  const engine = getEngine();
  await engine.init();

  const page = await engine.browser.newPage();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results = [];

  try {
    await page.setViewport({
      width: opts.width,
      height: opts.height,
      deviceScaleFactor: opts.scale || 2
    });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    if (opts.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, opts.delay));
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get all component selectors
    const selectors = await page.evaluate(() => {
      const components = [];
      
      // Common component selectors
      const patterns = [
        'button', '.btn', '[role="button"]',
        '.card', '[class*="card"]',
        'nav', '.navbar', '.nav',
        'header', '.header',
        'footer', '.footer',
        '.modal', '[role="dialog"]',
        '.alert', '.notification',
        '.badge', '.tag'
      ];

      patterns.forEach(pattern => {
        document.querySelectorAll(pattern).forEach((el, index) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 20 && rect.height > 20) {
            // Create unique selector
            let selector = el.tagName.toLowerCase();
            if (el.id) {
              selector = `#${el.id}`;
            } else if (el.classList.length > 0) {
              selector = `.${Array.from(el.classList).join('.')}`;
            }
            
            components.push({
              selector,
              type: pattern.replace(/[\.\[\]="*]/g, ''),
              index,
              bounds: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
            });
          }
        });
      });

      return components;
    });

    // Capture each unique component
    const captured = new Set();
    for (const comp of selectors) {
      const key = `${comp.type}-${comp.bounds.x}-${comp.bounds.y}`;
      if (captured.has(key)) continue;
      captured.add(key);

      try {
        const elements = await page.$$(comp.selector);
        if (elements.length > comp.index) {
          const element = elements[comp.index];
          const bounds = await element.boundingBox();
          
          if (bounds && bounds.width > 20 && bounds.height > 20) {
            const buffer = await element.screenshot({
              type: 'png',
              omitBackground: false
            });

            const filename = `${comp.type}-${Date.now()}-${results.length}.png`;
            const filepath = path.join(outputDir, filename);
            fs.writeFileSync(filepath, buffer);

            results.push({
              success: true,
              type: comp.type,
              selector: comp.selector,
              filename,
              filepath,
              bounds: {
                x: Math.round(bounds.x),
                y: Math.round(bounds.y),
                w: Math.round(bounds.width),
                h: Math.round(bounds.height)
              }
            });
          }
        }
      } catch (err) {
        results.push({
          success: false,
          type: comp.type,
          selector: comp.selector,
          error: err.message
        });
      }
    }

    return {
      success: true,
      url,
      outputDir,
      components: results,
      totalCaptured: results.filter(r => r.success).length,
      timestamp: new Date().toISOString()
    };

  } finally {
    await page.close();
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
  extractComponents,
  captureComponent,
  captureAllComponents,
  DEFAULT_OPTIONS
};
