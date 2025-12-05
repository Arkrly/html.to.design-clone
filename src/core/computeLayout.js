/**
 * computeLayout.js - Lightweight Layout Engine
 * Computes layout positions using simplified box model
 */

const { parseSpacing, parsePixelValue, parseBorder } = require('./parseCSS');

/**
 * Default viewport dimensions
 */
const DEFAULT_VIEWPORT = {
  width: 1200,
  height: 800
};

/**
 * Approximate character widths for text measurement
 */
const CHAR_WIDTHS = {
  default: 8,
  narrow: 4,
  wide: 12
};

/**
 * Compute layout for design tree
 * @param {Array} elements - Array of elements with computed styles
 * @param {Object} viewport - Viewport dimensions
 * @returns {Array} - Elements with computed layout
 */
function computeLayout(elements, viewport = DEFAULT_VIEWPORT) {
  const layoutContext = {
    viewport,
    currentY: 0,
    parentStack: []
  };
  
  const layoutElements = [];
  
  for (const element of elements) {
    const layout = computeElementLayout(element, layoutContext);
    layoutElements.push({
      ...element,
      layout
    });
  }
  
  return layoutElements;
}

/**
 * Compute layout for a single element
 * @param {Object} element - Element with computed styles
 * @param {Object} context - Layout context
 * @returns {Object} - Layout object with x, y, w, h
 */
function computeElementLayout(element, context) {
  const styles = element.computedStyles || {};
  const { viewport } = context;
  
  // Parse dimensions
  const width = computeWidth(styles, viewport.width);
  const height = computeHeight(styles, element);
  
  // Parse spacing
  const margin = parseSpacing(styles.margin);
  const padding = parseSpacing(styles.padding);
  const border = parseBorder(styles.border || styles.borderWidth);
  
  // Compute position based on display type
  const display = styles.display || 'block';
  let x = margin.left;
  let y = context.currentY + margin.top;
  
  // Handle parent context
  if (context.parentStack.length > 0) {
    const parent = context.parentStack[context.parentStack.length - 1];
    x += parent.x + parent.paddingLeft;
    y = parent.currentY + margin.top;
  }
  
  // Compute content dimensions
  const contentWidth = width - padding.left - padding.right - (border.width * 2);
  const contentHeight = height - padding.top - padding.bottom - (border.width * 2);
  
  // Update context for next element
  if (display === 'block') {
    context.currentY = y + height + margin.bottom;
  }
  
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(width),
    h: Math.round(height),
    contentBox: {
      x: Math.round(x + padding.left + border.width),
      y: Math.round(y + padding.top + border.width),
      w: Math.round(contentWidth),
      h: Math.round(contentHeight)
    }
  };
}

/**
 * Compute width for element
 * @param {Object} styles - Computed styles
 * @param {number} parentWidth - Parent width
 * @returns {number} - Computed width
 */
function computeWidth(styles, parentWidth) {
  const width = styles.width;
  
  if (!width || width === 'auto') {
    // Block elements fill parent width
    if (styles.display === 'block' || !styles.display) {
      const margin = parseSpacing(styles.margin);
      return parentWidth - margin.left - margin.right;
    }
    // Inline elements get content width (estimate)
    return 100;
  }
  
  // Percentage width
  if (typeof width === 'string' && width.endsWith('%')) {
    return (parseFloat(width) / 100) * parentWidth;
  }
  
  return parsePixelValue(width);
}

/**
 * Compute height for element
 * @param {Object} styles - Computed styles
 * @param {Object} element - Element data
 * @returns {number} - Computed height
 */
function computeHeight(styles, element) {
  const height = styles.height;
  
  if (!height || height === 'auto') {
    // Estimate height based on content
    return estimateContentHeight(element, styles);
  }
  
  return parsePixelValue(height);
}

/**
 * Estimate content height based on text and children
 * @param {Object} element - Element data
 * @param {Object} styles - Computed styles
 * @returns {number} - Estimated height
 */
function estimateContentHeight(element, styles) {
  const padding = parseSpacing(styles.padding);
  const lineHeight = parsePixelValue(styles.lineHeight) || 
                     parsePixelValue(styles.fontSize) * 1.2 || 
                     19.2;
  
  let contentHeight = 0;
  
  // Text content
  if (element.textContent) {
    const lines = estimateTextLines(element.textContent, styles);
    contentHeight = lines * lineHeight;
  } else {
    // Minimum height for empty elements
    contentHeight = lineHeight;
  }
  
  return contentHeight + padding.top + padding.bottom;
}

/**
 * Estimate number of text lines
 * @param {string} text - Text content
 * @param {Object} styles - Computed styles
 * @returns {number} - Estimated line count
 */
function estimateTextLines(text, styles) {
  if (!text) return 1;
  
  const fontSize = parsePixelValue(styles.fontSize) || 16;
  const charWidth = fontSize * 0.5; // Approximate character width
  const containerWidth = parsePixelValue(styles.width) || 1000;
  
  const charsPerLine = Math.floor(containerWidth / charWidth);
  const textLength = text.length;
  
  return Math.max(1, Math.ceil(textLength / charsPerLine));
}

