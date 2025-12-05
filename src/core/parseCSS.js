/**
 * parseCSS.js - Lightweight CSS Parser using cssom
 * Parses CSS and extracts computed styles
 */

const cssom = require('cssom');

/**
 * Parse CSS string into stylesheet object
 * @param {string} css - CSS string to parse
 * @returns {Object} - Parsed stylesheet
 */
function parseCSS(css) {
  try {
    return cssom.parse(css);
  } catch (error) {
    console.warn('CSS parsing error:', error.message);
    return { cssRules: [] };
  }
}

/**
 * Extract inline styles from style attribute
 * @param {string} styleAttr - Style attribute string
 * @returns {Object} - Parsed style object
 */
function parseInlineStyle(styleAttr) {
  if (!styleAttr) return {};
  
  const styles = {};
  const declarations = styleAttr.split(';');
  
  for (const declaration of declarations) {
    const [property, value] = declaration.split(':').map(s => s?.trim());
    if (property && value) {
      styles[camelCase(property)] = value;
    }
  }
  
  return styles;
}

/**
 * Convert kebab-case to camelCase
 * @param {string} str - Kebab-case string
 * @returns {string} - CamelCase string
 */
function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to kebab-case
 * @param {string} str - CamelCase string
 * @returns {string} - Kebab-case string
 */
function kebabCase(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * Check if selector matches element
 * @param {Element} element - DOM element
 * @param {string} selector - CSS selector
 * @returns {boolean} - True if matches
 */
function matchesSelector(element, selector) {
  try {
    // Simple selector matching
    if (element.matches) {
      return element.matches(selector);
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Collect all CSS rules from document
 * @param {Document} document - DOM document
 * @returns {Array} - Array of CSS rules
 */
function collectStylesheets(document) {
  const rules = [];
  
  // Get inline styles from <style> tags
  const styleTags = document.querySelectorAll('style');
  for (const styleTag of styleTags) {
    const parsed = parseCSS(styleTag.textContent);
    if (parsed.cssRules) {
      rules.push(...parsed.cssRules);
    }
  }
  
  return rules;
}

/**
 * Get computed styles for an element
 * @param {Element} element - DOM element
 * @param {Array} cssRules - CSS rules to apply
 * @returns {Object} - Computed styles
 */
function getComputedStyles(element, cssRules = []) {
  // Start with defaults
  const computed = getDefaultStyles(element.tagName?.toLowerCase());
  
  // Apply matching CSS rules
  for (const rule of cssRules) {
    if (!rule.selectorText || !rule.style) continue;
    
    try {
      if (matchesSelector(element, rule.selectorText)) {
        const style = rule.style;
        for (let i = 0; i < style.length; i++) {
          const prop = style[i];
          const value = style.getPropertyValue(prop);
          if (value) {
            computed[camelCase(prop)] = value;
          }
        }
      }
    } catch (error) {
      // Skip invalid selectors
    }
  }
  
  // Apply inline styles (highest priority)
  const inlineStyles = parseInlineStyle(element.getAttribute?.('style'));
  Object.assign(computed, inlineStyles);
  
  return computed;
}

/**
 * Get default styles for an element type
 * @param {string} tagName - HTML tag name
 * @returns {Object} - Default styles
 */
function getDefaultStyles(tagName) {
  const defaults = {
    display: 'block',
    position: 'static',
    margin: '0',
    padding: '0',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    fontSize: '16px',
    fontFamily: 'inherit',
    fontWeight: 'normal',
    lineHeight: 'normal',
    textAlign: 'left',
    width: 'auto',
    height: 'auto'
  };
  
  // Inline elements
  const inlineTags = ['span', 'a', 'strong', 'em', 'b', 'i', 'label'];
  if (inlineTags.includes(tagName)) {
    defaults.display = 'inline';
  }
  
  // Headings
  const headingDefaults = {
    h1: { fontSize: '32px', fontWeight: 'bold', margin: '0.67em 0' },
    h2: { fontSize: '24px', fontWeight: 'bold', margin: '0.83em 0' },
    h3: { fontSize: '18.72px', fontWeight: 'bold', margin: '1em 0' },
    h4: { fontSize: '16px', fontWeight: 'bold', margin: '1.33em 0' },
    h5: { fontSize: '13.28px', fontWeight: 'bold', margin: '1.67em 0' },
    h6: { fontSize: '10.72px', fontWeight: 'bold', margin: '2.33em 0' }
  };
  
  if (headingDefaults[tagName]) {
    Object.assign(defaults, headingDefaults[tagName]);
  }
  
  // Paragraph
  if (tagName === 'p') {
    defaults.margin = '1em 0';
  }
  
  // Body
  if (tagName === 'body') {
    defaults.margin = '8px';
    defaults.background = 'rgb(255, 255, 255)';
    defaults.color = 'rgb(0, 0, 0)';
  }
  
  return defaults;
}

/**
 * Parse spacing value (margin, padding)
 * @param {string} value - CSS spacing value
 * @returns {Object} - Parsed spacing object
 */
function parseSpacing(value) {
  if (!value || value === 'auto') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  
  const parts = value.split(/\s+/).map(parsePixelValue);
  
  switch (parts.length) {
    case 1:
      return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    case 2:
      return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    case 3:
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
    case 4:
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
    default:
      return { top: 0, right: 0, bottom: 0, left: 0 };
  }
}

/**
 * Parse pixel value from CSS value
 * @param {string} value - CSS value
 * @returns {number} - Pixel value
 */
function parsePixelValue(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  
  const str = String(value).trim();
  
  // Handle pixel values
  if (str.endsWith('px')) {
    return parseFloat(str);
  }
  
  // Handle em values (approximate)
  if (str.endsWith('em')) {
    return parseFloat(str) * 16;
  }
  
  // Handle rem values
  if (str.endsWith('rem')) {
    return parseFloat(str) * 16;
  }
  
  // Handle percentages (return 0 for simplicity)
  if (str.endsWith('%')) {
    return 0;
  }
  
  // Try parsing as number
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse border value
 * @param {string} value - CSS border value
 * @returns {Object} - Parsed border object
 */
function parseBorder(value) {
  const result = { width: 0, style: 'none', color: 'transparent', radius: 0 };
  
  if (!value || value === 'none') return result;
  
  const parts = value.split(/\s+/);
  for (const part of parts) {
    if (part.endsWith('px') || /^\d+$/.test(part)) {
      result.width = parsePixelValue(part);
    } else if (['solid', 'dashed', 'dotted', 'double', 'none'].includes(part)) {
      result.style = part;
    } else {
      result.color = part;
    }
  }
  
  return result;
}

module.exports = {
  parseCSS,
  parseInlineStyle,
  camelCase,
  kebabCase,
  matchesSelector,
  collectStylesheets,
  getComputedStyles,
  getDefaultStyles,
  parseSpacing,
  parsePixelValue,
  parseBorder
};
