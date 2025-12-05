/**
 * toDesignTree.js - Convert parsed HTML/CSS to Design Tree JSON
 * Main entry point for HTML-to-Design conversion
 */

const { parseHTML, parseFromURL, getAllElements, getElementType } = require('./parseDOM');
const { collectStylesheets, getComputedStyles, parseSpacing, parseBorder, parsePixelValue } = require('./parseCSS');
const { computeLayout, buildLayoutTree, DEFAULT_VIEWPORT } = require('./computeLayout');

/**
 * Convert HTML string to design tree
 * @param {string} html - HTML string
 * @param {Object} options - Conversion options
 * @returns {Object} - Design tree JSON
 */
function htmlToDesignTree(html, options = {}) {
  const viewport = options.viewport || DEFAULT_VIEWPORT;
  
  // Parse HTML
  const { document, dom } = parseHTML(html);
  
  // Convert to design tree
  const designTree = documentToDesignTree(document, viewport);
  
  // Cleanup
  dom.window.close();
  
  return designTree;
}

/**
 * Convert URL to design tree
 * @param {string} url - URL to convert
 * @param {Object} options - Conversion options
 * @returns {Promise<Object>} - Design tree JSON
 */
async function urlToDesignTree(url, options = {}) {
  const viewport = options.viewport || DEFAULT_VIEWPORT;
  
  // Parse from URL
  const { document, dom } = await parseFromURL(url);
  
  // Convert to design tree
  const designTree = documentToDesignTree(document, viewport);
  
  // Cleanup
  dom.window.close();
  
  return designTree;
}

/**
 * Convert document to design tree
 * @param {Document} document - DOM document
 * @param {Object} viewport - Viewport dimensions
 * @returns {Object} - Design tree
 */
function documentToDesignTree(document, viewport) {
  const body = document.body;
  if (!body) {
    return createEmptyDesignTree(viewport);
  }
  
  // Collect CSS rules
  const cssRules = collectStylesheets(document);
  
  // Build design tree recursively
  const tree = elementToDesignNode(body, cssRules, viewport, 0, 0);
  
  return tree;
}

/**
 * Convert single element to design node
 * @param {Element} element - DOM element
 * @param {Array} cssRules - CSS rules
 * @param {Object} viewport - Viewport dimensions
 * @param {number} offsetX - X offset from parent
 * @param {number} offsetY - Y offset from parent
 * @returns {Object} - Design node
 */
function elementToDesignNode(element, cssRules, viewport, offsetX = 0, offsetY = 0) {
  const tagName = element.tagName?.toLowerCase() || 'div';
  
  // Skip invisible elements
  const skipTags = ['script', 'style', 'noscript', 'meta', 'link', 'head'];
  if (skipTags.includes(tagName)) {
    return null;
  }
  
  // Get computed styles
  const computedStyles = getComputedStyles(element, cssRules);
  
  // Skip hidden elements
  if (computedStyles.display === 'none' || computedStyles.visibility === 'hidden') {
    return null;
  }
  
  // Determine element type
  const type = getElementType(tagName);
  
  // Compute layout
  const layout = computeNodeLayout(element, computedStyles, viewport, offsetX, offsetY);
  
  // Build style object
  const style = buildStyleObject(computedStyles);
  
  // Create design node
  const node = {
    type,
    name: tagName,
    layout: {
      x: layout.x,
      y: layout.y,
      w: layout.w,
      h: layout.h
    },
    style
  };
  
  // Add text content for text nodes
  if (type === 'text') {
    const textContent = getDirectTextContent(element);
    if (textContent) {
      node.text = textContent;
    }
  }
  
  // Add src for images
  if (type === 'image' && element.src) {
    node.src = element.src;
  }
  
  // Add ID and classes as metadata
  if (element.id) {
    node.id = element.id;
  }
  if (element.classList?.length > 0) {
    node.classes = Array.from(element.classList);
  }
  
  // Process children
  const children = processChildren(element, cssRules, viewport, layout);
  if (children.length > 0) {
    node.children = children;
  }
  
  return node;
}

/**
 * Process child elements
 * @param {Element} parent - Parent element
 * @param {Array} cssRules - CSS rules
 * @param {Object} viewport - Viewport dimensions
 * @param {Object} parentLayout - Parent layout
 * @returns {Array} - Child design nodes
 */
function processChildren(parent, cssRules, viewport, parentLayout) {
  const children = [];
  let currentY = parentLayout.y;
  
  for (const child of parent.children) {
    const node = elementToDesignNode(
      child, 
      cssRules, 
      viewport, 
      parentLayout.x,
      currentY
    );
    
    if (node) {
      children.push(node);
      currentY = node.layout.y + node.layout.h;
    }
  }
  
  return children;
}

/**
 * Compute layout for a single node
 * @param {Element} element - DOM element
 * @param {Object} styles - Computed styles
 * @param {Object} viewport - Viewport dimensions
 * @param {number} offsetX - X offset
 * @param {number} offsetY - Y offset
 * @returns {Object} - Layout object
 */
