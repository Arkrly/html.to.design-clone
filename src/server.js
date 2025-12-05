/**
 * server.js - Lightweight Express Server
 * Serves UI and handles API endpoints
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// Core modules
const { htmlToDesignTree, urlToDesignTree, extractColorPalette } = require('./core/toDesignTree');
const { captureAndSaveWithTimestamp, getPageHtml, cleanup, extractComponents, captureComponent, captureAllComponents } = require('./screenshot/capture');

// Configuration
const PORT = process.env.PORT || 3000;
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const SCREENSHOTS_DIR = path.join(ASSETS_DIR, 'screenshots');
const COMPONENTS_DIR = path.join(ASSETS_DIR, 'components');

// Ensure directories exist
function ensureDirectories() {
  const dirs = [ASSETS_DIR, SCREENSHOTS_DIR, COMPONENTS_DIR, path.join(ASSETS_DIR, 'images')];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Create Express app
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'ui')));
app.use('/assets', express.static(ASSETS_DIR));

// CORS for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});


/**
 * API: Capture screenshot from URL
 * POST /api/screenshot
 */
app.post('/api/screenshot', async (req, res) => {
  try {
    const { url, width, height, fullPage, delay } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    console.log(`Capturing screenshot: ${url}`);

    const options = {
      width: parseInt(width) || 1200,
      height: parseInt(height) || 800,
      fullPage: fullPage === true,
      delay: parseInt(delay) || 0
    };

    const result = await captureAndSaveWithTimestamp(url, SCREENSHOTS_DIR, options);

    if (result.success) {
      const relativePath = `/assets/screenshots/${path.basename(result.filePath)}`;
      
      // Update latest.png symlink or copy
      const latestPath = path.join(SCREENSHOTS_DIR, 'latest.png');
      try {
        if (fs.existsSync(latestPath)) {
          fs.unlinkSync(latestPath);
        }
        fs.copyFileSync(result.filePath, latestPath);
      } catch (err) {
        console.warn('Could not update latest.png:', err.message);
      }

      res.json({
        success: true,
        imagePath: relativePath,
        latestPath: '/assets/screenshots/latest.png',
        dimensions: result.dimensions,
        viewport: result.viewport,
        title: result.title,
        timestamp: result.timestamp
      });
    } else {
      throw new Error('Screenshot capture failed');
    }

  } catch (error) {
    console.error('Screenshot error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to capture screenshot'
    });
  }
});

/**
 * API: Convert HTML to design tree
 * POST /api/convert
 */
app.post('/api/convert', async (req, res) => {
  try {
    const { html, url, viewport } = req.body;

    if (!html && !url) {
      return res.status(400).json({
        success: false,
        error: 'HTML content or URL is required'
      });
    }

    console.log(`Converting to design tree: ${url || 'HTML input'}`);

    const options = {
      viewport: {
        width: viewport?.width || 1200,
        height: viewport?.height || 800
      }
    };

    let designTree;

    if (html) {
      designTree = htmlToDesignTree(html, options);
    } else {
      designTree = await urlToDesignTree(url, options);
    }

    // Extract color palette
    const colors = extractColorPalette(designTree);

    // Save design tree to file
    const timestamp = Date.now();
    const designPath = path.join(ASSETS_DIR, `design-${timestamp}.json`);
    fs.writeFileSync(designPath, JSON.stringify(designTree, null, 2));

    res.json({
      success: true,
      designTree,
      colors,
      savedTo: designPath
    });

  } catch (error) {
    console.error('Convert error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to convert HTML'
    });
  }
});

/**
 * API: Fetch HTML from URL
 * POST /api/fetch
 */
app.post('/api/fetch', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    console.log(`Fetching HTML: ${url}`);

    const html = await getPageHtml(url);

    res.json({
      success: true,
      html,
      url
    });

  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch HTML'
    });
  }
});

/**
 * API: Get latest design tree
 * GET /api/design
 */
app.get('/api/design', (req, res) => {
  try {
    // Find most recent design file
    const files = fs.readdirSync(ASSETS_DIR)
      .filter(f => f.startsWith('design-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No design tree found'
      });
    }

    const latestFile = path.join(ASSETS_DIR, files[0]);
    const designTree = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));

    res.json({
      success: true,
      designTree,
      file: files[0]
    });

  } catch (error) {
    console.error('Design fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get design tree'
    });
  }
});

/**
 * API: Get latest screenshot
 * GET /assets/screenshots/latest.png
 */
app.get('/assets/screenshots/latest.png', (req, res) => {
  const latestPath = path.join(SCREENSHOTS_DIR, 'latest.png');
  
  if (fs.existsSync(latestPath)) {
    res.sendFile(latestPath);
  } else {
    // Find most recent screenshot
    const files = fs.readdirSync(SCREENSHOTS_DIR)
      .filter(f => f.endsWith('.png') && f !== 'latest.png')
      .sort()
      .reverse();

    if (files.length > 0) {
      res.sendFile(path.join(SCREENSHOTS_DIR, files[0]));
    } else {
      res.status(404).json({ error: 'No screenshot found' });
    }
  }
});

/**
 * API: Health check
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * API: List screenshots
 * GET /api/screenshots
 */
