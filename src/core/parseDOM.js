/**
 * parseDOM.js - Lightweight DOM Parser using jsdom
 * Parses HTML string into a traversable DOM structure
 */

const { JSDOM } = require('jsdom');

/**
 * Parse HTML string into DOM document
 * @param {string} html - HTML string to parse
 * @returns {Object} - Parsed DOM document and window
 */
function parseHTML(html) {
  const dom = new JSDOM(html, {
    resources: 'usable',
    runScripts: 'outside-only'
  });
  
  return {
    document: dom.window.document,
    window: dom.window,
    dom
  };
}

/**
 * Parse HTML from URL (fetches and parses)
 * @param {string} url - URL to fetch HTML from
 * @returns {Promise<Object>} - Parsed DOM document and window
 */
async function parseFromURL(url) {
  const dom = await JSDOM.fromURL(url, {
    resources: 'usable',
    runScripts: 'outside-only'
  });
  
  return {
    document: dom.window.document,
    window: dom.window,
    dom
  };
}

/**
 * Extract element information from DOM node
 * @param {Element} element - DOM element
 * @returns {Object} - Element data
 */
function extractElementData(element) {
  const tagName = element.tagName?.toLowerCase() || 'unknown';
  const id = element.id || null;
  const classList = element.classList ? Array.from(element.classList) : [];
  const attributes = {};
  
  if (element.attributes) {
    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
  }
  
  return {
    tagName,
    id,
    classList,
    attributes,
    textContent: element.childNodes.length === 1 && 
                 element.childNodes[0].nodeType === 3 
                 ? element.textContent.trim() 
                 : null
  };
}

/**
 * Traverse DOM tree and collect element data
 * @param {Element} root - Root element to start traversal
 * @param {Function} callback - Callback for each element
 */
function traverseDOM(root, callback) {
  const queue = [{ element: root, depth: 0, parent: null }];
  
  while (queue.length > 0) {
    const { element, depth, parent } = queue.shift();
    
    // Skip text and comment nodes
    if (element.nodeType !== 1) continue;
    
    const data = extractElementData(element);
    callback(element, data, depth, parent);
    
    // Add children to queue
    const children = element.children || [];
    for (const child of children) {
      queue.push({ element: child, depth: depth + 1, parent: element });
    }
  }
}

/**
 * Get all elements with styles
 * @param {Document} document - DOM document
 * @returns {Array} - Array of elements with their data
 */
function getAllElements(document) {
  const elements = [];
  const body = document.body;
  
  if (!body) return elements;
  
  traverseDOM(body, (element, data, depth) => {
    // Skip script, style, and hidden elements
    const skipTags = ['script', 'style', 'noscript', 'meta', 'link'];
    if (skipTags.includes(data.tagName)) return;
    
    elements.push({
      element,
      ...data,
      depth
    });
  });
  
  return elements;
}

/**
 * Determine element type for design tree
 * @param {string} tagName - HTML tag name
 * @returns {string} - Design tree type
 */
function getElementType(tagName) {
  const textTags = ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'label', 'li'];
  const imageTags = ['img', 'picture'];
  const svgTags = ['svg'];
  
  if (textTags.includes(tagName)) return 'text';
  if (imageTags.includes(tagName)) return 'image';
  if (svgTags.includes(tagName)) return 'svg';
  return 'frame';
}

module.exports = {
  parseHTML,
  parseFromURL,
  extractElementData,
  traverseDOM,
  getAllElements,
  getElementType
};