function computeNodeLayout(element, styles, viewport, offsetX, offsetY) {
  const margin = parseSpacing(styles.margin);
  const padding = parseSpacing(styles.padding);
  const border = parseBorder(styles.border);
  
  // Calculate width
  let width = parsePixelValue(styles.width);
  if (!width || styles.width === 'auto') {
    width = viewport.width - margin.left - margin.right;
  }
  if (typeof styles.width === 'string' && styles.width.endsWith('%')) {
    width = (parseFloat(styles.width) / 100) * viewport.width;
  }
  
  // Calculate height
  let height = parsePixelValue(styles.height);
  if (!height || styles.height === 'auto') {
    height = estimateElementHeight(element, styles);
  }
  
  // Calculate position
  const x = offsetX + margin.left;
  const y = offsetY + margin.top;
  
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(width),
    h: Math.round(height)
  };
}

/**
 * Estimate element height based on content
 * @param {Element} element - DOM element
 * @param {Object} styles - Computed styles
 * @returns {number} - Estimated height
 */
function estimateElementHeight(element, styles) {
  const padding = parseSpacing(styles.padding);
  const lineHeight = parsePixelValue(styles.lineHeight) || 
                     parsePixelValue(styles.fontSize) * 1.4 || 
                     22;
  
  // Get text content
  const text = getDirectTextContent(element);
  let contentHeight = lineHeight;
  
  if (text) {
    // Estimate lines based on character count
    const fontSize = parsePixelValue(styles.fontSize) || 16;
    const charWidth = fontSize * 0.5;
    const containerWidth = parsePixelValue(styles.width) || 1000;
    const charsPerLine = Math.floor(containerWidth / charWidth);
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
    contentHeight = lines * lineHeight;
  }
  
  // Add children height estimate
  if (element.children.length > 0) {
    contentHeight = Math.max(contentHeight, element.children.length * lineHeight);
  }
  
  return contentHeight + padding.top + padding.bottom;
}

/**
 * Get direct text content (not from children)
 * @param {Element} element - DOM element
 * @returns {string|null} - Text content
 */
function getDirectTextContent(element) {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === 3) { // Text node
      text += node.textContent;
    }
  }
  return text.trim() || null;
}

/**
 * Build style object from computed styles
 * @param {Object} computed - Computed CSS styles
 * @returns {Object} - Design tree style object
 */
function buildStyleObject(computed) {
  const style = {};
  
  // Background
  if (computed.background && computed.background !== 'transparent') {
    style.background = computed.background;
  }
  if (computed.backgroundColor && computed.backgroundColor !== 'transparent') {
    style.background = computed.backgroundColor;
  }
  
  // Text styles
  if (computed.color && computed.color !== 'inherit') {
    style.color = computed.color;
  }
  if (computed.fontSize) {
    style.fontSize = computed.fontSize;
  }
  if (computed.fontFamily && computed.fontFamily !== 'inherit') {
    style.fontFamily = computed.fontFamily;
  }
  if (computed.fontWeight && computed.fontWeight !== 'normal') {
    style.fontWeight = computed.fontWeight;
  }
  if (computed.textAlign && computed.textAlign !== 'left') {
    style.textAlign = computed.textAlign;
  }
  
  // Spacing
  const padding = parseSpacing(computed.padding);
  if (padding.top || padding.right || padding.bottom || padding.left) {
    style.padding = padding;
  }
  
  const margin = parseSpacing(computed.margin);
  if (margin.top || margin.right || margin.bottom || margin.left) {
    style.margin = margin;
  }
  
  // Border
  const border = parseBorder(computed.border);
  if (border.width > 0) {
    style.border = border;
  }
  if (computed.borderRadius) {
    style.border = style.border || {};
    style.border.radius = parsePixelValue(computed.borderRadius);
  }
  
  // Display and flex
  if (computed.display && computed.display !== 'block') {
    style.display = computed.display;
  }
  if (computed.flexDirection) {
    style.flexDirection = computed.flexDirection;
  }
  if (computed.justifyContent) {
    style.justifyContent = computed.justifyContent;
  }
  if (computed.alignItems) {
    style.alignItems = computed.alignItems;
  }
  if (computed.gap) {
    style.gap = parsePixelValue(computed.gap);
  }
  
  // Opacity
  if (computed.opacity && computed.opacity !== '1') {
    style.opacity = parseFloat(computed.opacity);
  }
  
  return style;
}

/**
 * Create empty design tree
 * @param {Object} viewport - Viewport dimensions
 * @returns {Object} - Empty design tree
 */
function createEmptyDesignTree(viewport) {
  return {
    type: 'frame',
    name: 'body',
    layout: {
      x: 0,
      y: 0,
      w: viewport.width,
      h: viewport.height
    },
    style: {
      background: 'rgb(255, 255, 255)'
    },
    children: []
  };
}

/**
 * Extract color palette from design tree
 * @param {Object} tree - Design tree
 * @returns {Array} - Array of unique colors
 */
function extractColorPalette(tree) {
  const colors = new Set();
  
  function traverse(node) {
    if (node.style) {
      if (node.style.background) colors.add(node.style.background);
      if (node.style.color) colors.add(node.style.color);
      if (node.style.border?.color) colors.add(node.style.border.color);
    }
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }
  
  traverse(tree);
  return Array.from(colors);
}

module.exports = {
  htmlToDesignTree,
  urlToDesignTree,
  documentToDesignTree,
  elementToDesignNode,
  buildStyleObject,
  extractColorPalette,
  createEmptyDesignTree
};
