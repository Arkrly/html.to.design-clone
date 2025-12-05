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
    componentsBtn: document.getElementById('components-btn'),
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
    componentsGrid: document.getElementById('components-grid'),
    componentsSummary: document.getElementById('components-summary'),
    captureAllBtn: document.getElementById('capture-all-btn'),
    copyComponentsBtn: document.getElementById('copy-components-btn'),
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
  let currentComponents = null;
  let currentUrl = null;

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
    elements.componentsBtn.addEventListener('click', handleExtractComponents);
    elements.clearBtn.addEventListener('click', handleClear);
    
    elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => handleTabSwitch(tab.dataset.tab));
    });

    elements.expandAllBtn.addEventListener('click', () => toggleAllDetails(true));
    elements.collapseAllBtn.addEventListener('click', () => toggleAllDetails(false));
    elements.copyJsonBtn.addEventListener('click', handleCopyJson);
    elements.captureAllBtn.addEventListener('click', handleCaptureAllComponents);
    elements.copyComponentsBtn.addEventListener('click', handleCopyComponents);

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

  // Handle component extraction
  async function handleExtractComponents() {
    const url = elements.urlInput.value.trim();
    if (!url) {
      showToast('Please enter a URL', 'error');
      return;
    }

    currentUrl = url;
    showLoading('Extracting components...');
    updateStatus('Extracting...');

    try {
      const response = await fetch(`${API_BASE}/api/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (data.success) {
        currentComponents = data.components;
        displayComponents(data.components, data.summary);
        showToast(`Found ${data.summary.total} components`, 'success');
        updateStatus('Components extracted');
        handleTabSwitch('components');
      } else {
        throw new Error(data.error || 'Failed to extract components');
      }
    } catch (error) {
      showToast(error.message, 'error');
      updateStatus('Extraction failed');
    } finally {
      hideLoading();
    }
  }

  // Handle capture single component
  async function handleCaptureComponent(selector, index) {
    if (!currentUrl) {
      showToast('No URL available', 'error');
      return;
    }

    showLoading('Capturing component...');

    try {
      const response = await fetch(`${API_BASE}/api/components/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl, selector })
      });

      const data = await response.json();

      if (data.success) {
        // Update the component card with the screenshot
        const card = document.querySelector(`[data-component-index="${index}"]`);
        if (card) {
          let screenshotDiv = card.querySelector('.component-screenshot');
          if (!screenshotDiv) {
            screenshotDiv = document.createElement('div');
            screenshotDiv.className = 'component-screenshot';
            card.querySelector('.component-card-body').appendChild(screenshotDiv);
          }
          screenshotDiv.innerHTML = `<img src="${data.imagePath}" alt="Component Screenshot">`;
        }
        showToast('Component captured', 'success');
      } else {
        throw new Error(data.error || 'Failed to capture component');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      hideLoading();
    }
  }

  // Handle capture all components
  async function handleCaptureAllComponents() {
    if (!currentUrl || !currentComponents) {
      showToast('No components to capture', 'error');
      return;
    }

    showLoading('Capturing all components...');
    updateStatus('Capturing components...');

    try {
      const response = await fetch(`${API_BASE}/api/components/capture-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl })
      });

      const data = await response.json();

      if (data.success) {
        // Re-extract components to refresh the display with screenshots
        await handleExtractComponents();
        showToast(`Captured ${data.captured} components`, 'success');
        updateStatus('All components captured');
      } else {
        throw new Error(data.error || 'Failed to capture components');
      }
    } catch (error) {
      showToast(error.message, 'error');
      updateStatus('Capture failed');
    } finally {
      hideLoading();
    }
  }

  // Handle copy components JSON
  function handleCopyComponents() {
    if (!currentComponents) {
      showToast('No components to copy', 'error');
      return;
    }

    const json = JSON.stringify(currentComponents, null, 2);
    copyToClipboard(json);
    showToast('Components JSON copied', 'success');
  }

  // Display extracted components
  function displayComponents(components, summary) {
    // Update summary
    if (summary) {
      elements.componentsSummary.style.display = 'block';
      const typeStats = Object.entries(summary.byType || {})
        .map(([type, count]) => `<span class="stat"><span class="stat-value">${count}</span> ${type}s</span>`)
        .join('');
      elements.componentsSummary.innerHTML = `
        <div class="summary-stats">
          <span class="stat">Total: <span class="stat-value">${summary.total}</span></span>
          ${typeStats}
        </div>
      `;
    }

    // Update grid
    if (!components || components.length === 0) {
      elements.componentsGrid.innerHTML = '<div class="placeholder"><span>🧩</span><p>No components found</p></div>';
      return;
    }

    const componentIcons = {
      button: '🔘',
      link: '🔗',
      card: '🃏',
      navbar: '📍',
      form: '📋',
      input: '📝',
      image: '🖼️',
      list: '📃',
      table: '📊',
      modal: '🪟',
      dropdown: '📥',
      icon: '✨',
      heading: '📌',
      paragraph: '📄',
      footer: '📎',
      header: '🎯',
      sidebar: '📑',
      hero: '🦸',
      unknown: '❓'
    };

    const html = components.map((comp, index) => `
      <div class="component-card" data-component-index="${index}">
        <div class="component-card-header">
          <span class="component-type">
            <span class="component-type-icon">${componentIcons[comp.type] || '🧩'}</span>
            ${comp.type}
          </span>
        </div>
        <div class="component-card-body">
          <div class="component-info">
            <div class="component-info-row">
              <span class="component-info-label">Tag:</span>
              <span class="component-info-value">${comp.tagName}</span>
            </div>
            ${comp.text ? `
            <div class="component-info-row">
              <span class="component-info-label">Text:</span>
              <span class="component-info-value">${escapeHtml(comp.text.substring(0, 50))}${comp.text.length > 50 ? '...' : ''}</span>
            </div>` : ''}
            <div class="component-info-row">
              <span class="component-info-label">Size:</span>
              <span class="component-info-value">${Math.round(comp.bounds.width)}x${Math.round(comp.bounds.height)}</span>
            </div>
          </div>
          ${comp.classes && comp.classes.length > 0 ? `
          <div class="component-preview">.${comp.classes.slice(0, 3).join(' .')}</div>
          ` : ''}
        </div>
        <div class="component-card-footer">
          <button class="btn btn-small btn-secondary" onclick="captureComponent('${escapeSelector(comp.selector)}', ${index})">
            📷 Capture
          </button>
          <button class="btn btn-small btn-ghost" onclick="copyToClipboard('${escapeSelector(comp.selector)}')">
            📋 Selector
          </button>
        </div>
      </div>
    `).join('');

    elements.componentsGrid.innerHTML = html;
  }

  // Escape selector for use in JS strings
  function escapeSelector(selector) {
    return selector.replace(/'/g, "\\'").replace(/"/g, '\\"');
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
    elements.componentsGrid.innerHTML = '<div class="placeholder"><span>🧩</span><p>No components extracted yet</p></div>';
    elements.componentsSummary.style.display = 'none';
    currentDesignTree = null;
    currentComponents = null;
    currentUrl = null;
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
  window.captureComponent = handleCaptureComponent;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
