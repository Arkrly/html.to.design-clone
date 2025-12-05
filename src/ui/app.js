/**
 * app.js - Minimal UI JavaScript
 * No frameworks, vanilla JS only
 */

(function() {
  'use strict';

  // API Base URL
  const API_BASE = '';

  // DOM Elements
  const elements = {
    urlInput: document.getElementById('url-input'),
    htmlInput: document.getElementById('html-input'),
    widthInput: document.getElementById('width-input'),
    heightInput: document.getElementById('height-input'),
    fullpageCheckbox: document.getElementById('fullpage-checkbox'),
    fetchBtn: document.getElementById('fetch-btn'),
    screenshotBtn: document.getElementById('screenshot-btn'),
    convertBtn: document.getElementById('convert-btn'),
    clearBtn: document.getElementById('clear-btn'),
    tabs: document.querySelectorAll('.tab'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    screenshotImage: document.getElementById('screenshot-image'),
    screenshotPlaceholder: document.getElementById('screenshot-placeholder'),
    screenshotInfo: document.getElementById('screenshot-info'),
    screenshotDimensions: document.getElementById('screenshot-dimensions'),
    screenshotDownload: document.getElementById('screenshot-download'),
    designTree: document.getElementById('design-tree'),
    jsonContent: document.getElementById('json-content'),
    jsonOutput: document.getElementById('json-output'),
    colorPalette: document.getElementById('color-palette'),
    expandAllBtn: document.getElementById('expand-all-btn'),
    collapseAllBtn: document.getElementById('collapse-all-btn'),
    copyJsonBtn: document.getElementById('copy-json-btn'),
    statusText: document.getElementById('status-text'),
    statusTime: document.getElementById('status-time'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text')
  };

  // State
  let currentDesignTree = null;

  // Initialize
  function init() {
    bindEvents();
    updateStatus('Ready');
    updateTime();
    setInterval(updateTime, 1000);
  }

  // Bind event listeners
  function bindEvents() {
    elements.fetchBtn.addEventListener('click', handleFetch);
    elements.screenshotBtn.addEventListener('click', handleScreenshot);
    elements.convertBtn.addEventListener('click', handleConvert);
    elements.clearBtn.addEventListener('click', handleClear);
    
    elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => handleTabSwitch(tab.dataset.tab));
    });

    elements.expandAllBtn.addEventListener('click', () => toggleAllDetails(true));
    elements.collapseAllBtn.addEventListener('click', () => toggleAllDetails(false));
    elements.copyJsonBtn.addEventListener('click', handleCopyJson);

    // Enter key on URL input
    elements.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleFetch();
    });
  }

  // Handle fetch HTML from URL
  async function handleFetch() {
    const url = elements.urlInput.value.trim();
    if (!url) {
      showToast('Please enter a URL', 'error');
      return;
    }

    showLoading('Fetching HTML...');
    updateStatus('Fetching...');

    try {
      const response = await fetch(`${API_BASE}/api/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (data.success) {
        elements.htmlInput.value = data.html;
        showToast('HTML fetched successfully', 'success');
        updateStatus('HTML fetched');
      } else {
        throw new Error(data.error || 'Failed to fetch HTML');
      }
    } catch (error) {
      showToast(error.message, 'error');
      updateStatus('Fetch failed');
    } finally {
      hideLoading();
    }
  }

  // Handle screenshot capture
  async function handleScreenshot() {
    const url = elements.urlInput.value.trim();
    if (!url) {
      showToast('Please enter a URL', 'error');
      return;
    }

    const options = {
      url,
      width: parseInt(elements.widthInput.value) || 1200,
      height: parseInt(elements.heightInput.value) || 800,
      fullPage: elements.fullpageCheckbox.checked
    };

    showLoading('Capturing screenshot...');
    updateStatus('Capturing...');

    try {
      const response = await fetch(`${API_BASE}/api/screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });

      const data = await response.json();

      if (data.success) {
        displayScreenshot(data);
        showToast('Screenshot captured', 'success');
        updateStatus('Screenshot ready');
        handleTabSwitch('screenshot');
      } else {
        throw new Error(data.error || 'Failed to capture screenshot');
      }
    } catch (error) {
      showToast(error.message, 'error');
      updateStatus('Capture failed');
    } finally {
      hideLoading();
    }
  }

  // Handle HTML to design conversion
  async function handleConvert() {
    const html = elements.htmlInput.value.trim();
    const url = elements.urlInput.value.trim();

    if (!html && !url) {
      showToast('Please enter HTML or a URL', 'error');
      return;
    }

    const options = {
      html: html || undefined,
      url: !html ? url : undefined,
      viewport: {
        width: parseInt(elements.widthInput.value) || 1200,
        height: parseInt(elements.heightInput.value) || 800
      }
    };

    showLoading('Converting to design...');
    updateStatus('Converting...');

    try {
      const response = await fetch(`${API_BASE}/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });

      const data = await response.json();

      if (data.success) {
        currentDesignTree = data.designTree;
        displayDesignTree(data.designTree);
        displayColorPalette(data.colors || []);
        showToast('Conversion complete', 'success');
        updateStatus('Design tree ready');
        handleTabSwitch('design');
      } else {
        throw new Error(data.error || 'Failed to convert HTML');
      }
    } catch (error) {
      showToast(error.message, 'error');
      updateStatus('Conversion failed');
    } finally {
      hideLoading();
    }
  }

  // Handle clear
  function handleClear() {
    elements.urlInput.value = '';
    elements.htmlInput.value = '';
    elements.screenshotImage.style.display = 'none';
    elements.screenshotPlaceholder.style.display = 'flex';
    elements.screenshotInfo.style.display = 'none';
    elements.designTree.innerHTML = '<div class="placeholder"><span>🌳</span><p>No design tree generated yet</p></div>';
    elements.jsonOutput.style.display = 'none';
    elements.colorPalette.innerHTML = '<div class="placeholder"><span>🎨</span><p>No colors extracted yet</p></div>';
    currentDesignTree = null;
    updateStatus('Cleared');
    showToast('All cleared', 'success');
  }

  // Handle tab switch
  function handleTabSwitch(tabId) {
    elements.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    elements.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `${tabId}-tab`);
    });
  }

  // Display screenshot
  function displayScreenshot(data) {
    elements.screenshotImage.src = data.imagePath;
    elements.screenshotImage.style.display = 'block';
    elements.screenshotPlaceholder.style.display = 'none';
    elements.screenshotInfo.style.display = 'flex';
    elements.screenshotDimensions.textContent = 
      `${data.dimensions?.width || data.viewport?.width}x${data.dimensions?.height || data.viewport?.height}`;
    elements.screenshotDownload.href = data.imagePath;
  }

  // Display design tree
  function displayDesignTree(tree) {
    const treeHtml = renderTreeNode(tree);
    elements.designTree.innerHTML = treeHtml;
    elements.jsonContent.textContent = JSON.stringify(tree, null, 2);
    elements.jsonOutput.style.display = 'block';
  }

  // Render tree node recursively
  function renderTreeNode(node, depth = 0) {
    if (!node) return '';

    const hasChildren = node.children && node.children.length > 0;
    const indent = '  '.repeat(depth);
    
    let html = '<div class="tree-node">';
    
    if (hasChildren) {
      html += `<details ${depth < 2 ? 'open' : ''}>`;
      html += `<summary>`;
    }
    
    html += `<span class="node-type">${node.type}</span>`;
    html += ` <span class="node-name">${node.name}</span>`;
    
    if (node.text) {
      const truncatedText = node.text.length > 30 
        ? node.text.substring(0, 30) + '...' 
        : node.text;
      html += ` <span class="node-text">"${escapeHtml(truncatedText)}"</span>`;
    }
    
    html += ` <span class="node-layout">[${node.layout.x}, ${node.layout.y}, ${node.layout.w}x${node.layout.h}]</span>`;
    
    if (hasChildren) {
      html += `</summary>`;
      for (const child of node.children) {
        html += renderTreeNode(child, depth + 1);
      }
      html += `</details>`;
    }
    
    html += '</div>';
    
    return html;
  }

  // Display color palette
  function displayColorPalette(colors) {
    if (!colors || colors.length === 0) {
      elements.colorPalette.innerHTML = '<div class="placeholder"><span>🎨</span><p>No colors found</p></div>';
      return;
    }

    const html = colors.map(color => `
      <div class="color-swatch">
        <div class="color-box" style="background: ${color}" title="${color}" onclick="copyToClipboard('${color}')"></div>
        <span class="color-value">${color}</span>
      </div>
    `).join('');

    elements.colorPalette.innerHTML = html;
  }

  // Toggle all details elements
  function toggleAllDetails(open) {
    const details = elements.designTree.querySelectorAll('details');
    details.forEach(d => d.open = open);
  }

  // Handle copy JSON
  function handleCopyJson() {
    if (!currentDesignTree) {
      showToast('No design tree to copy', 'error');
      return;
    }

    const json = JSON.stringify(currentDesignTree, null, 2);
    copyToClipboard(json);
    showToast('JSON copied to clipboard', 'success');
  }

  // Copy to clipboard
  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied!', 'success');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  // Fallback copy method
  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Copied!', 'success');
  }

  // Show loading overlay
  function showLoading(text = 'Processing...') {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.style.display = 'flex';
  }

  // Hide loading overlay
  function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
  }

  // Show toast notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Update status
  function updateStatus(text) {
    elements.statusText.textContent = text;
  }

  // Update time
  function updateTime() {
    const now = new Date();
    elements.statusTime.textContent = now.toLocaleTimeString();
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Expose copyToClipboard globally for inline onclick
  window.copyToClipboard = copyToClipboard;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