/**
 * Compute flex layout for container
 * @param {Object} container - Container element
 * @param {Array} children - Child elements
 * @returns {Array} - Children with computed flex layout
 */
function computeFlexLayout(container, children) {
  const styles = container.computedStyles || {};
  const containerLayout = container.layout;
  
  const flexDirection = styles.flexDirection || 'row';
  const justifyContent = styles.justifyContent || 'flex-start';
  const alignItems = styles.alignItems || 'stretch';
  const gap = parsePixelValue(styles.gap) || 0;
  
  const isRow = flexDirection === 'row' || flexDirection === 'row-reverse';
  const isReverse = flexDirection === 'row-reverse' || flexDirection === 'column-reverse';
  
  // Calculate available space
  const padding = parseSpacing(styles.padding);
  const availableWidth = containerLayout.w - padding.left - padding.right;
  const availableHeight = containerLayout.h - padding.top - padding.bottom;
  
  // Calculate total children size
  let totalChildSize = 0;
  for (const child of children) {
    totalChildSize += isRow ? child.layout.w : child.layout.h;
  }
  totalChildSize += gap * (children.length - 1);
  
  // Calculate starting position based on justify-content
  let currentPos = 0;
  const availableSpace = (isRow ? availableWidth : availableHeight) - totalChildSize;
  
  switch (justifyContent) {
    case 'center':
      currentPos = availableSpace / 2;
      break;
    case 'flex-end':
      currentPos = availableSpace;
      break;
    case 'space-between':
      // Gap will be distributed between items
      break;
    case 'space-around':
      currentPos = availableSpace / (children.length * 2);
      break;
    case 'space-evenly':
      currentPos = availableSpace / (children.length + 1);
      break;
  }
  
  // Position children
  const positionedChildren = [];
  const spaceBetween = justifyContent === 'space-between' && children.length > 1
    ? availableSpace / (children.length - 1)
    : 0;
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childLayout = { ...child.layout };
    
    if (isRow) {
      childLayout.x = containerLayout.x + padding.left + currentPos;
      childLayout.y = computeCrossAxisPosition(
        child, containerLayout, alignItems, padding, availableHeight, false
      );
      currentPos += childLayout.w + gap + spaceBetween;
    } else {
      childLayout.x = computeCrossAxisPosition(
        child, containerLayout, alignItems, padding, availableWidth, true
      );
      childLayout.y = containerLayout.y + padding.top + currentPos;
      currentPos += childLayout.h + gap + spaceBetween;
    }
    
    positionedChildren.push({
      ...child,
      layout: childLayout
    });
  }
  
  if (isReverse) {
    positionedChildren.reverse();
  }
  
  return positionedChildren;
}

/**
 * Compute cross-axis position for flex item
 */
function computeCrossAxisPosition(child, containerLayout, alignItems, padding, availableSize, isColumn) {
  const childSize = isColumn ? child.layout.w : child.layout.h;
  const containerStart = isColumn 
    ? containerLayout.x + padding.left 
    : containerLayout.y + padding.top;
  
  switch (alignItems) {
    case 'center':
      return containerStart + (availableSize - childSize) / 2;
    case 'flex-end':
      return containerStart + availableSize - childSize;
    case 'stretch':
    case 'flex-start':
    default:
      return containerStart;
  }
}

/**
 * Build hierarchical layout from flat elements
 * @param {Array} elements - Flat array of elements
 * @param {Object} viewport - Viewport dimensions
 * @returns {Object} - Root element with nested children
 */
function buildLayoutTree(elements, viewport = DEFAULT_VIEWPORT) {
  if (elements.length === 0) return null;
  
  // Create layout context
  const context = {
    viewport,
    currentY: 0,
    parentStack: []
  };
  
  // Build tree structure
  const root = {
    ...elements[0],
    layout: {
      x: 0,
      y: 0,
      w: viewport.width,
      h: viewport.height
    },
    children: []
  };
  
  let currentParent = root;
  let currentDepth = 0;
  let currentY = 0;
  
  for (let i = 1; i < elements.length; i++) {
    const element = elements[i];
    const styles = element.computedStyles || {};
    
    // Calculate element dimensions
    const width = computeWidth(styles, currentParent.layout.w);
    const height = computeHeight(styles, element);
    const margin = parseSpacing(styles.margin);
    
    const layout = {
      x: currentParent.layout.x + margin.left,
      y: currentY + margin.top,
      w: width,
      h: height
    };
    
    currentY = layout.y + layout.h + margin.bottom;
    
    const node = {
      ...element,
      layout,
      children: []
    };
    
    currentParent.children.push(node);
  }
  
  return root;
}

module.exports = {
  computeLayout,
  computeElementLayout,
  computeWidth,
  computeHeight,
  estimateContentHeight,
  estimateTextLines,
  computeFlexLayout,
  buildLayoutTree,
  DEFAULT_VIEWPORT
};