app.get('/api/screenshots', (req, res) => {
  try {
    const files = fs.readdirSync(SCREENSHOTS_DIR)
      .filter(f => f.endsWith('.png') && f !== 'latest.png')
      .sort()
      .reverse()
      .slice(0, 20);

    const screenshots = files.map(f => ({
      filename: f,
      path: `/assets/screenshots/${f}`,
      timestamp: parseInt(f.replace('.png', ''))
    }));

    res.json({
      success: true,
      screenshots
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * API: Extract components from a page
 * POST /api/components
 */
app.post('/api/components', async (req, res) => {
  try {
    const { url, width, height, delay } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    console.log(`Extracting components from: ${url}`);

    const options = {
      width: parseInt(width) || 1200,
      height: parseInt(height) || 800,
      delay: parseInt(delay) || 0
    };

    const result = await extractComponents(url, options);

    res.json(result);

  } catch (error) {
    console.error('Components extraction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract components'
    });
  }
});

/**
 * API: Capture a specific component screenshot
 * POST /api/components/capture
 */
app.post('/api/components/capture', async (req, res) => {
  try {
    const { url, selector, width, height, delay, transparent } = req.body;

    if (!url || !selector) {
      return res.status(400).json({
        success: false,
        error: 'URL and selector are required'
      });
    }

    console.log(`Capturing component: ${selector} from ${url}`);

    const options = {
      width: parseInt(width) || 1200,
      height: parseInt(height) || 800,
      delay: parseInt(delay) || 0,
      transparent: transparent === true
    };

    const result = await captureComponent(url, selector, options);

    if (result.success) {
      // Save the component screenshot
      const timestamp = Date.now();
      const safeName = selector.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
      const filename = `${safeName}-${timestamp}.png`;
      const filepath = path.join(COMPONENTS_DIR, filename);
      
      fs.writeFileSync(filepath, result.buffer);

      res.json({
        success: true,
        imagePath: `/assets/components/${filename}`,
        selector: result.selector,
        bounds: result.bounds,
        info: result.info,
        timestamp: result.timestamp
      });
    } else {
      res.status(404).json(result);
    }

  } catch (error) {
    console.error('Component capture error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to capture component'
    });
  }
});

/**
 * API: Capture all components from a page
 * POST /api/components/capture-all
 */
app.post('/api/components/capture-all', async (req, res) => {
  try {
    const { url, width, height, delay } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    console.log(`Capturing all components from: ${url}`);

    const options = {
      width: parseInt(width) || 1200,
      height: parseInt(height) || 800,
      delay: parseInt(delay) || 0
    };

    // Create timestamped folder for this capture
    const timestamp = Date.now();
    const outputDir = path.join(COMPONENTS_DIR, `capture-${timestamp}`);

    const result = await captureAllComponents(url, outputDir, options);

    // Map file paths to URLs
    if (result.success && result.components) {
      result.components = result.components.map(comp => ({
        ...comp,
        imagePath: comp.filepath ? `/assets/components/capture-${timestamp}/${comp.filename}` : null
      }));
    }

    res.json(result);

  } catch (error) {
    console.error('Capture all components error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to capture components'
    });
  }
});

/**
 * API: List captured components
 * GET /api/components/list
 */
app.get('/api/components/list', (req, res) => {
  try {
    const components = [];

    // Get individual component files
    if (fs.existsSync(COMPONENTS_DIR)) {
      const files = fs.readdirSync(COMPONENTS_DIR);
      
      files.forEach(file => {
        const filepath = path.join(COMPONENTS_DIR, file);
        const stat = fs.statSync(filepath);
        
        if (stat.isFile() && file.endsWith('.png')) {
          components.push({
            type: 'single',
            filename: file,
            path: `/assets/components/${file}`,
            timestamp: stat.mtimeMs
          });
        } else if (stat.isDirectory() && file.startsWith('capture-')) {
          // Get files from capture folders
          const captureFiles = fs.readdirSync(filepath);
          captureFiles.forEach(cf => {
            if (cf.endsWith('.png')) {
              components.push({
                type: 'batch',
                folder: file,
                filename: cf,
                path: `/assets/components/${file}/${cf}`,
                timestamp: parseInt(file.replace('capture-', ''))
              });
            }
          });
        }
      });
    }

    // Sort by timestamp descending
    components.sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      components: components.slice(0, 100)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve UI for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Graceful shutdown
async function shutdown() {
  console.log('\nShutting down...');
  await cleanup();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
function start() {
  ensureDirectories();

  app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║     HTML to Design - Lightweight Tool      ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║  Server running at http://localhost:${PORT}   ║`);
    console.log('║                                            ║');
    console.log('║  Endpoints:                                ║');
    console.log('║    POST /api/screenshot  - Capture screen  ║');
    console.log('║    POST /api/convert     - HTML to design  ║');
    console.log('║    POST /api/components  - Extract comps   ║');
    console.log('║    GET  /api/design      - Get design tree ║');
    console.log('║                                            ║');
    console.log('║  Press Ctrl+C to stop                      ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
  });
}

// Run if executed directly
if (require.main === module) {
  start();
}

module.exports = { app, start };
